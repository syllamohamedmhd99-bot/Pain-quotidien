import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepDiag() {
    console.log("--- DIAGNOSTIC PROFOND DES SUPPRESSIONS ---");

    const tablesToTest = ['products', 'clients', 'suppliers', 'transactions'];

    for (const table of tablesToTest) {
        console.log(`\nTest de la table: ${table}`);

        // 1. Lire un ID
        const { data, error: readError } = await supabase.from(table).select('id').limit(1);
        if (readError) {
            console.error(`  [LECTURE] Échec: ${readError.message}`);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`  [LECTURE] Table vide, impossible de tester la suppression.`);
            continue;
        }

        const testId = data[0].id;
        console.log(`  [LECTURE] Succès. ID cible: ${testId}`);

        // 2. Tenter la suppression
        console.log(`  Tentative de suppression de l'ID ${testId}...`);
        const { error: deleteError } = await supabase.from(table).delete().eq('id', testId);

        if (deleteError) {
            console.error(`  [SUPPRESSION] Échec: ${deleteError.message}`);
            console.error(`  [CODE ERR] ${deleteError.code}`);
            if (deleteError.details) console.error(`  [DÉTAILS] ${deleteError.details}`);
            if (deleteError.hint) console.error(`  [PISTE] ${deleteError.hint}`);

            if (deleteError.message.includes("policy")) {
                console.log("  >>> ANALYSE: C'est un problème de RLS (Row Level Security). Les droits de suppression ne sont pas accordés.");
            } else if (deleteError.code === '23503') {
                console.log("  >>> ANALYSE: C'est un problème de CLÉ ÉTRANGÈRE. Des données sont encore liées.");
            }
        } else {
            console.log(`  [SUPPRESSION] RÉUSSIE !`);
        }
    }
}

deepDiag();
