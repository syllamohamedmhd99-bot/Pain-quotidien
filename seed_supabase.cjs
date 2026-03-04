const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log("Seeding test product...");
    const { data, error } = await supabase
        .from('products')
        .insert([
            { name: "Pain de Campagne (Test)", category: "Pains", price: 15000, stock: 50, status: "En stock" }
        ]);

    if (error) {
        console.error("Error seeding:", error);
    } else {
        console.log("Success! Product seeded.");
    }
}

seed();
