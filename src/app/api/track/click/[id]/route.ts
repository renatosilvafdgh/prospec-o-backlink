import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: logId } = await params;
    const { searchParams } = new URL(request.url);
    const encodedUrl = searchParams.get('u');
    const supabase = createAdminClient();

    let destination = '/';
    if (encodedUrl) {
        try {
            destination = Buffer.from(encodedUrl, 'base64').toString('utf-8');
        } catch (e) {
            console.error('Erro ao decodificar URL de destino:', e);
        }
    }

    try {
        // Incrementar contagem de cliques
        const { data: log } = await supabase
            .from('email_logs')
            .select('cliques')
            .eq('id', logId)
            .single();

        if (log) {
            await supabase
                .from('email_logs')
                .update({
                    cliques: (log.cliques || 0) + 1,
                    ultimo_clique: new Date().toISOString(),
                })
                .eq('id', logId);
        }
    } catch (error) {
        console.error('Erro ao rastrear clique:', error);
    }

    // Redirecionar para o destino original
    return NextResponse.redirect(destination);
}
