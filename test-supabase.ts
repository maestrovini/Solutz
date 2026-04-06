
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  console.log('Checking Supabase Config...');
  console.log('URL defined:', !!supabaseUrl);
  console.log('Key defined:', !!supabaseKey);

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) {
        console.log('Supabase Connection Error:', error.message);
      } else {
        console.log('Supabase Connection Success! Found users table.');
      }
    } catch (e) {
      console.log('Supabase Initialization Error:', e);
    }
  } else {
    console.log('Supabase variables are missing in environment.');
  }
}

test();
