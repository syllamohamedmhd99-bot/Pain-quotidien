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

    return updateUser(req, res);
}

async function updateUser(req, res) {
    try {
        const { targetUserId, updateData } = req.body;

        if (!targetUserId || !updateData) {
            return res.status(400).json({ error: 'targetUserId or updateData missing in request body.' });
        }

        // Ensure Authorization header exists
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');

        // 1. Initialize Supabase Client with SERVICE_ROLE_KEY
        // The service role key bypasses RLS and allows modifying other users' profiles.
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rsczhjixffzqymauewpu.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return res.status(500).json({
                error: 'ERREUR CRITIQUE: La variable SUPABASE_SERVICE_ROLE_KEY est introuvable.'
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 2. Verify that the requester is an Admin
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Check requester's role in the profiles table
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !requesterProfile || requesterProfile.role !== 'Administrateur') {
            return res.status(403).json({ error: 'Forbidden: Requires Administrator role' });
        }

        // 3. Update the target profile using admin rights (bypasses RLS)
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', targetUserId)
            .select();

        if (updateError) {
            console.error("Profile Update Error:", updateError);
            return res.status(500).json({ error: 'Update failed: ' + updateError.message });
        }

        return res.status(200).json({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: updatedProfile
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
