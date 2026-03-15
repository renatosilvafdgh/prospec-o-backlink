import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: campanhas } = await supabase.from('campanhas').select('id, nome_campanha, sequencia_followup').eq('ativa', true);
  console.log('Campanhas ativas:', JSON.stringify(campanhas, null, 2));

  const { data: sites } = await supabase.from('sites').select('id, url, status_contato, proximo_followup, followup_index').eq('status_contato', 'contatado');
  console.log('Sites em follow-up:', JSON.stringify(sites, null, 2));
}

check().catch(console.error);
