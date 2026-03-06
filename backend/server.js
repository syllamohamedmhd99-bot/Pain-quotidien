const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./dev.db'
        }
    }
});
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Middleware pour extraire le user_id des headers
app.use((req, res, next) => {
    // Si on est sur la racine, pas besoin de user_id
    if (req.path === '/') return next();

    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn("Requête sans x-user-id:", req.path);
        // On ne bloque pas forcément tout de suite pour permettre le debug, 
        // mais on le définit par défaut si manquant (pour la transition)
        req.userId = 'admin@boulangerie.local';
    } else {
        req.userId = userId;
    }
    next();
});

// Message de bienvenue
app.get('/', (req, res) => {
    res.send('Serveur API Pain Quotidien (Local) est actif. Mode Multi-Utilisateurs activé.');
});

// Helper to handle both single object and array inserts with user_id
const handleInsert = async (model, data, userId) => {
    if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
            const created = await model.create({ data: { ...item, user_id: userId } });
            results.push(created);
        }
        return results;
    }
    return await model.create({ data: { ...data, user_id: userId } });
};

// --- PRODUCTS ---
app.get('/api/products', async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            where: { user_id: req.userId },
            orderBy: { name: 'asc' }
        });
        res.json(products);
    } catch (err) { next(err); }
});

app.post('/api/products', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.product, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

app.put('/api/products/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.update({
            where: { id: parseInt(id), user_id: req.userId },
            data: req.body
        });
        res.json(product);
    } catch (err) { next(err); }
});

app.delete('/api/products/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: parseInt(id), user_id: req.userId }
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- CLIENTS ---
app.get('/api/clients', async (req, res, next) => {
    try {
        const clients = await prisma.client.findMany({
            where: { user_id: req.userId },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (err) { next(err); }
});

app.post('/api/clients', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.client, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

app.put('/api/clients/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = await prisma.client.update({
            where: { id: parseInt(id), user_id: req.userId },
            data: req.body
        });
        res.json(client);
    } catch (err) { next(err); }
});

app.delete('/api/clients/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.client.delete({
            where: { id: parseInt(id), user_id: req.userId }
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- SUPPLIERS ---
app.get('/api/suppliers', async (req, res, next) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: { user_id: req.userId },
            orderBy: { name: 'asc' }
        });
        res.json(suppliers);
    } catch (err) { next(err); }
});

app.post('/api/suppliers', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.supplier, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

app.put('/api/suppliers/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.update({
            where: { id: parseInt(id), user_id: req.userId },
            data: req.body
        });
        res.json(supplier);
    } catch (err) { next(err); }
});

app.delete('/api/suppliers/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.supplier.delete({
            where: { id: parseInt(id), user_id: req.userId }
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- TRANSACTIONS ---
app.get('/api/transactions', async (req, res, next) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { user_id: req.userId },
            include: { client: true },
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    } catch (err) { next(err); }
});

// Single transaction by ID
app.get('/api/transactions/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id), user_id: req.userId },
            include: { client: true, items: { include: { product: true } } }
        });
        res.json(transaction);
    } catch (err) { next(err); }
});

