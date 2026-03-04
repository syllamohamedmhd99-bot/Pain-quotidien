require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding local database for multiple users...');

    // 1. Produits pour Admin
    const adminProducts = [
        { name: "Pain au chocolat (Admin)", category: "Viennoiseries", price: 10000, stock: 45, status: "En stock", user_id: "admin@boulangerie.local" },
        { name: "Baguette (Admin)", category: "Pains", price: 5000, stock: 120, status: "En stock", user_id: "admin@boulangerie.local" }
    ];

    // 2. Produits pour Test User
    const testProducts = [
        { name: "Pain au chocolat (Test)", category: "Viennoiseries", price: 10000, stock: 20, status: "En stock", user_id: "test@boulangerie.local" },
        { name: "Baguette (Test)", category: "Pains", price: 5000, stock: 10, status: "En stock", user_id: "test@boulangerie.local" }
    ];

    for (const p of [...adminProducts, ...testProducts]) {
        await prisma.product.create({ data: p });
    }

    // 3. Clients pour Admin
    await prisma.client.create({
        data: { name: "Client de l'Admin", email: "admin-client@example.com", user_id: "admin@boulangerie.local" }
    });

    // 4. Clients pour Test
    await prisma.client.create({
        data: { name: "Client de Test", email: "test-client@example.com", user_id: "test@boulangerie.local" }
    });

    console.log('Seed multi-utilisateurs terminé !');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
