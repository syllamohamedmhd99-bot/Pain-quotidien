const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceAdminUser() {
    console.log("Insertion du profil...");

    // In many Supabase schemas auth.users ID is linked to profiles.id
    // and user_id might actually be the same UUID, or just not exist.
    // Let's list columns first to be safe, but since we can't easily do that via REST:
    // Let's just insert with minimal fields: id, role, full_name
    const adminProfile = {
        id: '05037ca9-e675-4ab2-844c-306dafc8f51b',
        role: 'Administrateur',
        full_name: 'Administrateur Principal'
    };

    try {
        const { data, error } = await supabase
            .from('profiles')
            .upsert(adminProfile, { onConflict: 'id' })
            .select();

        if (error) {
            console.error("❌ ERREUR :", error.message);

            // Fallback: try inserting with user_id as UUID if that is what it expects.
            if (error.message.includes('uuid')) {
                console.log("Tentative 2 : user_id en tant que UUID...");
                adminProfile.user_id = '05037ca9-e675-4ab2-844c-306dafc8f51b';
                const { data: d2, error: e2 } = await supabase.from('profiles').upsert(adminProfile, { onConflict: 'id' }).select();
                if (e2) console.error("❌ ECHEC 2:", e2.message);
                else console.log("✅ SUCCÈS TENTATIVE 2:", d2);
            }
        } else {
            console.log("✅ SUCCÈS ! Données :", data);
        }
    } catch (err) {
        console.error("❌ Erreur :", err);
    }
}

forceAdminUser();
