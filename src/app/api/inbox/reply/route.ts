import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/google/gmail';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { siteId, body, lastMessageId, references, subject, threadId: manualThreadId } = await request.json();

        // 1. Obter detalhes do site
        const { data: site } = await supabase
            .from('sites')
            .select('*')
            .eq('id', siteId)
            .single();

        // 2. Obter tokens do usuário
        const { data: tokens } = await supabase
            .from('users_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!site || !tokens) {
            return NextResponse.json({ error: 'Dados do site ou tokens não encontrados' }, { status: 404 });
        }

        // Prepara o assunto para ser uma resposta válida (Re: ...)
        const finalSubject = subject
            ? (subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`)
            : `Re: Contato ${site.url}`;

        // 3. Enviar Resposta
        await sendEmail({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            to: site.email,
            subject: finalSubject,
            body,
            threadId: manualThreadId || site.thread_id,
            inReplyTo: lastMessageId,
            references: references ? `${references} ${lastMessageId}` : lastMessageId
        });

        // 3. Opcional: Registrar nos logs de e-mail (tipo 'resposta_manual')
        await supabase.from('email_logs').insert({
            user_id: user.id,
            site_id: site.id,
            status_envio: 'sucesso',
            tipo: 'resposta_manual'
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Erro ao enviar resposta:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
