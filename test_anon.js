import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    console.log("Testing connection to Supabase...");
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) {
            console.log(`Connection Test: FAILED - ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`Connection Test: SUCCESS - Project is alive and reachable.`);
        }
    } catch (err) {
        console.log(`Connection Test: CRASH - ${err.message}`);
    }
}

testConnection();
