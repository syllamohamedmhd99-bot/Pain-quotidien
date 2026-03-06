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
            return res.status(401).json({ error: 'Session invalide ou expirée.' });
        }

        // On récupère TOUTES les infos du profil pour avoir l'id et l'éventuel user_id (email)
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !requesterProfile || requesterProfile.role !== 'Administrateur') {
            return res.status(403).json({ error: 'Accès refusé : Rôle Administrateur requis.' });
        }

        // Prevent admin from deleting themselves
        if (user.id === targetUserId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
        }

        // --- DISSOCIATION MANUELLE ET SÉCURISÉE ---
        // On détache l'utilisateur de toutes les tables pour éviter les erreurs de FK
        const detach = async (table, col, val) => {
            try {
                await supabaseAdmin.from(table).update({ [col]: null }).eq(col, val);
            } catch (e) {
                console.warn(`Could not detach ${val} from ${table}.${col}`);
            }
        };

        // Tables utilisant des UUID
        await detach('transactions', 'user_id', targetUserId);
        await detach('expenses', 'user_id', targetUserId);
        await detach('production_logs', 'user_id', targetUserId);

        // tables utilisant potentiellement des emails (legacy)
        // On récupère l'email de l'utilisateur à supprimer si possible
        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
        if (targetUser && targetUser.email) {
            await detach('products', 'user_id', targetUser.email);
            await detach('clients', 'user_id', targetUser.email);
            await detach('suppliers', 'user_id', targetUser.email);
        }

        // On supprime d'abord le profil manuellement pour être sûr (avant le auth.user)
        await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

        // 2. Suppression de la couche Auth (L'action finale)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (deleteError) {
            console.error("Auth Delete ERROR:", deleteError);
            return res.status(500).json({
                error: `Erreur Supabase Auth: ${deleteError.message}`,
                details: "La base de données refuse toujours la suppression. Assurez-vous d'avoir exécuté le script ultimate_unlock.sql dans Supabase."
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
