import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { siteId, lido, classificacao_lead } = await request.json();

        if (!siteId) {
            return NextResponse.json({ error: 'ID do site é obrigatório' }, { status: 400 });
        }

        const updateData: any = {};
        if (lido !== undefined) updateData.lido = lido;
        if (classificacao_lead !== undefined) updateData.classificacao_lead = classificacao_lead;

        const { error } = await supabase
            .from('sites')
            .update(updateData)
            .eq('id', siteId)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro ao atualizar site:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
