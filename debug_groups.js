
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

async function debug() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const isoToday = today.toISOString();
    
    console.log('Filtro GTE:', isoToday);

    const { data: logs, error } = await supabase
        .from('email_logs')
        .select('status_envio, tipo, data_envio')
        .gte('data_envio', isoToday);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Total de logs hoje:', logs.length);
    
    const summary = {};
    logs.forEach(log => {
        const key = `${log.status_envio} | ${log.tipo}`;
        summary[key] = (summary[key] || 0) + 1;
    });

    console.log('Sumário de logs hoje:');
    console.log(JSON.stringify(summary, null, 2));

    // Sample data_envio to check timezone
    if (logs.length > 0) {
        console.log('Exemplo de data_envio:', logs[0].data_envio);
    }
}

debug();
