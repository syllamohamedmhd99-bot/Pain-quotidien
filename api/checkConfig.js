import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ status: 'ERR', message: 'JWT manquant dans le header' });
        const token = authHeader.replace('Bearer ', '');

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rsczhjixffzqymauewpu.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const results = {
            url: supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
            serviceKeyStart: supabaseServiceKey ? supabaseServiceKey.substring(0, 5) + '...' : 'NONE',
            dbConnection: 'Inconnu',
            isAdmin: 'Inconnu',
            error: null
        };

        if (!supabaseServiceKey) {
            return res.status(200).json({ status: 'CONFIG_MISSING', results });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Test de connexion et droits admin
        const { data: prof, error: dbError } = await supabaseAdmin.from('profiles').select('id').limit(1);
        results.dbConnection = dbError ? `ERREUR: ${dbError.message}` : 'OK';

        // Test de l'utilisateur actuel
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            results.isAdmin = 'Erreur Auth';
        } else {
            const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
            results.isAdmin = profile ? profile.role : 'Profil manquant';
        }

        return res.status(200).json({ status: 'OK', results });

    } catch (e) {
        return res.status(500).json({ status: 'CRASH', error: e.message });
    }
}
