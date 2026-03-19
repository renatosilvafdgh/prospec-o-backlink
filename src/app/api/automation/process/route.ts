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

        for (const campanha of (campanhas || [])) {
            // 3. Obter tokens do usuário dono da campanha
            const { data: tokens, error: tokenError } = await supabase
                .from('users_tokens')
                .select('*')
                .eq('user_id', campanha.user_id)
                .single();

            if (tokenError || !tokens) {
                console.log(`[Automação] User ${campanha.user_id} sem tokens Gmail ou erro: ${tokenError?.message}. Pulando.`);
                continue;
            }

            // 4. Calcular limite de hoje para esta campanha (Fuso Horário Brasília - BRT)
            const now = new Date();
            const brtDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            brtDate.setHours(0, 0, 0, 0);
            const inicioDiaBRT = brtDate.toISOString();

            const { data: logsHoje } = await supabase
                .from('email_logs')
                .select('id')
                .eq('campanha_id', campanha.id)
                .eq('status_envio', 'sucesso')
                .gte('data_envio', inicioDiaBRT);

            const jaEnviadosHoje = logsHoje?.length || 0;
            const limiteRestante = Math.max(0, campanha.emails_por_dia - jaEnviadosHoje);

            console.log(`-> [Campanha ${campanha.id}] Meta: ${campanha.emails_por_dia}. Enviados hoje (desde ${inicioDiaBRT}): ${jaEnviadosHoje}. Restante: ${limiteRestante}`);

            if (limiteRestante <= 0) {
                console.log(`-> [Limite] Meta atingida para a campanha ${campanha.id}.`);
                continue;
            }

            // 5. Buscar sites para FOLLOW-UP primeiro
            const { data: sitesFollowup } = await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'contatado')
                .eq('campanha_id', campanha.id)
                .lte('proximo_followup', now.toISOString())
                .limit(limiteRestante);

            // 6. Buscar sites para CONTATO INICIAL
            const limitLeads = Math.max(0, limiteRestante - (sitesFollowup?.length || 0));
            const { data: sitesLead } = limitLeads > 0 ? await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'lead')
                .eq('campanha_id', campanha.id)
                .limit(limitLeads) : { data: [] };

            const allSites = [
                ...(sitesFollowup || []).map(s => ({ ...s, isFollowup: true })),
                ...(sitesLead || []).map(s => ({ ...s, isFollowup: false }))
            ];

            if (allSites.length === 0) {
                console.log(`-> [Fila] Sem sites pendentes para a campanha ${campanha.id}`);
                continue;
            }

            // 6.5 Verificar intervalo (Apenas se Intervalo Humano estiver ON)
            if (campanha.usar_intervalo_humano) {
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
                    const intervaloRec = Math.floor(Math.random() * (600 - 180 + 1) + 180);
                    if (tempoPassadoS < intervaloRec) {
                        console.log(`-> [Humanizado] Aguardando intervalo de seg ${intervaloRec}s.`);
                        continue; 
                    }
                }
            }

            // 6.7 Blocklist
            const { data: blocklist } = await supabase
                .from('global_blocklist')
                .select('email')
                .eq('user_id', campanha.user_id);
            const blockedEmails = new Set((blocklist || []).map(b => b.email.toLowerCase().trim()));

            // 7. LOTE (Batch)
            const batchSize = campanha.usar_intervalo_humano ? 1 : 5;
            const sitesToProcess = allSites.slice(0, batchSize);

            for (const site of sitesToProcess) {
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

                    if (!template || !site.email) {
                        console.log(`[Pulo] Site ${site.url} ignorado.`);
                        continue;
                    }

                    if (blockedEmails.has(site.email.toLowerCase().trim())) {
                        await supabase.from('sites').update({ status_contato: 'invalid', ultimo_contato: new Date().toISOString() }).eq('id', site.id);
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

                    if (logError || !logData) throw new Error(logError?.message);

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
                    } else {
                        proximoStatus = 'em_aguardo';
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
                    console.log(`✅ [Sucesso] E-mail para ${site.url}`);

                    if (sitesToProcess.length > 1) {
                        await new Promise(r => setTimeout(r, 1500));
                    }
                } catch (err: any) {
                    console.error(`❌ [Erro] ${site.url}:`, err);
                    await supabase.from('sites').update({ status_contato: 'erro_envio', ultimo_contato: new Date().toISOString() }).eq('id', site.id);
                    await supabase.from('email_logs').insert({ 
                        user_id: campanha.user_id, 
                        campanha_id: campanha.id, 
                        site_id: site.id, 
                        status_envio: 'erro: ' + err.message, 
                        tipo: site.isFollowup ? 'followup' : 'primeiro_contato' 
                    });
                }
            }
        }

        return NextResponse.json({ success: true, totalProcessed });

    } catch (error: any) {
        console.error('Erro na automação:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
