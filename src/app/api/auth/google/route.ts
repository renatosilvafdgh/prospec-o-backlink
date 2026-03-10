import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/utils/google/gmail';

export async function GET(request: Request) {
    try {
        // Hostinger usa reverse proxy - priorizar x-forwarded-host
        const forwardedHost = request.headers.get('x-forwarded-host');
        const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

        // Se houver forwardedHost, construir URL base com ele, caso contrário usar URL da requisição
        const origin = forwardedHost
            ? `${forwardedProto}://${forwardedHost}`
            : new URL(request.url).origin;

        const redirectUri = `${origin}/api/auth/callback/google`;

        const authUrl = getAuthUrl(redirectUri);
        console.log('Redirecionando para Google Auth:', authUrl);
        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Erro na rota /api/auth/google:', error);
        return NextResponse.json({ error: 'Erro ao iniciar autenticação', details: error instanceof Error ? error.message : error }, { status: 500 });
    }
}
