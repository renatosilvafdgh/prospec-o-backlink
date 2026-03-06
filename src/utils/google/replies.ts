import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

export async function checkNewReplies(userId: string) {
    const supabase = await createClient();
    const result = {
        messagesChecked: 0,
        matchesFound: 0,
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
    // 'newer_than:2d' é mais confiável que 'after:TIMESTAMP' em alguns casos
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
            const fromHeader = headers?.find(h => h.name?.toLowerCase() === 'from')?.value;
            const subjectHeader = headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || '(Sem Assunto)';
            const labels = detail.data.labelIds?.join(',') || 'NONE';

            // Extração robusta do e-mail
            const emailMatch = fromHeader?.match(/<(.+?)>|(\S+@\S+)/);
            const senderEmail = (emailMatch?.[1] || emailMatch?.[2] || fromHeader || '').toLowerCase().trim();

            if (senderEmail) {
                // IGNORAR SE FOR EU MESMO ENVIANDO
                if (senderEmail === tokens.google_email.toLowerCase().trim()) {
                    continue;
                }

                const info = `${senderEmail} | Label: ${labels} | Subj: ${subjectHeader.substring(0, 20)}...`;
                if (!result.emailsSeen.includes(info)) {
                    result.emailsSeen.push(info);
                }
            }

            if (senderEmail) {
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
            }
        } catch (msgError) {
            console.error(`Erro ao processar mensagem individual:`, msgError);
        }
    }
    return result;
}
