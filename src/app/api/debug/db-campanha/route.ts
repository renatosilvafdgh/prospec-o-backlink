import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Não autenticado' });

        // Tentar um insert básico para ver o erro
        const testData = {
            nome_campanha: 'TESTE DEBUG ' + new Date().getTime(),
            emails_por_dia: 50,
            intervalo_envio_segundos: 0,
            usar_intervalo_humano: false,
            template_inicial: null, // Verificando se aceita null
            template_followup: null,
            sequencia_followup: [],
            ativa: true,
            user_id: user.id
        };

        const { data, error } = await supabase.from('campanhas').insert([testData]).select();

        return NextResponse.json({
            user_id: user.id,
            testData,
            supabaseError: error,
            result: data
        });
    } catch (err: any) {
        return NextResponse.json({ exception: err.message });
    }
}
