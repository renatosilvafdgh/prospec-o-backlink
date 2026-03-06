import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/google/gmail';

export async function POST(request: Request) {
    try {
        const { siteId, templateId, customBody, customSubject } = await request.json();
        const supabase = await createClient();

        // 1. Verificar usuário logado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        // 2. Obter tokens do Google
        const { data: tokens, error: tokenError } = await supabase
            .from('users_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokens) return NextResponse.json({ error: 'Conta Google não conectada' }, { status: 400 });

        // 3. Obter dados do site
        const { data: site, error: siteError } = await supabase
            .from('sites')
            .select('*')
            .eq('id', siteId)
            .single();

        if (siteError || !site) return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });

        // 4. Preparar conteúdo do e-mail (Placeholders)
        let subject = customSubject;
        let body = customBody;

        if (!body || !subject) {
            const { data: template } = await supabase
                .from('email_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (!template) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });

            subject = template.assunto;
            body = template.corpo_email;
        }

        const cleanUrl = site.url.replace(/https?:\/\//, '').split('/')[0];
        const placeholders = {
            '{site}': cleanUrl,
            '{url}': site.url,
            '{nome}': cleanUrl.split('.')[0]
        };

        let finalSubject = subject;
        let finalBody = body;

        Object.entries(placeholders).forEach(([key, val]) => {
            finalSubject = finalSubject.replace(new RegExp(key, 'g'), val);
            finalBody = finalBody.replace(new RegExp(key, 'g'), val);
        });

        // 5. Enviar via utilitário
        const res = await sendEmail({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            to: site.email,
            subject: finalSubject,
            body: finalBody
        });

        // 6. Registrar Log
        await supabase.from('email_logs').insert({
            user_id: user.id,
            site_id: site.id,
            status_envio: 'sucesso',
            tipo: 'primeiro_contato',
        });

        // 7. Atualizar status do site (se for lead)
        if (site.status_contato === 'lead') {
            await supabase.from('sites').update({
                status_contato: 'contatado',
                ultimo_contato: new Date().toISOString(),
            }).eq('id', site.id);
        }

        return NextResponse.json({ success: true, messageId: res.data.id });

    } catch (error: any) {
        console.error('Erro ao enviar e-mail:', error);
        return NextResponse.json({ error: error.message || 'Falha no envio' }, { status: 500 });
    }
}
