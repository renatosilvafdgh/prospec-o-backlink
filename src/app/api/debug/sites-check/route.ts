import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Check campanhas
        const { data: campanhas, error: campError } = await supabase
            .from('campanhas')
            .select('id, nome_campanha, sites:sites(count)')
            .eq('user_id', user.id);

        // Check sites count per campaign manually just in case
        const { data: sitesWithCamp, error: sitesError } = await supabase
            .from('sites')
            .select('id, campanha_id')
            .eq('user_id', user.id);

        const summary = {
            totalCampanhas: campanhas?.length || 0,
            campanhasData: campanhas,
            totalSites: sitesWithCamp?.length || 0,
            sitesWithCampId: sitesWithCamp?.filter(s => s.campanha_id).length || 0,
            sitesWithoutCampId: sitesWithCamp?.filter(s => !s.campanha_id).length || 0,
            sampleSites: sitesWithCamp?.slice(0, 5)
        };

        return NextResponse.json(summary);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
