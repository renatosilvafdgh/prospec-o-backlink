import { NextResponse } from 'next/server';

export async function GET() {
    const envVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REDIRECT_URI',
        'NEXT_PUBLIC_APP_URL'
    ];

    const status = envVars.reduce((acc, name) => {
        acc[name] = process.env[name] ? 'DEFINED (length: ' + process.env[name]?.length + ')' : 'MISSING';
        return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
        message: 'Diagnóstico de Variáveis de Ambiente',
        status,
        node_version: process.version,
        env: process.env.NODE_ENV
    });
}
