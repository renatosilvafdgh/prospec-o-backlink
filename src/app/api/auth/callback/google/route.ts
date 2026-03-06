import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const supabase = await createClient();

        console.log('Tokens recebidos do Google:', {
            hasAccessToken: !!tokens.access_token,
            hasIdToken: !!tokens.id_token,
            hasRefreshToken: !!tokens.refresh_token
        });

        if (!tokens.id_token) {
            return NextResponse.json({ error: 'ID Token do Google não recebido' }, { status: 400 });
        }

        // 2. Autenticar no Supabase usando o ID Token do Google
        const { data: { user }, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: tokens.id_token,
        });

        if (authError || !user) {
            console.error('ERRO DETALHADO SUPABASE AUTH:', authError);
            return NextResponse.json({
                error: 'Falha ao sincronizar com Supabase',
                message: authError?.message,
                details: authError
            }, { status: 401 });
        }

        // Obter infos extras do token (como email)
        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleEmail = payload?.email;

        if (!googleEmail) {
            return NextResponse.json({ error: 'Could not get Google email' }, { status: 400 });
        }

        // 3. Preparar dados para salvar (Preservar refresh_token se vier nulo)
        const tokenData: any = {
            user_id: user.id,
            google_email: googleEmail,
            access_token: tokens.access_token,
            expires_at: new Date(tokens.expiry_date!).toISOString(),
        };

        if (tokens.refresh_token) {
            tokenData.refresh_token = tokens.refresh_token;
        }

        // Salvar ou atualizar tokens no banco
        const { error: dbError } = await supabase
            .from('users_tokens')
            .upsert(tokenData, { onConflict: 'user_id' });

        if (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({
                error: 'Falha ao salvar tokens',
                details: dbError,
                hint: 'Execute o comando SQL de UNIQUE no user_id no painel do Supabase'
            }, { status: 500 });
        }

        // Usar APP_URL (runtime) para garantir URL correta em produção
        const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        return NextResponse.redirect(new URL('/dashboard', appUrl));
    } catch (error) {
        console.error('OAuth Error:', error);
        return NextResponse.json({ error: 'OAuth failed' }, { status: 500 });
    }
}
