import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eektlbyqnttpetwydpka.supabase.co';
const supabaseKey = 'sb_publishable_6eGHWKp_oz8O573IbdRwvA_HOMtG-n2';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('clientes').select('*').limit(1);
  if (error) console.error(error);
  else console.log(JSON.stringify(data?.[0] || {}, null, 2));
}
test();
