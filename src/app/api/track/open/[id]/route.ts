import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const logId = params.id;
    const supabase = createAdminClient();

    try {
        // Incrementar contagem de aberturas
        const { data: log } = await supabase
            .from('email_logs')
            .select('aberturas, primeira_abertura')
            .eq('id', logId)
            .single();

        if (log) {
            const updates: any = {
                aberturas: (log.aberturas || 0) + 1,
                ultima_abertura: new Date().toISOString(),
            };

            if (!log.primeira_abertura) {
                updates.primeira_abertura = new Date().toISOString();
            }

            await supabase
                .from('email_logs')
                .update(updates)
                .eq('id', logId);
        }
    } catch (error) {
        console.error('Erro ao rastrear abertura:', error);
    }

    // Retornar um pixel transparente 1x1
    const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
