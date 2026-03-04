// This is a Serverless Function for Vercel
import { createClient } from '@supabase/supabase-js';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    return createUser(req, res);
}

async function createUser(req, res) {
    try {
        const { fullName, email, password, role } = req.body;

        // Ensure Authorization header exists
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');

        // 1. Initialize Supabase Client with SERVICE_ROLE_KEY
        // The service role key bypasses RLS and allows creating users.
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return res.status(500).json({ error: 'Server configuration error (missing keys)' });
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

        // 3. Create the new user in auth.users
        const { data: newUserAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Auto-confirm email
        });

        if (createError) {
            console.error("Auth Admin Create Error:", createError);
            return res.status(400).json({ error: createError.message });
        }

        // 4. Create the profile in the profiles table
        const newUserId = newUserAuth.user.id;

        const { error: profileCreateError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUserId,
                user_id: newUserId, // Based on schema
                full_name: fullName,
                role: role || 'Staff'
            });

        if (profileCreateError) {
            console.error("Profile Upsert Error:", profileCreateError);
            return res.status(500).json({ error: 'User created but profile creation failed.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            user: {
                id: newUserId,
                email: email,
                role: role || 'Staff'
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
