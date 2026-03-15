import { createClient } from '@/utils/supabase/client';

export function getAppUrl() {
  let url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  url = url.replace(/\/$/, '');
  
  // Garantir que tenha protocolo se não for localhost
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  return url;
}

/**
 * Processa o corpo do e-mail HTML para adicionar rastreamento de aberturas e cliques.
 */
export function injectTracking(body: string, logId: string) {
  const appUrl = getAppUrl();
  let trackedBody = body;

  // 1. Injetar Pixel de Abertura
  const openPixel = `<img src="${appUrl}/api/track/open/${logId}" width="1" height="1" style="display:none;" alt="" />`;
  trackedBody = trackedBody + openPixel;

  // 2. Injetar Rastreamento de Cliques nos links <a>
  // Regex para encontrar tags <a> com href
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  
  trackedBody = trackedBody.replace(linkRegex, (match, quote, url) => {
    // Ignorar se já for um link de rastreamento ou âncoras internas
    if (url.includes('/api/track/click/') || url.startsWith('#')) {
      return match;
    }

    // Codificar a URL de destino em base64 para passar na query do rastreador
    const encodedUrl = Buffer.from(url).toString('base64');
    const trackingUrl = `${appUrl}/api/track/click/${logId}?u=${encodedUrl}`;
    
    return match.replace(url, trackingUrl);
  });

  return trackedBody;
}
