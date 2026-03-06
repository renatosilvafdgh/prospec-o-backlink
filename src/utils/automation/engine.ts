import { createClient } from '@/utils/supabase/server';
import { getGmailClient } from '@/utils/google/gmail';

export async function processCampanhas() {
    const supabase = await createClient();

    // 1. Buscar campanhas ativas
    const { data: campanhas } = await supabase
        .from('campanhas')
        .select('*, template_inicial(*), template_followup(*)')
        .eq('ativa', true);

    if (!campanhas) return;

    for (const campanha of campanhas) {
        // 2. Buscar sites para prospecção (ainda não contatados)
        const { data: sitesALanccar } = await supabase
            .from('sites')
            .select('*')
            .eq('user_id', campanha.user_id)
            .eq('status_contato', 'lead')
            .limit(campanha.emails_por_dia / 24); // Exemplo de distribuição por hora

        // 3. Processar envio (mesma lógica do send/route.ts, mas em loop)
        // TODO: Implementar envio em lote com espaçamento inteligente

        // 4. Buscar sites para Follow-up
        const { data: sitesFollowup } = await supabase
            .from('sites')
            .select('*')
            .eq('user_id', campanha.user_id)
            .eq('status_contato', 'contatado')
            .lte('proximo_followup', new Date().toISOString());

        if (sitesFollowup) {
            for (const site of sitesFollowup) {
                // Enviar follow-up
            }
        }
    }
}
