import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
    console.log("Checking tables in Supabase...");

    // Try to query a few common tables
    const tables = ['profiles', 'products', 'transactions', 'expenses', 'production_logs', 'clients', 'suppliers'];

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`Table [${table}]: ERROR - ${error.message} (Code: ${error.code})`);
            } else {
                console.log(`Table [${table}]: OK (${data ? data.length : 0} rows found)`);
            }
        } catch (err) {
            console.log(`Table [${table}]: CRASH - ${err.message}`);
        }
    }
}

checkTables();
