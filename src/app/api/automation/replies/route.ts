import { NextResponse } from 'next/server';
import { checkNewReplies } from '@/utils/google/replies';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Usaremos o admin client para bypass RLS
    const supabase = createAdminClient();

    // 1. Validar Secret ou Autenticação de Usuário
    if (secret !== process.env.CRON_SECRET) {
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
    }

    try {
        // Obter todos os usuários com tokens ativos
        const { data: users } = await supabase
            .from('users_tokens')
            .select('user_id');

        const results = [];
        if (users) {
            for (const user of users) {
                const result = await checkNewReplies(user.user_id);
                results.push(result);
            }
        }

        return NextResponse.json({
            success: true,
            processed: users?.length || 0,
            details: results
        });
    } catch (error: any) {
        console.error('Erro na sincronização de respostas:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
