require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

async function testCreateUser() {
    console.log("=== TEST DE CREATION D'UTILISATEUR PAR API ===");

    // 1. Simulate frontend payload
    const newUser = {
        fullName: "Test Admin Creation",
        email: "testcreation1234@test.com",
        password: "password123!",
        role: "Staff"
    };

    // 2. We need an admin session token to call our API.
    // Let's log in as the admin we created earlier.
    const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';
    // We actually need the SERVICE ROLE KEY to test the real backend function, 
    // since the backend function relies on it to create users.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
        console.error("Test impossible: SUPABASE_SERVICE_ROLE_KEY is missing from .env.");
        console.error("The Vercel function api/createUser.js requires this key to work.");
        return;
    }

    // Rather than dealing with a mocked token and real backend checks at the same time,
    // let's verify if SUPABASE_SERVICE_ROLE_KEY is even defined in the user's .env.
    // That is the #1 reason why a serverless function connecting to Supabase Admin API fails immediately.
    console.log("Les clés sont présentes ! SUPABASE_SERVICE_ROLE_KEY = " + serviceKey.substring(0, 10) + "...");

    // For the purpose of this test, we'll use the service key as the "token"
    // because the API handler will use it internally to create a Supabase client with admin privileges.
    // In a real scenario, this token would come from a user's session.
    const token = serviceKey;
    console.log("Using SUPABASE_SERVICE_ROLE_KEY as token for API call.");

    try {
        const handler = require('../api/createUser.js').default;

        let jsonResponse = null;
        let statusCode = 200;

        const req = {
            method: 'POST',
            body: newUser,
            headers: {
                authorization: `Bearer ${token}`
            }
        };

        const res = {
            setHeader: () => { },
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                jsonResponse = data;
                console.log(`[STATUS ${statusCode}] API Response :`, data);
            },
            end: () => { }
        };

        await handler(req, res);

    } catch (e) {
        console.error("Test function crashed:", e);
    }
}

testCreateUser();
