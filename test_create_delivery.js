import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsczhjixffzqymauewpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3poaml4ZmZ6cXltYXVld3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzOTYsImV4cCI6MjA4ODE1ODM5Nn0._dwIijjLu0koSghzoNvYpn3yoflK8vStcgsfpuXzMZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreateDelivery() {
    console.log("Testing delivery creation...");

    // 1. Get a product ID
    const { data: products } = await supabase.from('products').select('id').limit(1);
    if (!products || products.length === 0) {
        console.error("No products found to test with.");
        return;
    }
    const productId = products[0].id;
    console.log("Using Product ID:", productId);

    // 2. Insert Delivery
    const { data: delivery, error: delError } = await supabase.from('deliveries').insert([{
        destination: 'Test Destination',
        driver_name: 'Test Driver',
        status: 'Pending',
        recipient_name: 'Test Recipient',
        delivery_fee: 5000
    }]).select().single();

    if (delError) {
        console.error("Delivery Insert Error:", delError);
        return;
    }
    console.log("Delivery Inserted:", delivery.id);

    // 3. Insert Delivery Item
    const { error: itemError } = await supabase.from('delivery_items').insert([{
        delivery_id: delivery.id,
        product_id: productId,
        quantity: 1
    }]);

    if (itemError) {
        console.error("Delivery Item Insert Error:", itemError);
    } else {
        console.log("Delivery Item Inserted successfully!");
    }
}

testCreateDelivery();
