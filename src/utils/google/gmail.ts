import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
];

export function getAuthUrl(redirectUri?: string) {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent',
        redirect_uri: redirectUri || process.env.GOOGLE_REDIRECT_URI,
    });
}

export async function getTokens(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
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
