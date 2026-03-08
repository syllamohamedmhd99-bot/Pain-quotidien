import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Receipt } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './POS.css';

const posCategories = ["Tous", "Pains", "Viennoiseries", "Pâtisseries", "Boissons"];

export default function POS() {
    const navigate = useNavigate();
    const [posProducts, setPosProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [cart, setCart] = useState([]);
    const [filter, setFilter] = useState("Tous");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isCheckout, setIsCheckout] = useState(false);
    const [paymentMode, setPaymentMode] = useState("Espèce");
    const [paymentDetails, setPaymentDetails] = useState("");
    const [isDelivery, setIsDelivery] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [recipientName, setRecipientName] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, clientRes] = await Promise.all([
                    supabase.from('products').select('*').order('name'),
                    supabase.from('clients').select('*').order('name')
                ]);
                if (prodRes.data) setPosProducts(prodRes.data);
                if (clientRes.data) setClients(clientRes.data);
            } catch (error) {
                console.error("Failed to fetch pos data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredProducts = posProducts.filter(p => {
        const matchesCategory = filter === "Tous" || p.category === filter;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                if (typeof delta === 'string' || typeof delta === 'number' && delta >= 0) {
                    const newQty = typeof delta === 'number' ? item.qty + delta : parseInt(delta) || 0;
                    return newQty >= 0 ? { ...item, qty: newQty } : item;
                }
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    const clearCart = () => {
        setCart([]);
        setSelectedClientId("");
        setPaymentMode("Espèce");
        setPaymentDetails("");
        setIsDelivery(false);
        setDeliveryAddress("");
        setDeliveryFee(0);
        setRecipientName("");
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const grandTotal = total + (isDelivery ? parseFloat(deliveryFee || 0) : 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsCheckout(true);

        const trxId = `TRX-${Date.now().toString().slice(-6)}`;

        try {
            // 1. Insert Transaction
            const { data: trxData, error: trxError } = await supabase
                .from('transactions')
                .insert([{
                    trx_id: trxId,
                    type: "Vente",
                    total_amount: grandTotal,
                    tax: 0,
                    status: "Succès",
                    description: paymentMode === "Autre" && paymentDetails ? `Vente (${paymentDetails})` : `Vente (${paymentMode})`,
                    client_id: selectedClientId || null,
                    payment_mode: paymentMode,
                    payment_details: paymentDetails || null
                }])
                .select()
                .single();

            if (trxError) throw trxError;

            // 2. Insert Transaction Items
            const itemsToInsert = cart.map(item => ({
                transaction_id: trxData.id,
                product_id: item.id,
                quantity: item.qty,
                unit_price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // 2.5 Insert Delivery if requested
            if (isDelivery) {
                const { data: delRow, error: deliveryError } = await supabase
                    .from('deliveries')
                    .insert([{
                        transaction_id: trxData.id,
                        destination: deliveryAddress || (selectedClientId ? clients.find(c => c.id === parseInt(selectedClientId))?.address : null),
                        recipient_name: recipientName || (selectedClientId ? clients.find(c => c.id === parseInt(selectedClientId))?.name : null),
                        status: 'Pending',
                        delivery_fee: parseFloat(deliveryFee || 0),
                        delivery_date: new Date().toISOString().split('T')[0]
                    }])
                    .select()
                    .single();

                if (deliveryError) {
                    console.error("Could not create delivery record:", deliveryError);
                    alert("Attention: La vente a été enregistrée mais la livraison n'a pas pu être créée: " + deliveryError.message);
                } else if (delRow && cart.length > 0) {
                    // Create delivery items automatically
                    const deliveryItems = cart.map(item => ({
                        delivery_id: delRow.id,
                        product_id: item.id,
                        quantity: item.qty
                    }));
                    const { error: delItemsError } = await supabase.from('delivery_items').insert(deliveryItems);
                    if (delItemsError) {
                        console.error("Error creating delivery items:", delItemsError);
                    }
                }
            }

            // 3. Update Loyalty Points (1 point per 1000 GNF)
            if (selectedClientId) {
                const pointsEarned = Math.floor(grandTotal / 1000);
                if (pointsEarned > 0) {
                    const client = clients.find(c => c.id === parseInt(selectedClientId));
                    await supabase
                        .from('clients')
                        .update({ points: (client.points || 0) + pointsEarned })
                        .eq('id', selectedClientId);

                    alert(`Paiement validé ! +${pointsEarned} points de fidélité ajoutés.`);
                }
            } else {
                alert(`Paiement de ${grandTotal.toLocaleString('fr-FR')} GNF validé avec succès !`);
            }

            if (window.confirm("Voulez-vous imprimer la facture ?")) {
                navigate(`/invoice/${trxData.id}`);
            }

            clearCart();

            // Re-fetch products to update stock in UI
            const { data: updatedProducts } = await supabase.from('products').select('*');
            if (updatedProducts) setPosProducts(updatedProducts);

        } catch (error) {
            console.error(error);
            alert("Erreur lors de la transaction : " + (error.message || "Erreur inconnue"));
        } finally {
            setIsCheckout(false);
        }
    };

    return (
        <div className="pos-layout">
            {/* Left Side: Products Grid */}
            <div className="pos-products-section">
                <div className="pos-header">
                    <h1>Point de Vente</h1>
                    <div className="pos-search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pos-categories">
                    {posCategories.map(cat => (
                        <button
                            key={cat}
                            className={`cat-btn ${filter === cat ? 'active' : ''}`}
                            onClick={() => setFilter(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <motion.div className="pos-grid" layout>
                    <AnimatePresence>
                        {filteredProducts.map(product => (
                            <motion.div
                                key={product.id}
                                className="pos-item-card"
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => addToCart(product)}
                            >
                                <div className="pos-item-img">
                                    <img src={product.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"} alt={product.name} />
                                    <div className="pos-item-price">{product.price.toLocaleString('fr-FR')} GNF</div>
                                </div>
                                <div className="pos-item-name">{product.name}</div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Right Side: Cart / Ticket */}
            <div className="pos-cart-section glass card">
                <div className="cart-header">
                    <h2>Panier Courant</h2>
                    <span className="cart-count badge badge-warning">{cart.reduce((sum, item) => sum + item.qty, 0)} items</span>
                </div>

                {/* Client Selection */}
                <div className="client-selector" style={{ padding: '0 1.5rem 1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>CLIENT (FIDÉLITÉ)</label>
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                        <option value="">Client de passage</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.points || 0} pts)</option>
                        ))}
                    </select>
                </div>

                <div className="cart-items-container">
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <ShoppingCart size={48} />
                            <p>Le panier est vide</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {cart.map(item => (
                                <motion.div
                                    key={item.id}
                                    className="cart-item"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0, padding: 0, margin: 0 }}
                                >
                                    <div className="cart-item-info">
                                        <div className="cart-item-name">{item.name}</div>
                                        <div className="cart-item-price">{(item.price * item.qty).toLocaleString('fr-FR')} GNF</div>
                                    </div>

                                    <div className="cart-item-actions">
                                        <div className="qty-controls">
                                            <button className="qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button>
                                            <input
                                                type="number"
                                                className="qty-input"
                                                value={item.qty}
                                                onChange={(e) => updateQty(item.id, e.target.value)}
                                                min="0"
                                            />
                                            <button className="qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button>
                                            <span className="unit-label">{item.unit || (item.category === 'Pain' ? 'u' : 'kg')}</span>
                                        </div>
                                        <button className="delete-btn" onClick={() => removeFromCart(item.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                <div className="cart-summary">
                    <div className="summary-row grand-total">
                        <span>Total</span>
                        <span>{grandTotal.toLocaleString('fr-FR')} GNF</span>
                    </div>

                    {/* Mode de Paiement Selection */}
                    <div className="payment-mode-selector" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', pt: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.8rem', color: 'var(--text-secondary)' }}>MODE DE PAIEMENT</label>
                        <div className="payment-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {["Espèce", "Orange Money", "Virement bancaire", "Chèque", "Autre"].map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setPaymentMode(mode)}
                                    className={`btn ${paymentMode === mode ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        {paymentMode === "Autre" && (
                            <input
                                type="text"
                                placeholder="Précisez le mode (ex: Chèque...)"
                                value={paymentDetails}
                                onChange={(e) => setPaymentDetails(e.target.value)}
                                style={{ width: '100%', marginTop: '8px', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                            />
                        )}
                    </div>

                    {/* Options de Livraison */}
                    <div className="delivery-option-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                            <input
                                type="checkbox"
                                checked={isDelivery}
                                onChange={(e) => setIsDelivery(e.target.checked)}
                            />
                            <span>Marquer pour livraison ?</span>
                        </label>

                        {isDelivery && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                style={{ marginTop: '10px' }}
                            >
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>NOM DU DESTINATAIRE</label>
                                    <input
                                        type="text"
                                        placeholder="Nom complet du destinataire..."
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Adresse de livraison..."
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                />
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>FRAIS DE LIVRAISON (GNF)</label>
                                    <input
                                        type="number"
                                        placeholder="Prix de livraison..."
                                        value={deliveryFee}
                                        onChange={(e) => setDeliveryFee(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="cart-actions">
                    <button className="btn btn-outline clear-btn" onClick={clearCart} disabled={cart.length === 0 || isCheckout}>
                        <Trash2 size={18} /> Annuler
                    </button>
                    <button
                        className="btn btn-primary pay-btn encaisser-btn"
                        disabled={cart.length === 0 || isCheckout}
                        onClick={handleCheckout}
                        style={{ flex: 2 }}
                    >
                        <Receipt size={18} /> Encaisser
                    </button>
                </div>
            </div>
        </div>
    );
}

