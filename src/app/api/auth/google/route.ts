import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/utils/google/gmail';

export async function GET() {
    try {
        const authUrl = getAuthUrl();
        console.log('Redirecionando para Google Auth:', authUrl);
        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Erro na rota /api/auth/google:', error);
        return NextResponse.json({ error: 'Erro ao iniciar autenticação', details: error instanceof Error ? error.message : error }, { status: 500 });
    }
}
