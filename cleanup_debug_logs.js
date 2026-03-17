
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

async function cleanup() {
    console.log('Iniciando limpeza de logs de debug...');
    
    // Deletar todos os logs que começam com 'debug_'
    const { count, error } = await supabase
        .from('email_logs')
        .delete({ count: 'exact' })
        .filter('status_envio', 'ilike', 'debug_%');

    if (error) {
        console.error('Erro na limpeza:', error);
    } else {
        console.log(`Sucesso! ${count} logs de debug removidos.`);
    }
}

cleanup();
