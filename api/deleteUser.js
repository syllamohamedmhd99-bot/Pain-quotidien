// This is a Serverless Function for Vercel
import { createClient } from '@supabase/supabase-js';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    return deleteUser(req, res);
}

async function deleteUser(req, res) {
    try {
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ error: 'targetUserId missing in request body.' });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Initialize Supabase Client with SERVICE_ROLE_KEY to bypass RLS
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rsczhjixffzqymauewpu.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return res.status(500).json({ error: 'ERREUR CRITIQUE: La variable SUPABASE_SERVICE_ROLE_KEY est introuvable sur Vercel.' });
        }

        // --- TEST DE VALIDITÉ DE LA CLÉ ---
        // On fait un petit test rapide pour voir si la clé est acceptée par Supabase
        const testClient = createClient(supabaseUrl, supabaseServiceKey);
        const { error: testError } = await testClient.from('profiles').select('id').limit(1);
        if (testError && testError.message.includes("Invalid API key")) {
            return res.status(500).json({
                error: "La clé SUPABASE_SERVICE_ROLE_KEY configurée sur Vercel est INVALIDE.",
                details: "Comme vous avez recréé votre base de données, vous devez copier la NOUVELLE 'service_role key' depuis Supabase (Settings -> API) et la mettre à jour dans les variables d'environnement de Vercel."
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Verify requester is Admin
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !requesterProfile || requesterProfile.role !== 'Administrateur') {
            return res.status(403).json({ error: 'Forbidden: Requires Administrator role' });
        }

        // Prevent admin from deleting themselves
        if (user.id === targetUserId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
        }

        // --- DISSOCIATION DES DONNÉES (Pour éviter les erreurs de contrainte d'intégrité) ---
        const tables = ['transactions', 'expenses', 'production_logs', 'products', 'clients', 'suppliers'];
        const possibleUserCols = ['user_id', 'created_by'];

        for (const table of tables) {
            for (const col of possibleUserCols) {
                try {
                    await supabaseAdmin.from(table).update({ [col]: null }).eq(col, targetUserId);
                } catch (e) {
                    // Silencieusement ignorer si la colonne n'existe pas ou est NOT NULL
                }
            }
        }

        // 2. Delete the user from Auth layer
        const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (deleteError) {
            console.error("Auth Delete Error:", deleteError);
            // Si la suppression échoue, c'est probablement car une contrainte NOT NULL bloque toujours
            return res.status(500).json({
                error: 'Échec de suppression Supabase: ' + deleteError.message,
                details: "Cela arrive souvent quand l'utilisateur est lié à des factures ou dépenses qui ne peuvent pas être dissociées (colonnes obligatoires).",
                code: deleteError.code
            });
        }

        // Also explicitly delete from profiles just in case ON DELETE CASCADE is missing
        await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

        return res.status(200).json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
