import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function checkNewReplies(userId: string) {
    const supabase = createAdminClient(); // Usar admin para garantir escrita em tabelas globais
    const result = {
        messagesChecked: 0,
        matchesFound: 0,
        bouncesDetected: 0,
        emailsSeen: [] as string[],
        registeredEmails: [] as string[]
    };

    // 0. Pegar e-mails registrados para diagnóstico
    const { data: allSites } = await supabase
        .from('sites')
        .select('email')
        .eq('user_id', userId);

    result.registeredEmails = Array.from(new Set((allSites || [])
        .map(s => s.email?.toLowerCase().trim())
        .filter(Boolean)));

    // 1. Obter tokens
    const { data: tokens } = await supabase
        .from('users_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!tokens) return result;

    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth });

    // 2. Buscar mensagens recentes
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: `newer_than:2d`,
        maxResults: 50
    });

    const messages = response.data.messages || [];
    result.messagesChecked = messages.length;

    for (const msg of messages) {
        try {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
            });

            const headers = detail.data.payload?.headers;
            const fromHeader = headers?.find(h => h.name?.toLowerCase() === 'from')?.value || '';
            const subjectHeader = headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || '(Sem Assunto)';
            const labels = detail.data.labelIds?.join(',') || 'NONE';

            // Extração robusta do e-mail do remetente
            const emailMatch = fromHeader.match(/<(.+?)>|(\S+@\S+)/);
            const senderEmail = (emailMatch?.[1] || emailMatch?.[2] || fromHeader || '').toLowerCase().trim();

            if (!senderEmail || senderEmail === tokens.google_email.toLowerCase().trim()) {
                continue;
            }

            // O info será adicionado apenas se não for bounce (ver abaixo)

            // --- LÓGICA DE DETECÇÃO DE BOUNCE ---
            const isBounceSender = [
                'mailer-daemon',
                'postmaster',
                'delivery failure',
                'undeliverable'
            ].some(term => senderEmail.includes(term) || fromHeader.toLowerCase().includes(term));

            const isBounceSubject = [
                'delivery failure',
                'undeliverable',
                'returned to sender',
                'delivery status notification',
                'failure notice',
                'non distribué'
            ].some(term => subjectHeader.toLowerCase().includes(term));

            // Se for um bounce, precisamos encontrar qual e-mail falhou (está no corpo da mensagem)
            if (isBounceSender || isBounceSubject) {
                console.log(`⚠️ Possível bounce detectado: ${subjectHeader} (De: ${senderEmail})`);
                
                // Buscar e-mail do destinatário original no corpo ou headers (X-Failed-Recipients)
                const failedRecipientHeader = headers?.find(h => h.name?.toLowerCase() === 'x-failed-recipients')?.value;
                let targetEmail = failedRecipientHeader?.toLowerCase().trim();

                if (!targetEmail) {
                    // Tentar encontrar e-mail no corpo da mensagem (snippet ou payload)
                    const body = detail.data.snippet || '';
                    const bodyMatch = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    targetEmail = bodyMatch?.[0]?.toLowerCase().trim();
                }

                if (targetEmail) {
                    // ... (lógica de site existente) ...
                    const { data: site } = await supabase
                        .from('sites')
                        .select('id, campanha_id, url')
                        .eq('email', targetEmail)
                        .eq('user_id', userId)
                        .maybeSingle();

                    if (site) {
                        console.log(`🚫 Bounce confirmado para: ${targetEmail} (Site: ${site.url})`);
                        result.bouncesDetected++;

                        await supabase.from('invalid_emails').insert({
                            user_id: userId,
                            campanha_id: site.campanha_id,
                            site_id: site.id,
                            email: targetEmail,
                            tipo_erro: isBounceSubject ? 'hard_bounce' : 'server_error',
                            motivo: subjectHeader
                        });

                        await supabase.from('global_blocklist').upsert({
                            user_id: userId,
                            email: targetEmail,
                            motivo: `Bounce: ${subjectHeader}`
                        });

                        await supabase.from('sites').update({
                            status_contato: 'invalid',
                            ultimo_contato: new Date().toISOString()
                        }).eq('id', site.id);

                        await supabase.from('email_logs')
                            .update({ status_envio: 'bounce' })
                            .eq('site_id', site.id)
                            .eq('status_envio', 'sucesso')
                            .order('data_envio', { ascending: false })
                            .limit(1);
                    }
                }

                // MOVER MENSAGEM PARA A LIXEIRA (Limpeza automática para qualquer bounce detectado)
                await gmail.users.messages.trash({
                    userId: 'me',
                    id: msg.id!
                });
                console.log(`🗑️ Mensagem de bounce ${msg.id} movida para a lixeira.`);

                continue; // Importante: Bounces não são contados como "Reply" nem como "Seen" no resumo normal
            }

            // --- LÓGICA DE RESPOSTA NORMAL ---
            // Adicionar ao resumo de "vistos recentemente" apenas se não for bounce
            const info = `${senderEmail} | Label: ${labels} | Subj: ${subjectHeader.substring(0, 20)}...`;
            if (!result.emailsSeen.includes(info)) {
                result.emailsSeen.push(info);
            }
            // 3. Verificar se esse e-mail pertence a um site prospectado
            let { data: site } = await supabase
                .from('sites')
                .select('id, url, email, thread_id')
                .ilike('email', senderEmail)
                .eq('user_id', userId)
                .maybeSingle();

            // 3.1 Se não achou por e-mail, tentar por thread_id (respostas de e-mails alternativos)
            if (!site) {
                const { data: siteByThread } = await supabase
                    .from('sites')
                    .select('id, url, email, thread_id')
                    .eq('thread_id', detail.data.threadId)
                    .eq('user_id', userId)
                    .maybeSingle();

                if (siteByThread) {
                    site = siteByThread;
                    console.log(`🔗 Resposta por ThreadID vinculada: ${site.url} (De: ${senderEmail})`);
                }
            }

            if (site) {
                console.log(`✅ Resposta detectada: ${site.url} (${senderEmail})`);
                result.matchesFound++;

                // Atualizar site APENAS se fomos nós que recebemos uma mensagem
                await supabase.from('sites').update({
                    status_contato: 'respondeu',
                    thread_id: detail.data.threadId,
                    ultimo_contato: new Date().toISOString()
                }).eq('id', site.id);

                await supabase.from('email_logs').update({
                    respondeu: true,
                }).eq('site_id', site.id).eq('respondeu', false);
            }
        } catch (msgError) {
            console.error(`Erro ao processar mensagem individual:`, msgError);
        }
    }
    return result;
}
