import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProducts() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Product ID:", data[0].id, "Type:", typeof data[0].id);
    } else {
        console.log("No products found, checking table structure via dummy insert attempt (rollback)...");
        // We can't easily check structure without data or admin access, but let's try a select with a guess
        const { error: err } = await supabase.from('products').select('id').eq('id', 1);
        if (err && err.code === '22P02') { // Invalid input syntax for type uuid
            console.log("Guess: products.id is UUID");
        } else {
            console.log("Guess: products.id is likely BIGINT/Integer");
        }
    }
}

checkProducts();
