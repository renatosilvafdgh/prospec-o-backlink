import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGmailClient, getMessageBody, cleanMessageBody, resolveCidsToProxy } from '@/utils/google/gmail';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const threadId = searchParams.get('threadId');
        const siteId = searchParams.get('siteId');

        if (!threadId) {
            return NextResponse.json({ error: 'Thread ID é obrigatório' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // 1. Obter tokens do usuário
        const { data: tokens } = await supabase
            .from('users_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokens) {
            return NextResponse.json({ error: 'Tokens não encontrados' }, { status: 404 });
        }

        const gmail = getGmailClient(tokens.access_token, tokens.refresh_token);

        // 2. Buscar a Thread do Gmail
        const thread = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full'
        });

        const firstMessageSubject = thread.data.messages?.[0]?.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || '';

        const messages = thread.data.messages?.map(msg => {
            const headers = msg.payload?.headers;
            const from = headers?.find(h => h.name?.toLowerCase() === 'from')?.value || '';
            const date = headers?.find(h => h.name?.toLowerCase() === 'date')?.value || '';
            const messageId = headers?.find(h => h.name?.toLowerCase() === 'message-id')?.value || '';
            const subject = headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || '';

            const body = getMessageBody(msg.payload);
            const bodyWithImages = resolveCidsToProxy(body, msg.id!);
            const cleanBody = cleanMessageBody(bodyWithImages);

            // Limpar HTML se necessário (por enquanto manteremos para renderizar)
            return {
                id: msg.id,
                messageId,
                subject,
                from,
                date,
                body: cleanBody || body, // Fallback para body original se a limpeza for agressiva demais
                isMe: from.toLowerCase().includes(tokens.google_email.toLowerCase())
            };
        });

        return NextResponse.json({ messages, subject: firstMessageSubject });

    } catch (error: any) {
        console.error('Erro ao buscar thread:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
