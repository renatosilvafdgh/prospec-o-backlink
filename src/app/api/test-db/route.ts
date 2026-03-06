import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
    try {
        const supabase = createAdminClient();

        // Puxar os últimos logs pelos campos disponíveis na tabela
        const { data: logs, error } = await supabase
            .from("email_logs")
            .select("*, sites(url, email)")
            .order('data_envio', { ascending: false })
            .limit(10);

        return NextResponse.json({
            error,
            ultimos_logs: logs || []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
