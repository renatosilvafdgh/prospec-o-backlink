import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/google/gmail';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Usaremos o admin client para automações para ignorar RLS e ver dados de todos os usuários
    const supabase = createAdminClient();

    // 1. Validar Secret ou Autenticação de Usuário
    if (secret !== process.env.CRON_SECRET) {
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
    }

    try {
        // 2. Buscar todas as campanhas ativas
        const { data: campanhas, error: campError } = await supabase
            .from('campanhas')
            .select(`
                *,
                template_inicial:email_templates!campanhas_template_inicial_fkey(*),
                template_followup:email_templates!campanhas_template_followup_fkey(*)
            `)
            .eq('ativa', true);

        if (campError) throw campError;

        console.log(`[Automação] Iniciando processamento de ${campanhas?.length || 0} campanhas ativas.`);

        let totalProcessed = 0;
        const results = [];

        for (const campanha of (campanhas || [])) {
            // 3. Obter tokens do usuário dono da campanha
            const { data: tokens } = await supabase
                .from('users_tokens')
                .select('*')
                .eq('user_id', campanha.user_id)
                .single();

            if (!tokens) continue;

            // 4. Calcular limite de hoje para esta campanha
            const { data: logsHoje } = await supabase
                .from('email_logs')
                .select('id')
                .eq('campanha_id', campanha.id)
                .gte('data_envio', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

            const jaEnviadosHoje = logsHoje?.length || 0;
            const limiteRestante = Math.max(0, campanha.emails_por_dia - jaEnviadosHoje);

            if (limiteRestante <= 0) continue;

            // 5. Buscar sites para CONTATO INICIAL (status='lead')
            const { data: sitesLead } = await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'lead')
                .eq('campanha_id', campanha.id)
                .limit(limiteRestante);

            // 6. Buscar sites para FOLLOW-UP (status='contatado' e data expirada)
            const { data: sitesFollowup } = await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'contatado')
                .eq('campanha_id', campanha.id)
                .lte('proximo_followup', new Date().toISOString())
                .limit(limiteRestante - (sitesLead?.length || 0));

            const allSites = [
                ...(sitesLead || []).map(s => ({ ...s, isFollowup: false })),
                ...(sitesFollowup || []).map(s => ({ ...s, isFollowup: true }))
            ];

            // 7. Processar Sites
            for (const site of allSites) {
                try {
                    const cleanUrl = site.url.replace(/https?:\/\//, '').split('/')[0];
                    const placeholders = {
                        '{site}': cleanUrl,
                        '{url}': site.url,
                        '{nome}': cleanUrl.split('.')[0]
                    };

                    const template = site.isFollowup ? campanha.template_followup : campanha.template_inicial;

                    if (!template) continue;

                    let subject = template.assunto;
                    let body = template.corpo_email;

                    Object.entries(placeholders).forEach(([key, val]) => {
                        subject = subject.replace(new RegExp(key, 'g'), val);
                        body = body.replace(new RegExp(key, 'g'), val);
                    });

                    const resEmail = await sendEmail({
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        to: site.email,
                        subject,
                        body
                    });

                    const threadId = resEmail.data.threadId;

                    // Log e Update Site
                    await supabase.from('email_logs').insert({
                        user_id: campanha.user_id,
                        site_id: site.id,
                        campanha_id: campanha.id,
                        status_envio: 'sucesso',
                        tipo: site.isFollowup ? 'followup' : 'primeiro_contato'
                    });

                    // Se for primeiro contato, agendar follow-up. Se for follow-up, marcar como concluído o ciclo de follow-up
                    await supabase.from('sites').update({
                        status_contato: site.isFollowup ? 'em_aguardo' : 'contatado',
                        ultimo_contato: new Date().toISOString(),
                        thread_id: threadId, // Vincula à nova thread imediatamente
                        proximo_followup: site.isFollowup ? null : new Date(Date.now() + 86400000 * campanha.intervalo_followup_dias).toISOString()
                    }).eq('id', site.id);

                    totalProcessed++;
                } catch (err) {
                    console.error(`Erro ao processar site ${site.url}:`, err);
                }
            }
        }

        return NextResponse.json({ success: true, totalProcessed });

    } catch (error: any) {
        console.error('Erro na automação:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
