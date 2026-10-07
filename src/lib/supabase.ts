import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eektlbyqnttpetwydpka.supabase.co';
const supabaseKey = 'sb_publishable_6eGHWKp_oz8O573IbdRwvA_HOMtG-n2';

export const supabase = createClient(supabaseUrl, supabaseKey);
