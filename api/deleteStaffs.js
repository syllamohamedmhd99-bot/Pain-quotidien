// This is a Serverless Function for Vercel
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Ensure Authorization header exists
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rsczhjixffzqymauewpu.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return res.status(500).json({ error: 'La variable SUPABASE_SERVICE_ROLE_KEY est requise sur le serveur.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Verify that the requester is a valid user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Check if requester is Admin
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !requesterProfile || requesterProfile.role !== 'Administrateur') {
            return res.status(403).json({ error: 'Forbidden: Requires Administrator role' });
        }

        // GET all profiles with role "Staff"
        const { data: staffProfiles, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'Staff');

        if (fetchError) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des staffs', details: fetchError });
        }

        if (!staffProfiles || staffProfiles.length === 0) {
            return res.status(200).json({ message: 'Aucun compte Staff trouvé à supprimer.' });
        }

        let deletedCount = 0;
        let errors = [];

        // DELETE each staff from Auth then Profile (auto-cascade usually, but just in case)
        for (const staff of staffProfiles) {
            try {
                // Dissociation exhaustive pour ce staff spécifique avant suppression
                const tables = ['transactions', 'expenses', 'production_logs', 'products', 'clients', 'suppliers'];
                const possibleUserCols = ['user_id', 'created_by'];

                for (const table of tables) {
                    for (const col of possibleUserCols) {
                        try {
                            await supabaseAdmin.from(table).update({ [col]: null }).eq(col, staff.id);
                        } catch (e) { }
                    }
                }

                // Delete from auth.users
                const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(staff.id);
                if (deleteAuthError) {
                    errors.push({ id: staff.id, error: deleteAuthError.message });
                } else {
                    deletedCount++;
                }
            } catch (err) {
                errors.push({ id: staff.id, error: err.message });
            }
        }

        // Just in case cascade didn't work for some reason
        await supabaseAdmin.from('profiles').delete().eq('role', 'Staff');

        return res.status(200).json({
            success: true,
            message: `${deletedCount} comptes Staff supprimés.`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
