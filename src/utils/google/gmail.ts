import { google } from 'googleapis';

function getOAuth2Client(redirectUri?: string) {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri || process.env.GOOGLE_REDIRECT_URI
    );
}

export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
];

export function getAuthUrl(redirectUri?: string) {
    const client = getOAuth2Client(redirectUri);
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent',
    });
}

export async function getTokens(code: string, redirectUri?: string) {
    const client = getOAuth2Client(redirectUri);
    const { tokens } = await client.getToken(code);
    return tokens;
}

export function getGmailClient(accessToken: string, refreshToken?: string) {
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth: client });
}

export async function sendEmail({
    accessToken,
    refreshToken,
    to,
    subject,
    body,
    threadId,
    inReplyTo,
    references
}: {
    accessToken: string;
    refreshToken: string;
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
}) {
    const gmail = getGmailClient(accessToken, refreshToken);

    // Pegar e-mail do remetente para garantir o From e Reply-To corretos
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const userEmail = profile.data.emailAddress;

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Reply-To: ${userEmail}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
    ];

    if (inReplyTo) {
        messageParts.push(`In-Reply-To: ${inReplyTo.trim()}`);
    }
    if (references) {
        // Garantir que as referências sejam separadas por espaço
        const refs = references.split(/\s+/).map(r => r.trim()).join(' ');
        messageParts.push(`References: ${refs}`);
    }

    messageParts.push(''); // Linha em branco entre cabeçalhos e corpo
    messageParts.push(body.replace(/\n/g, '<br>'));

    // Padrão RFC 2822 exige \r\n para cabeçalhos
    const message = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
            threadId: threadId,
        },
    });
}

/**
 * Extrai o corpo de uma mensagem do Gmail de forma recursiva.
 * Tenta encontrar HTML primeiro, depois texto simples.
 */
export function getMessageBody(payload: any): string {
    if (!payload) return '';

    // Caso simples: corpo direto no payload
    if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Caso complexo: multipart
    if (payload.parts) {
        // 1. Tentar encontrar HTML em qualquer parte
        for (const part of payload.parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }

        // 2. Tentar encontrar Texto Simples
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }

        // 3. Chamada recursiva para partes aninhadas (ex: multipart/related, multipart/alternative)
        for (const part of payload.parts) {
            if (part.parts) {
                const body = getMessageBody(part);
                if (body) return body;
            }
        }
    }

    return '';
}

/**
 * Limpa o corpo do e-mail removendo o histórico citado (quoted text).
 * Foca em padrões do Gmail e Outlook.
 */
export function cleanMessageBody(html: string | undefined): string {
    if (!html) return '';

    let cleanHtml = html;

    // 1. Marcas de histórico conhecidas (O que vier depois é lixo)
    const markers = [
        '<div class="gmail_quote">',
        '<div class="gmail_signature">',
        '<div id="appendonsend">',
        '<hr id="divRplyFwdMsg"',
        '<blockquote'
    ];

    for (const marker of markers) {
        if (cleanHtml.includes(marker)) {
            cleanHtml = cleanHtml.split(marker)[0];
        }
    }

    // 2. O cabeçalho de texto "Em ..., escreveu:"
    const wroteRegex = /(?:<br>|\n|^)\s*(?:Em|On)\s+[\s\S]{5,250}?(?:escreveu|wrote):/gi;
    const match = wroteRegex.exec(cleanHtml);
    if (match) {
        cleanHtml = cleanHtml.substring(0, match.index);
    }

    // 3. Remover lixo estrutural e estilos gigantescos
    cleanHtml = cleanHtml.replace(/<style[\s\S]*?<\/style>/gi, '');
    cleanHtml = cleanHtml.replace(/<xml[\s\S]*?<\/xml>/gi, '');
    cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '');

    // 4. --- LÓGICA AGRESSIVA: Remover atributos style EXCETO os úteis para imagens ---
    // Removemos estilos de quase tudo, mas para <img> garantimos que não sumam e não estourem
    cleanHtml = cleanHtml.replace(/<img([^>]*?)\s+style="[^"]*?"/gi, '<img$1 style="max-width: 100%; height: auto; display: block; margin: 10px 0;"');
    
    // Agora removemos o resto dos estilos (que não sejam em img já tratados acima)
    // Usamos um truque: removemos style de tags que NÃO sejam img
    cleanHtml = cleanHtml.replace(/<(?!img)\w+([^>]*?)\s+style="[^"]*?"/gi, '<$0'); // Isso é complexo pacas em regex puras, vamos simplificar.
    
    // Versão mais segura: remover style de tudo, mas reinjetar o básico em IMG depois
    cleanHtml = cleanHtml.replace(/\s+style="[^"]*?"/gi, '');
    cleanHtml = cleanHtml.replace(/\s+style='[^']*?'/gi, '');
    
    // Reinjetar estilo básico em imagens para garantir visibilidade e responsividade
    cleanHtml = cleanHtml.replace(/<img /gi, '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;" ');

    // 5. Limpeza de espaços e tags vazias no início/fim
    const trimHtml = (str: string) => {
        let prev;
        let s = str.trim();
        do {
            prev = s;
            // Remover <br>, &nbsp;, \n e espaços do início e fim
            s = s.replace(/^(?:<br\s*\/?>|\n|\s|&nbsp;)+/gi, '');
            s = s.replace(/(?:<br\s*\/?>|\n|\s|&nbsp;)+$/gi, '');
        } while (s !== prev);
        return s;
    };

    cleanHtml = trimHtml(cleanHtml);

    // 6. Normalizar quebras de linha (máximo 2 <br>)
    cleanHtml = cleanHtml.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>');

    // 7. Remover quebras de linha literais (\n) que atrapalham o whitespace-pre-wrap
    cleanHtml = cleanHtml.replace(/\n\r?/g, ' ');

    // 8. Remover múltiplos espaços em branco para compactar
    cleanHtml = cleanHtml.replace(/\s{2,}/g, ' ');

    return cleanHtml.trim();
}

/**
 * Resolve referências cid: no corpo do e-mail, substituindo-as por Data URIs (Base64).
 */
export function resolveCids(html: string, payload: any): string {
    if (!html || !payload) return html;

    const cidMap: Record<string, { data: string, mimeType: string }> = {};

    // Função interna para varrer as partes da mensagem recursivamente
    function scanParts(parts: any[]) {
        for (const part of parts) {
            const headers = part.headers || [];
            const contentIdHeader = headers.find((h: any) => h.name?.toLowerCase() === 'content-id');
            
            if (contentIdHeader && part.body?.data) {
                // O Content-ID costuma vir entre < >
                const cid = contentIdHeader.value.replace(/[<>]/g, '');
                cidMap[cid] = {
                    data: part.body.data.replace(/-/g, '+').replace(/_/g, '/'), // Base64url to Base64
                    mimeType: part.mimeType || 'image/png'
                };
            }

            if (part.parts) {
                scanParts(part.parts);
            }
        }
    }

    if (payload.parts) {
        scanParts(payload.parts);
    }

    // Substituir src="cid:..." por Data URI
    let resolvedHtml = html;
    for (const [cid, info] of Object.entries(cidMap)) {
        const dataUri = `data:${info.mimeType};base64,${info.data}`;
        // Regex para encontrar src="cid:CID" ou src='cid:CID'
        const cidRegex = new RegExp(`src=["']cid:${cid}["']`, 'gi');
        resolvedHtml = resolvedHtml.replace(cidRegex, `src="${dataUri}"`);
    }

    return resolvedHtml;
}
