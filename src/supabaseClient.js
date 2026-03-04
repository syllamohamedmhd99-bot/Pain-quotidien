import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const realSupabase = createClient(supabaseUrl, supabaseAnonKey);

// --- ADAPTATEUR LOCAL (POUR MODE HORS LIGNE) ---
const LOCAL_API_URL = 'http://localhost:3001/api';

// Changez à 'false' pour repasser sur Supabase (en ligne)
// Changez à 'true' pour utiliser le serveur local SQLite (hors ligne)
const isLocalMode = false;

// Simulation d'une session locale persistante
const getLocalUser = () => {
    const saved = localStorage.getItem('local_user_session');
    return saved ? JSON.parse(saved) : { email: 'admin@boulangerie.local', role: 'admin' };
};

const localClient = {
    auth: {
        getSession: async () => ({ data: { session: { user: getLocalUser() } }, error: null }),
        onAuthStateChange: (callback) => {
            // Simulation
            setTimeout(() => callback('SIGNED_IN', { user: getLocalUser() }), 0);
            return { data: { subscription: { unsubscribe: () => { } } } };
        },
        signInWithPassword: async ({ email, password }) => {
            const user = { email, role: 'admin' };
            localStorage.setItem('local_user_session', JSON.stringify(user));
            return { data: { user, session: { user } }, error: null };
        },
        signOut: async () => {
            localStorage.removeItem('local_user_session');
            return { error: null };
        }
    },
    from: (table) => {
        const baseUrl = `${LOCAL_API_URL}/${table}`;
        let filters = {};
        const user = getLocalUser();

        const getHeaders = () => ({
            'Content-Type': 'application/json',
            'x-user-id': user.email
        });

        const chain = {
            select: (columns) => chain,
            order: (column, { ascending = true } = {}) => chain,
            eq: (field, value) => {
                filters[field] = value;
                return chain;
            },
            single: () => {
                return {
                    async then(onfulfilled) {
                        try {
                            let url = baseUrl;
                            if (filters.id) url = `${baseUrl}/${filters.id}`;
                            else if (Object.keys(filters).length > 0) {
                                const params = new URLSearchParams(filters);
                                url = `${baseUrl}?${params.toString()}`;
                            }
                            const res = await fetch(url, { headers: getHeaders() });
                            const data = await res.json();
                            onfulfilled({ data: Array.isArray(data) ? data[0] : data, error: null });
                        } catch (err) {
                            onfulfilled({ data: null, error: err });
                        }
                    }
                };
            },
            insert: (payload) => {
                return {
                    select: () => ({
                        single: () => ({
                            async then(onfulfilled) {
                                try {
                                    const res = await fetch(baseUrl, {
                                        method: 'POST',
                                        headers: getHeaders(),
                                        body: JSON.stringify(Array.isArray(payload) ? payload[0] : payload)
                                    });
                                    onfulfilled({ data: await res.json(), error: null });
                                } catch (err) {
                                    onfulfilled({ data: null, error: err });
                                }
                            }
                        })
                    }),
                    async then(onfulfilled) {
                        try {
                            const res = await fetch(baseUrl, {
                                method: 'POST',
                                headers: getHeaders(),
                                body: JSON.stringify(payload)
                            });
                            onfulfilled({ data: await res.json(), error: null });
                        } catch (err) {
                            onfulfilled({ data: null, error: err });
                        }
                    }
                };
            },
            update: (payload) => ({
                eq: (field, value) => ({
                    async then(onfulfilled) {
                        try {
                            const res = await fetch(`${baseUrl}/${value}`, {
                                method: 'PUT',
                                headers: getHeaders(),
                                body: JSON.stringify(payload)
                            });
                            onfulfilled({ data: await res.json(), error: null });
                        } catch (err) {
                            onfulfilled({ data: null, error: err });
                        }
                    }
                })
            }),
            delete: () => ({
                eq: (field, value) => ({
                    async then(onfulfilled) {
                        try {
                            const res = await fetch(`${baseUrl}/${value}`, {
                                method: 'DELETE',
                                headers: getHeaders()
                            });
                            onfulfilled({ data: await res.json(), error: null });
                        } catch (err) {
                            onfulfilled({ data: null, error: err });
                        }
                    }
                })
            }),
            async then(onfulfilled) {
                try {
                    let url = baseUrl;
                    if (Object.keys(filters).length > 0) {
                        const params = new URLSearchParams(filters);
                        url = `${baseUrl}?${params.toString()}`;
                    }
                    const res = await fetch(url, { headers: getHeaders() });
                    const data = await res.json();
                    onfulfilled({ data, error: null });
                } catch (err) {
                    onfulfilled({ data: [], error: err });
                }
            }
        };
        return chain;
    }
};

export const supabase = isLocalMode ? localClient : realSupabase;
