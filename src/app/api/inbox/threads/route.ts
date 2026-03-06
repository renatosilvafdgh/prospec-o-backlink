import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGmailClient } from '@/utils/google/gmail';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { data: tokens } = await supabase
            .from('users_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokens) {
            return NextResponse.json({ error: 'Tokens não encontrados' }, { status: 404 });
        }

        const gmail = getGmailClient(tokens.access_token, tokens.refresh_token);

        // Buscar threads vinculadas ao e-mail (enviadas para ou recebidas de)
        const response = await gmail.users.threads.list({
            userId: 'me',
            q: `${email}`,
            maxResults: 10
        });

        const threads = [];
        for (const threadSummary of (response.data.threads || [])) {
            const threadDetail = await gmail.users.threads.get({
                userId: 'me',
                id: threadSummary.id!,
                format: 'metadata',
                metadataHeaders: ['Subject', 'Date', 'From']
            });

            const lastMessage = threadDetail.data.messages?.[threadDetail.data.messages.length - 1];
            const headers = lastMessage?.payload?.headers;
            const subject = headers?.find(h => h.name === 'Subject')?.value || '(Sem Assunto)';
            const date = headers?.find(h => h.name === 'Date')?.value || '';
            const from = headers?.find(h => h.name === 'From')?.value || '';

            threads.push({
                id: threadSummary.id,
                subject,
                date,
                from,
                snippet: threadSummary.snippet
            });
        }

        return NextResponse.json({ threads });

    } catch (error: any) {
        console.error('Erro ao listar threads:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
