
const axios = require('axios');

async function test() {
    const baseUrl = 'http://localhost:8080/api';
    const productId = 12; // From previous check

    try {
        // 1. Get initial stock
        const p1 = await axios.get(`${baseUrl}/products`);
        const product = p1.data.find(p => p.id === productId);
        console.log(`Initial stock for ${product.name}: ${product.stock}`);

        // 2. Create a transaction
        console.log("Creating transaction (sold 1 unit)...");
        const trxPayload = {
            type: "Vente",
            totalAmount: 1000,
            description: "Test Cancellation",
            items: [
                { productId: productId, quantity: 1, unitPrice: 1000 }
            ]
        };
        const resTrx = await axios.post(`${baseUrl}/transactions`, trxPayload);
        const trxId = resTrx.data.id;
        console.log(`Transaction created with ID: ${trxId}`);

        // 3. Check stock after sale
        const p2 = await axios.get(`${baseUrl}/products`);
        const productAfterSale = p2.data.find(p => p.id === productId);
        console.log(`Stock after sale: ${productAfterSale.stock}`);

        // 4. Cancel (Delete) transaction
        console.log(`Cancelling transaction ${trxId}...`);
        await axios.delete(`${baseUrl}/transactions/${trxId}`);

        // 5. Check stock after cancellation
        const p3 = await axios.get(`${baseUrl}/products`);
        const productAfterCancel = p3.data.find(p => p.id === productId);
        console.log(`Stock after cancellation: ${productAfterCancel.stock}`);

        if (productAfterCancel.stock === product.stock) {
            console.log("SUCCESS: Stock was successfully restored!");
        } else {
            console.log("FAILURE: Stock was NOT restored.");
        }

    } catch (err) {
        console.error("Test failed:", err.response ? err.response.data : err.message);
    }
}

test();
