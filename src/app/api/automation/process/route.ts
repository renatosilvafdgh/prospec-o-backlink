import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/google/gmail';
import { injectTracking } from '@/utils/track';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
            // Usamos a mesma instância 'supabase' que já é o admin client instanciado na linha 11
            const { data: tokens, error: tokenError } = await supabase
                .from('users_tokens')
                .select('*')
                .eq('user_id', campanha.user_id)
                .single();

            if (tokenError) {
                console.error(`Erro ao buscar tokens do user_id ${campanha.user_id}:`, tokenError.message);
            }

            if (!tokens) {
                await supabase.from('email_logs').insert({ user_id: campanha.user_id, campanha_id: campanha.id, status_envio: 'debug_sem_token', tipo: 'primeiro_contato' });
                continue;
            }

            // 4. Calcular limite de hoje para esta campanha
            const { data: logsHoje } = await supabase
                .from('email_logs')
                .select('id')
                .eq('campanha_id', campanha.id)
                .neq('status_envio', 'debug_sem_token')
                .neq('status_envio', 'debug_limite_zero')
                .neq('status_envio', 'debug_sem_template')
                .gte('data_envio', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());


            const jaEnviadosHoje = logsHoje?.length || 0;
            const limiteRestante = Math.max(0, campanha.emails_por_dia - jaEnviadosHoje);

            console.log(`-> Limite da campanha: ${campanha.emails_por_dia}. Enviados hoje: ${jaEnviadosHoje}. Restante: ${limiteRestante}`);

            if (limiteRestante <= 0) {
                await supabase.from('email_logs').insert({ user_id: campanha.user_id, campanha_id: campanha.id, status_envio: 'debug_limite_zero', tipo: 'primeiro_contato' });
                continue;
            }

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

            console.log(`-> Sites prontos para processamento (Leads: ${sitesLead?.length || 0}, Followup: ${sitesFollowup?.length || 0})`);

            // 7. Processar Sites
            for (const site of allSites) {
                try {
                    const cleanUrl = site.url.replace(/https?:\/\//, '').split('/')[0];
                    const placeholders = {
                        '{site}': cleanUrl,
                        '{url}': site.url,
                        '{nome}': cleanUrl.split('.')[0]
                    };

                    let template = null;
                    if (site.isFollowup) {
                        const seq = campanha.sequencia_followup || [];
                        const step = seq[site.followup_index];

                        // Buscar o template completo da sequência
                        if (step && step.template_id) {
                            const { data: tData } = await supabase.from('email_templates').select('*').eq('id', step.template_id).single();
                            template = tData;
                        } else if (campanha.template_followup) {
                            // Fallback para template legados se a sequência estiver vazia ou inválida
                            template = campanha.template_followup;
                        }
                    } else {
                        template = campanha.template_inicial;
                    }

                    if (!template) {
                        await supabase.from('email_logs').insert({ user_id: campanha.user_id, campanha_id: campanha.id, site_id: site.id, status_envio: 'debug_sem_template', tipo: 'primeiro_contato' });
                        continue;
                    }

                    if (!site.email) {
                        await supabase.from('email_logs').insert({ user_id: campanha.user_id, campanha_id: campanha.id, site_id: site.id, status_envio: 'debug_sem_email', tipo: 'primeiro_contato' });
                        continue;
                    }

                    let subject = template.assunto;
                    let body = template.corpo_email;

                    Object.entries(placeholders).forEach(([key, val]) => {
                        subject = subject.replace(new RegExp(key, 'g'), val);
                        body = body.replace(new RegExp(key, 'g'), val);
                    });

                    // 1. Criar o log primeiro para obter o ID de rastreamento
                    const { data: logData, error: logError } = await supabase.from('email_logs').insert({
                        user_id: campanha.user_id,
                        site_id: site.id,
                        campanha_id: campanha.id,
                        status_envio: 'pendente',
                        tipo: site.isFollowup ? `followup_${site.followup_index + 1}` : 'primeiro_contato'
                    }).select().single();

                    if (logError || !logData) {
                        throw new Error(`Erro ao criar log: ${logError?.message}`);
                    }

                    // 2. Injetar rastreamento no corpo
                    const trackedBody = injectTracking(body, logData.id);

                    const resEmail = await sendEmail({
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        to: site.email,
                        subject,
                        body: trackedBody
                    });

                    const threadId = resEmail.data.threadId;

                    // Lógica de Próximo Passo
                    const sequencia = campanha.sequencia_followup || [];
                    const proximoIndex = site.isFollowup ? (site.followup_index + 1) : 0;
                    const temMaisFollowups = proximoIndex < sequencia.length;

                    let proximoStatus = 'contatado';
                    let dataProximoFollowup = null;

                    if (temMaisFollowups) {
                        const proximoPasso = sequencia[proximoIndex];
                        dataProximoFollowup = new Date(Date.now() + 86400000 * proximoPasso.dias).toISOString();
                        proximoStatus = 'contatado';
                    } else {
                        proximoStatus = 'em_aguardo'; // Fim da linha para follow-ups automáticos
                        dataProximoFollowup = null;
                    }

                    // 3. Atualizar o log para sucesso
                    await supabase.from('email_logs').update({
                        status_envio: 'sucesso'
                    }).eq('id', logData.id);

                    await supabase.from('sites').update({
                        status_contato: proximoStatus,
                        ultimo_contato: new Date().toISOString(),
                        thread_id: threadId,
                        followup_index: site.isFollowup ? proximoIndex : 0,
                        proximo_followup: dataProximoFollowup
                    }).eq('id', site.id);

                    totalProcessed++;

                    // Aguardar o intervalo configurado antes do próximo envio
                    if (campanha.usar_intervalo_humano) {
                        const min = 180; // 3 min
                        const max = 720; // 12 min
                        const randomSleep = Math.floor(Math.random() * (max - min + 1)) + min;
                        console.log(`[Automação] Modo Humano: Aguardando ${randomSleep}s (intervalo 3-12 min) antes do próximo envio...`);
                        await sleep(randomSleep * 1000);
                    } else if (campanha.intervalo_envio_segundos > 0) {
                        console.log(`[Automação] Aguardando ${campanha.intervalo_envio_segundos}s antes do próximo envio...`);
                        await sleep(campanha.intervalo_envio_segundos * 1000);
                    }
                } catch (err: any) {
                    console.error(`Erro ao processar site ${site.url}:`, err);
                    await supabase.from('email_logs').insert({ user_id: campanha.user_id, campanha_id: campanha.id, site_id: site.id, status_envio: 'debug_sendemail_throw: ' + err.message, tipo: 'primeiro_contato' });
                }
            }
        }

        return NextResponse.json({ success: true, totalProcessed });

    } catch (error: any) {
        console.error('Erro na automação:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
