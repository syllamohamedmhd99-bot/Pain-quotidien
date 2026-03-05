import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, ArrowLeft, User, Package, Calculator, Receipt } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CreateInvoice.css';

export default function CreateInvoice() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedClient, setSelectedClient] = useState("");
    const [items, setItems] = useState([{ name: "", quantity: 1, price: 0 }]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientsRes, productsRes] = await Promise.all([
                    supabase.from('clients').select('id, name').order('name'),
                    supabase.from('products').select('id, name, price, stock').order('name')
                ]);

                if (clientsRes.error) throw clientsRes.error;
                if (productsRes.error) throw productsRes.error;

                setClients(clientsRes.data || []);
                setProducts(productsRes.data || []);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const addItem = () => {
        setItems([...items, { name: "", quantity: 1, price: 0, productId: null }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // If selecting a product from the list (by name match or selection if I added a dropdown)
        if (field === "name") {
            const product = products.find(p => p.name === value);
            if (product) {
                newItems[index].price = product.price;
                newItems[index].productId = product.id;
            }
        }

        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setSubmitting(true);
        const trxId = `FACT-${Date.now().toString().slice(-6)}`;
        const totalAmount = calculateTotal();

        try {
            // 1. Insert Transaction
            const { data: trxData, error: trxError } = await supabase
                .from('transactions')
                .insert([{
                    trx_id: trxId,
                    type: "Vente",
                    client_id: selectedClient === "passage" || !selectedClient ? null : selectedClient,
                    total_amount: totalAmount,
                    tax: 0,
                    status: "Succès",
                    description: `Facture manuelle ${trxId}`
                }])
                .select()
                .single();

            if (trxError) throw trxError;

            // 2. Insert Items
            const itemsToInsert = items.map(item => ({
                transaction_id: trxData.id,
                product_id: item.productId, // Can be null for manual items
                quantity: item.quantity,
                unit_price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            navigate(`/invoice/${trxData.id}`);
        } catch (error) {
            console.error("Error creating invoice:", error);
            alert("Erreur lors de l'enregistrement : " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="create-invoice-page">
            <div className="page-header">
                <div>
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} /> Retour
                    </button>
                    <h1>Enregistrement Manuel d'Encaissement</h1>
                    <p>Remplissez les détails pour générer une preuve de paiement.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="invoice-form card glass">
                <div className="form-section">
                    <h3><User size={18} /> Client / Payeur</h3>
                    <div className="form-group">
                        <label>Sélectionner le Client</label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="select-input full-width"
                        >
                            <option value="">-- Choisir un client --</option>
                            <option value="passage">Client au passage</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-section">
                    <h3><Package size={18} /> Produits / Services</h3>
                    <div className="items-list">
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Désignation</th>
                                    <th style={{ width: '120px' }}>Quantité</th>
                                    <th style={{ width: '180px' }}>Prix Unitaire (GNF)</th>
                                    <th style={{ width: '180px' }}>Total</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                list="products-list"
                                                value={item.name}
                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                placeholder="Nom du produit ou description"
                                                required
                                            />
                                            <datalist id="products-list">
                                                {products.map(p => (
                                                    <option key={p.id} value={p.name} />
                                                ))}
                                            </datalist>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                                required
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                                                required
                                            />
                                        </td>
                                        <td className="item-total">
                                            {(item.quantity * item.price).toLocaleString()} GNF
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn-remove"
                                                onClick={() => removeItem(index)}
                                                disabled={items.length === 1}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button type="button" className="btn btn-outline btn-add-item" onClick={addItem}>
                            <Plus size={16} /> Ajouter une ligne
                        </button>
                    </div>
                </div>

                <div className="form-footer">
                    <div className="totals-summary">
                        <div className="total-row">
                            <span><Calculator size={18} /> Total à payer :</span>
                            <span className="grand-total">{calculateTotal().toLocaleString()} GNF</span>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? "Génération..." : (
                                <>
                                    <Save size={18} /> Enregistrer et Valider
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
