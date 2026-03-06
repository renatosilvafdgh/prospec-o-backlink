import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
    try {
        const supabase = createAdminClient();

        // 1. Limpar status de resposta nos sites
        const { error: errorSites } = await supabase
            .from('sites')
            .update({
                status_contato: 'contatado', // Volta para contatado (ou em_aguardo)
                thread_id: null,
                ultimo_contato: null
            })
            .eq('status_contato', 'respondeu');

        if (errorSites) throw errorSites;

        // 2. Limpar flag de resposta nos logs de e-mail
        const { error: errorLogs } = await supabase
            .from('email_logs')
            .update({ respondeu: false })
            .eq('respondeu', true);

        if (errorLogs) throw errorLogs;

        return NextResponse.json({ success: true, message: 'Inbox limpa com sucesso' });

    } catch (error: any) {
        console.error('Erro ao limpar inbox:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
