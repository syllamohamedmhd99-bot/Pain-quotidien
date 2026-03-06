import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPermissions() {
    console.log("--- TEST DE PERMISSIONS ---");

    // 1. Test lecture
    const { data: products, error: readError } = await supabase.from('products').select('*').limit(1);
    if (readError) {
        console.error("LECTURE [products]: ÉCHEC -", readError.message);
    } else {
        console.log("LECTURE [products]: RÉUSSIE");

        if (products && products.length > 0) {
            const firstId = products[0].id;
            console.log(`Tentative de suppression du produit ID: ${firstId}...`);

            // 2. Test suppression (via anon)
            const { error: deleteError } = await supabase.from('products').delete().eq('id', firstId);
            if (deleteError) {
                console.error("SUPPRESSION [products]: ÉCHEC -", deleteError.message);
                console.error("Détails:", deleteError);
            } else {
                console.log("SUPPRESSION [products]: RÉUSSIE");
            }
        } else {
            console.log("Aucun produit trouvé pour tester la suppression.");
        }
    }
}

checkPermissions();
