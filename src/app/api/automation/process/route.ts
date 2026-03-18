import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/google/gmail';
import { injectTracking } from '@/utils/track';


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Usaremos o admin client para automações para ignorar RLS e ver dados de todos os usuários
    const supabase = createAdminClient();

    // 1. Validar Secret ou Autenticação de Usuário
    const isValidSecret = secret && process.env.CRON_SECRET && secret.trim() === process.env.CRON_SECRET.trim();

    if (!isValidSecret) {
        console.log('[Automação] Secret inválido ou ausente. Verificando sessão de usuário...');
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            console.error('[Automação] Acesso negado: Secret incorreto e nenhum usuário autenticado.');
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
                console.log(`[Automação] User ${campanha.user_id} sem tokens Gmail. Pulando.`);
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
                console.log(`-> Limite atingido para a campanha ${campanha.id}.`);
                continue;
            }

            // 5. Buscar sites para FOLLOW-UP primeiro (prioridade)
            const { data: sitesFollowup } = await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'contatado')
                .eq('campanha_id', campanha.id)
                .lte('proximo_followup', new Date().toISOString())
                .limit(limiteRestante);

            // 6. Buscar sites para CONTATO INICIAL (status='lead') com o que sobrar
            const { data: sitesLead } = await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'lead')
                .eq('campanha_id', campanha.id)
                .limit(limiteRestante - (sitesFollowup?.length || 0));

            const allSites = [
                ...(sitesFollowup || []).map(s => ({ ...s, isFollowup: true })),
                ...(sitesLead || []).map(s => ({ ...s, isFollowup: false }))
            ];

            console.log(`-> Sites prontos para processamento (Leads: ${sitesLead?.length || 0}, Followup: ${sitesFollowup?.length || 0})`);

            // 6.5 Verificar intervalo desde o último envio (Modo Humano ou Intervalo Fixo)
            // Se o intervalo humano estiver ativo, garantimos que passou entre 3 e 12 minutos
            const { data: ultimoEnvio } = await supabase
                .from('email_logs')
                .select('data_envio')
                .eq('campanha_id', campanha.id)
                .eq('status_envio', 'sucesso')
                .order('data_envio', { ascending: false })
                .limit(1)
                .single();

            if (ultimoEnvio) {
                const tempoPassadoS = (Date.now() - new Date(ultimoEnvio.data_envio).getTime()) / 1000;
                let intervaloNecessario = 0;

                if (campanha.usar_intervalo_humano) {
                    // Para modo humano, testamos contra um valor randômico entre 3 e 12 minutos (180s - 720s)
                    // Como o CRON roda periodicamente, isso criará uma distribuição natural e segura.
                    intervaloNecessario = Math.floor(Math.random() * (720 - 180 + 1) + 180);
                } else if (campanha.intervalo_envio_segundos > 0) {
                    intervaloNecessario = campanha.intervalo_envio_segundos;
                }

                if (tempoPassadoS < intervaloNecessario) {
                    console.log(`-> [Aguardando] Campanha ${campanha.id} em intervalo. Passaram ${Math.floor(tempoPassadoS)}s de min ${intervaloNecessario}s.`);
                    continue;
                }
            }

            // 6.7 Buscar blocklist global para carregar em memória
            const { data: blocklist } = await supabase
                .from('global_blocklist')
                .select('email')
                .eq('user_id', campanha.user_id);
            
            const blockedEmails = new Set((blocklist || []).map(b => b.email.toLowerCase().trim()));

            // 7. Processar APENAS UM site por campanha por execução (Segurança para Hostinger)
            // Isso evita processos longos ("sleeping") que travam o servidor.
            const site = allSites[0];

            if (!site) {
                console.log(`-> Nenhum site pendente para a campanha ${campanha.id}`);
                continue;
            }

            console.log(`-> Processando site ${site.url} para a campanha ${campanha.id}`);

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

                    if (step && step.template_id) {
                        const { data: tData } = await supabase.from('email_templates').select('*').eq('id', step.template_id).single();
                        template = tData;
                    } else if (campanha.template_followup) {
                        template = campanha.template_followup;
                    }
                } else {
                    template = campanha.template_inicial;
                }

                if (!template) {
                    console.log(`[Automação] Template não encontrado para campanha ${campanha.id}. Pulando site.`);
                    continue;
                }

                if (!site.email) {
                    console.log(`[Automação] Site ${site.url} sem e-mail. Pulando.`);
                    continue;
                }

                // --- VERIFICAÇÃO DE BLOCKLIST GLOBAL ---
                if (blockedEmails.has(site.email.toLowerCase().trim())) {
                    console.log(`🚫 Site ${site.url} ignorado: e-mail na blocklist.`);
                    await supabase.from('sites').update({
                        status_contato: 'invalid',
                        ultimo_contato: new Date().toISOString()
                    }).eq('id', site.id);
                    
                    await supabase.from('email_logs').insert({ 
                        user_id: campanha.user_id, 
                        campanha_id: campanha.id, 
                        site_id: site.id, 
                        status_envio: 'ignorado_blocklist', 
                        tipo: site.isFollowup ? 'followup' : 'primeiro_contato' 
                    });
                    continue;
                }

                let subject = template.assunto;
                let body = template.corpo_email;

                Object.entries(placeholders).forEach(([key, val]) => {
                    subject = subject.replace(new RegExp(key, 'g'), val);
                    body = body.replace(new RegExp(key, 'g'), val);
                });

                const { data: logData, error: logError } = await supabase.from('email_logs').insert({
                    user_id: campanha.user_id,
                    site_id: site.id,
                    campanha_id: campanha.id,
                    status_envio: 'pendente',
                    tipo: site.isFollowup ? `followup_${site.followup_index + 1}` : 'primeiro_contato'
                }).select().single();

                if (logError || !logData) throw new Error(`Erro log: ${logError?.message}`);

                const trackedBody = injectTracking(body, logData.id);

                const resEmail = await sendEmail({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    to: site.email,
                    subject,
                    body: trackedBody,
                    threadId: site.thread_id
                });

                const threadId = resEmail.data.threadId;

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
                    proximoStatus = 'em_aguardo';
                    dataProximoFollowup = null;
                }

                await supabase.from('email_logs').update({ status_envio: 'sucesso' }).eq('id', logData.id);

                await supabase.from('sites').update({
                    status_contato: proximoStatus,
                    ultimo_contato: new Date().toISOString(),
                    thread_id: threadId,
                    followup_index: site.isFollowup ? proximoIndex : 0,
                    proximo_followup: dataProximoFollowup
                }).eq('id', site.id);

                totalProcessed++;
                console.log(`[Automação] E-mail enviado com sucesso para ${site.url}`);
            } catch (err: any) {
                console.error(`Erro processar site ${site.url}:`, err);
                
                // IMPORTANTE: Se houver erro no envio, marcamos o site para não travar a fila
                // Caso contrário, o mesmo site "lead" será selecionado repetidamente no próximo CRON
                await supabase.from('sites').update({
                    status_contato: 'erro_envio',
                    ultimo_contato: new Date().toISOString(),
                    observacoes: (site.observacoes || '') + ` [Erro Automação: ${err.message}]`
                }).eq('id', site.id);

                await supabase.from('email_logs').insert({ 
                    user_id: campanha.user_id, 
                    campanha_id: campanha.id, 
                    site_id: site.id, 
                    status_envio: 'erro: ' + err.message, 
                    tipo: site.isFollowup ? 'followup' : 'primeiro_contato' 
                });
            }
        }

        return NextResponse.json({ success: true, totalProcessed });

    } catch (error: any) {
        console.error('Erro na automação:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
