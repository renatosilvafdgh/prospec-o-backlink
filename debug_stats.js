
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const isoToday = today.toISOString();
    
    console.log('ISO Today (Local 00:00 converted to UTC):', isoToday);
    
    const { count: totalLogs } = await supabase.from('email_logs').select('*', { count: 'exact', head: true });
    console.log('Total logs:', totalLogs);

    const { count: successLogs } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('status_envio', 'sucesso');
    console.log('Success logs (All time):', successLogs);

    const { count: todayLogs } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('status_envio', 'sucesso').gte('data_envio', isoToday);
    console.log('Success logs (Today ISO):', todayLogs);

    const { data: samples } = await supabase.from('email_logs').select('data_envio, status_envio, user_id').limit(5).order('data_envio', { ascending: false });
    console.log('Latest logs:', JSON.stringify(samples, null, 2));

    // Get a user to test specific filtering
    if (samples && samples.length > 0) {
        const userId = samples[0].user_id;
        console.log('Testing for user:', userId);
        const { count: userToday } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status_envio', 'sucesso').gte('data_envio', isoToday);
        console.log('User today logs:', userToday);
    }
}

debug();