// Create transaction
app.post('/api/transactions', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.transaction, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

// --- TRANSACTION ITEMS ---
app.get('/api/transaction_items', async (req, res, next) => {
    try {
        const { transaction_id } = req.query;
        // Ici on filtre indirectement via la transaction parente pour plus de sécurité
        const whereClause = { transaction: { user_id: req.userId } };
        if (transaction_id) whereClause.transaction_id = parseInt(transaction_id);

        const items = await prisma.transactionItem.findMany({
            where: whereClause,
            include: { product: true }
        });
        res.json(items);
    } catch (err) { next(err); }
});

app.post('/api/transaction_items', async (req, res, next) => {
    try {
        if (Array.isArray(req.body)) {
            // Bulk insert - Note: Transaction must already belong to the user
            const results = await prisma.transactionItem.createMany({ data: req.body });
            res.json(results);
        } else {
            const item = await prisma.transactionItem.create({ data: req.body });
            res.json(item);
        }
    } catch (err) { next(err); }
});

// --- PROFILES ---
app.get('/api/profiles', async (req, res, next) => {
    try {
        const profile = await prisma.profile.findUnique({
            where: { user_id: req.userId }
        });
        res.json(profile || { user_id: req.userId, full_name: "Utilisateur", role: "Gérant", avatar_url: null });
    } catch (err) { next(err); }
});

app.post('/api/profiles', async (req, res, next) => {
    try {
        const profile = await prisma.profile.upsert({
            where: { user_id: req.userId },
            update: req.body,
            create: { ...req.body, user_id: req.userId }
        });
        res.json(profile);
    } catch (err) { next(err); }
});

// --- EXPENSES ---
app.get('/api/expenses', async (req, res, next) => {
    try {
        const expenses = await prisma.expense.findMany({
            where: { user_id: req.userId },
            include: { supplier: true },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (err) { next(err); }
});

app.post('/api/expenses', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.expense, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

app.delete('/api/expenses/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.expense.delete({
            where: { id: parseInt(id), user_id: req.userId }
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- PRODUCTION LOGS ---
app.get('/api/production', async (req, res, next) => {
    try {
        const logs = await prisma.productionLog.findMany({
            where: { user_id: req.userId },
            orderBy: { created_at: 'desc' }
        });
        res.json(logs);
    } catch (err) { next(err); }
});

app.post('/api/production', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.productionLog, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

app.put('/api/production/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const log = await prisma.productionLog.update({
            where: { id: parseInt(id), user_id: req.userId },
            data: req.body
        });
        res.json(log);
    } catch (err) { next(err); }
});

app.delete('/api/production/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.productionLog.delete({
            where: { id: parseInt(id), user_id: req.userId }
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- SALARIES ---
app.get('/api/salaries', async (req, res, next) => {
    try {
        const salaries = await prisma.salary.findMany({
            where: { user_id: req.userId },
            orderBy: { date: 'desc' }
        });
        res.json(salaries);
    } catch (err) { next(err); }
});

app.post('/api/salaries', async (req, res, next) => {
    try {
        const result = await handleInsert(prisma.salary, req.body, req.userId);
        res.json(result);
    } catch (err) { next(err); }
});

app.put('/api/salaries/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const salary = await prisma.salary.update({
            where: { id: parseInt(id), user_id: req.userId },
            data: req.body
        });
        res.json(salary);
    } catch (err) { next(err); }
});

app.delete('/api/salaries/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.salary.delete({
            where: { id: parseInt(id), user_id: req.userId }
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- STATS ---
app.get('/api/stats', async (req, res, next) => {
    try {
        // 1. Total Revenue (Transactions)
        const transactions = await prisma.transaction.findMany({
            where: { user_id: req.userId, type: 'Vente' }
        });
        const totalRevenue = transactions.reduce((acc, curr) => acc + curr.total_amount, 0);

        // 2. Total Expenses
        const expenses = await prisma.expense.findMany({
            where: { user_id: req.userId }
        });
        const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        // 3. Low Stock Alerts
        const lowStockProducts = await prisma.product.findMany({
            where: {
                user_id: req.userId,
                stock: { lte: prisma.product.min_stock } // Note: prisma doesn't support col-to-col direct comparison easily in SQLite with findMany
            }
        });

        // Correcting low stock fetch: Since SQLite/Prisma doesn't easily compare two columns in findMany directly,
        // we'll fetch all and filter or use raw query. Let's fetch the products and filter for simplicity for now.
        const allProducts = await prisma.product.findMany({ where: { user_id: req.userId } });
        const stockAlerts = allProducts.filter(p => p.stock <= p.min_stock);

        // 4. Sales over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = await prisma.transaction.findMany({
            where: {
                user_id: req.userId,
                type: 'Vente',
                date: { gte: thirtyDaysAgo }
            },
            orderBy: { date: 'asc' }
        });

        // 5. Production Stats
        const productionCount = await prisma.productionLog.count({
            where: { user_id: req.userId, status: 'Ready' }
        });

        res.json({
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: totalRevenue - totalExpenses,
            stockAlerts: stockAlerts,
            recentSales: recentSales,
            salesCount: transactions.length,
            productionCount: productionCount
        });
    } catch (err) { next(err); }
});

// GESTIONNAIRE D'ERREURS GLOBAL
app.use((err, req, res, next) => {
    console.error("Erreur serveur:", err);
    res.status(500).json({
        error: "Erreur serveur local.",
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
