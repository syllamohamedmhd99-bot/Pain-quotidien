import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    console.log("Checking for delivery_items table...");
    const { data, error } = await supabase.from('delivery_items').select('*').limit(1);
    if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
            console.log("Table 'delivery_items' does not exist.");
        } else {
            console.error("Error:", error);
        }
    } else {
        console.log("Table 'delivery_items' exists. Columns:", Object.keys(data[0] || {}));
    }
}

checkTables();
