import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/google/gmail';
import { injectTracking } from '@/utils/track';


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    const supabase = createAdminClient();

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
        const { data: campanhas, error: campError } = await supabase
            .from('campanhas')
            .select(`
                *,
                template_inicial:email_templates!campanhas_template_inicial_fkey(*),
                template_followup:email_templates!campanhas_template_followup_fkey(*)
            `)
            .eq('ativa', true);

        if (campError) throw campError;

        console.log(`[Automação] Iniciando processamento de ${campanhas?.length || 0} campanhas.`);

        let totalProcessed = 0;
        const results: any[] = [];

        for (const campanha of (campanhas || [])) {
            let logDetails = {
                id: campanha.id,
                nome: campanha.nome_campanha,
                meta: campanha.emails_por_dia,
                enviados_hoje: 0,
                status: 'pendente',
                motivo: '',
                processados: 0
            };

            const { data: tokens, error: tokenError } = await supabase
                .from('users_tokens')
                .select('*')
                .eq('user_id', campanha.user_id)
                .single();

            if (tokenError || !tokens) {
                logDetails.status = 'pulo';
                logDetails.motivo = 'Sem tokens Gmail';
                results.push(logDetails);
                continue;
            }

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
            logDetails.enviados_hoje = jaEnviadosHoje;

            if (limiteRestante <= 0) {
                logDetails.status = 'limite_atingido';
                logDetails.motivo = `Meta diária de ${campanha.emails_por_dia} alcançada`;
                results.push(logDetails);
                continue;
            }

            const { data: sitesFollowup } = await supabase
                .from('sites')
                .select('*')
                .eq('status_contato', 'contatado')
                .eq('campanha_id', campanha.id)
                .lte('proximo_followup', now.toISOString())
                .limit(limiteRestante);

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
                logDetails.status = 'sem_sites';
                logDetails.motivo = 'Nenhum lead ou followup pendente';
                results.push(logDetails);
                continue;
            }

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
                    const minIntervalo = 180; // 3 min
                    if (tempoPassadoS < minIntervalo) {
                        logDetails.status = 'aguardando_intervalo';
                        logDetails.motivo = `Intervalo humano (passaram ${Math.floor(tempoPassadoS)}s)`;
                        results.push(logDetails);
                        continue; 
                    }
                }
            }

            const { data: blocklist } = await supabase.from('global_blocklist').select('email').eq('user_id', campanha.user_id);
            const blockedEmails = new Set((blocklist || []).map(b => b.email.toLowerCase().trim()));

            const batchSize = campanha.usar_intervalo_humano ? 1 : 5;
            const sitesToProcess = allSites.slice(0, batchSize);

            for (const site of sitesToProcess) {
                try {
                    const cleanUrl = site.url.replace(/https?:\/\//, '').split('/')[0];
                    const placeholders = { '{site}': cleanUrl, '{url}': site.url, '{nome}': cleanUrl.split('.')[0] };

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

                    if (!template || !site.email) continue;
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
                    logDetails.processados++;
                    if (sitesToProcess.length > 1) await new Promise(r => setTimeout(r, 1500));
                } catch (err: any) {
                    console.error(`❌ [Erro] ${site.url}:`, err);
                    await supabase.from('sites').update({ status_contato: 'erro_envio', ultimo_contato: new Date().toISOString() }).eq('id', site.id);
                }
            }
            logDetails.status = 'sucesso';
            results.push(logDetails);
        }

        return NextResponse.json({ success: true, totalProcessed, details: results });

    } catch (error: any) {
        console.error('Erro na automação:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
