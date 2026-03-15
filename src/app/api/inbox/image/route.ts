import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGmailClient } from '@/utils/google/gmail';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');
        const cid = searchParams.get('cid');

        if (!messageId || !cid) {
            return new NextResponse('Parâmetros ausentes', { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Não autorizado', { status: 401 });
        }

        const { data: tokens } = await supabase
            .from('users_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokens) {
            return new NextResponse('Tokens não encontrados', { status: 404 });
        }

        const gmail = getGmailClient(tokens.access_token, tokens.refresh_token);

        // 1. Buscar a mensagem específica
        const message = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });

        // 2. Função recursiva para encontrar a parte com o CID correspondente
        function findCidPart(parts: any[]): any {
            for (const part of parts) {
                const headers = part.headers || [];
                const cidHeader = headers.find((h: any) => h.name?.toLowerCase() === 'content-id');
                const altCidHeader = headers.find((h: any) => h.name?.toLowerCase() === 'x-attachment-id');
                
                const cidValue = (cidHeader?.value || altCidHeader?.value || '').replace(/[<>]/g, '').trim().toLowerCase();
                const targetCid = cid!.toLowerCase();

                // Verificação exata ou parcial (comum para cids com sufixos)
                if ((cidValue === targetCid || cidValue.startsWith(targetCid) || targetCid.startsWith(cidValue)) && part.body?.data) {
                    return part;
                }

                if (part.parts) {
                    const found = findCidPart(part.parts);
                    if (found) return found;
                }
            }
            return null;
        }

        const part = findCidPart(message.data.payload?.parts || []);

        if (!part) {
            // Caso especial: pode estar no anexo direto se não tiver partes
            if (message.data.payload?.body?.data) {
                // Se o corpo principal estiver aqui e não houver partes, provavelmente não é o que buscamos
            }
            return new NextResponse('Imagem não encontrada', { status: 404 });
        }

        // 3. Decodificar e retornar o binário
        let base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(base64Data, 'base64');
        const mimeType = part.mimeType || 'image/png';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache de 1 ano para imagens imutáveis do Gmail
                'Content-Length': buffer.length.toString()
            }
        });

    } catch (error: any) {
        console.error('Erro no proxy de imagem:', error);
        return new NextResponse('Erro interno', { status: 500 });
    }
}
