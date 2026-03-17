
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    // Check columns of email_logs
    const { data: cols, error: colError } = await supabase
        .from('email_logs')
        .select('*')
        .limit(1);
    
    if (colError) console.error('Error fetching email_logs sample:', colError);
    else console.log('email_logs keys:', Object.keys(cols[0] || {}));

    // Check columns of sites
    const { data: sCols, error: sColError } = await supabase
        .from('sites')
        .select('*')
        .limit(1);
    
    if (sColError) console.error('Error fetching sites sample:', sColError);
    else console.log('sites keys:', Object.keys(sCols[0] || {}));

    // Check if there are any logs at all across all users
    const { count: total } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true });
    console.log('Total email_logs across all users:', total);

    // Check latest 10 logs with their data_envio and status_envio
    const { data: recent } = await supabase
        .from('email_logs')
        .select('data_envio, status_envio, user_id, tipo')
        .order('data_envio', { ascending: false })
        .limit(10);
    console.log('Recent logs:', JSON.stringify(recent, null, 2));
}

inspect();
