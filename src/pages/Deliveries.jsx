import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck,
    Package,
    CheckCircle2,
    Clock,
    MapPin,
    User,
    Search,
    Filter,
    ChevronRight,
    ArrowRight,
    Plus,
    X,
    ClipboardList,
    Printer,
    FileText,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Deliveries.css';

export default function Deliveries() {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tous');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [currentDeliveryItems, setCurrentDeliveryItems] = useState([]);
    const [formData, setFormData] = useState({
        destination: '',
        driver_name: '',
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        delivery_fee: 0,
        recipient_name: '',
        observation: '',
        items: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [delRes, trxRes, prodRes] = await Promise.all([
                supabase.from('deliveries').select('*, transactions(*), delivery_items(quantity, products(name))').order('created_at', { ascending: false }),
                supabase.from('transactions').select('*').eq('type', 'Vente').order('date', { ascending: false }),
                supabase.from('products').select('*').order('name')
            ]);

            let delData = delRes.data;
            if (delRes.error) {
                console.warn("Fetch with items failed, trying fallback:", delRes.error.message);
                const { data: fallbackData } = await supabase.from('deliveries').select('*, transactions(*)').order('created_at', { ascending: false });
                delData = fallbackData;
            }

            if (delData) setDeliveries(delData);
            if (trxRes.data) setTransactions(trxRes.data);
            if (prodRes.data) setProducts(prodRes.data);
        } catch (err) {
            console.error("Error fetching deliveries:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await supabase.from('deliveries').update({ status: newStatus }).eq('id', id);
            fetchData();
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleCreateDelivery = async (e) => {
        e.preventDefault();
        try {
            const { data: newDel, error: delError } = await supabase.from('deliveries').insert([
                {
                    destination: formData.destination,
                    driver_name: formData.driver_name,
                    delivery_date: formData.delivery_date,
                    status: formData.status,
                    delivery_fee: formData.delivery_fee,
                    recipient_name: formData.recipient_name,
                    observation: formData.observation
                }
            ]).select().single();

            if (delError) throw delError;

            if (newDel && formData.items.length > 0) {
                const itemsToSave = formData.items
                    .filter(it => it.product_id && it.quantity && !isNaN(parseFloat(it.quantity)))
                    .map(it => ({
                        delivery_id: newDel.id,
                        product_id: parseInt(it.product_id),
                        quantity: parseFloat(it.quantity)
                    }));
                if (itemsToSave.length > 0) {
                    const { error: itemsError } = await supabase.from('delivery_items').insert(itemsToSave);
                    if (itemsError) {
                        console.error("Error creating delivery items:", itemsError);
                        alert("La livraison a été créée mais certains articles n'ont pas pu être enregistrés.");
                    }
                }
            }

            setIsModalOpen(false);
            setFormData({ destination: '', driver_name: '', delivery_date: new Date().toISOString().split('T')[0], status: 'Pending', delivery_fee: 0, recipient_name: '', observation: '', items: [] });
            fetchData();
            alert("Livraison créée avec succès !");
        } catch (err) {
            console.error("Error creating delivery:", err);
            alert("Erreur lors de la création de la livraison: " + err.message);
        }
    };

    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const trx = Array.isArray(d.transactions) ? d.transactions[0] : d.transactions;
            const matchesSearch = d.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trx?.trx_id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'Tous' || d.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [deliveries, searchTerm, statusFilter]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending': return <Clock size={18} />;
            case 'Out': return <Truck size={18} />;
            case 'Delivered': return <CheckCircle2 size={18} />;
            default: return <Package size={18} />;
        }
    };

    const deleteDelivery = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette livraison ?")) return;
        try {
            await supabase.from('deliveries').delete().eq('id', id);
            fetchData();
        } catch (err) {
            console.error("Error deleting delivery:", err);
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Pending': return 'En attente';
            case 'Out': return 'En cours';
            case 'Delivered': return 'Livré';
            default: return status;
        }
    };

    const openItemsModal = async (delivery) => {
        setSelectedDelivery(delivery);
        const { data } = await supabase.from('delivery_items').select('*, products(name)').eq('delivery_id', delivery.id);
        setCurrentDeliveryItems(data || []);
        setIsItemsModalOpen(true);
    };

    const handleAddItem = () => {
        setCurrentDeliveryItems([...currentDeliveryItems, { product_id: '', quantity: 1, products: { name: '' } }]);
    };

    const handleRemoveItem = (index) => {
        setCurrentDeliveryItems(currentDeliveryItems.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const newItems = [...currentDeliveryItems];
        if (field === 'product_id') {
            const prod = products.find(p => p.id === parseInt(value));
            newItems[index] = { ...newItems[index], product_id: value, products: { name: prod ? prod.name : '' } };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setCurrentDeliveryItems(newItems);
    };

    const saveDeliveryItems = async () => {
        try {
            await supabase.from('delivery_items').delete().eq('delivery_id', selectedDelivery.id);
            const itemsToSave = currentDeliveryItems
                .filter(it => it.product_id && it.quantity && !isNaN(parseFloat(it.quantity)))
                .map(it => ({
                    delivery_id: selectedDelivery.id,
                    product_id: parseInt(it.product_id),
                    quantity: parseFloat(it.quantity)
                }));

            if (itemsToSave.length > 0) {
                await supabase.from('delivery_items').insert(itemsToSave);
            }
            setIsItemsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Error saving items:", err);
        }
    };

    return (
        <div className="deliveries-page">
            <div className="page-header">
                <div>
                    <h1>Suivi de Livraison</h1>
                    <p>Gérez l'expédition et la réception de vos commandes clients.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Nouvelle Livraison
                </button>
            </div>

            <div className="controls-row card glass">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher une destination, chauffeur ou commande..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filters">
                    {['Tous', 'Pending', 'Out', 'Delivered'].map(s => (
                        <button
                            key={s}
                            className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === 'Tous' ? 'Tout' : getStatusLabel(s)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="loading">Chargement...</div>
            ) : (
                <div className="deliveries-list">
                    {filteredDeliveries.length === 0 ? (
                        <div className="empty-state card glass">
                            <Truck size={48} opacity={0.2} />
                            <p>Aucune livraison trouvée.</p>
                        </div>
                    ) : (
                        filteredDeliveries.map(d => (
                            <motion.div key={d.id} className={`delivery-item card glass status-${d.status.toLowerCase()}`} layout>
                                <div className="delivery-main">
                                    <div className="delivery-status-icon">
                                        {getStatusIcon(d.status)}
                                    </div>
                                    <div className="delivery-info">
                                        <div className="delivery-header-info">
                                            <span className="trx-id">{(Array.isArray(d.transactions) ? d.transactions[0] : d.transactions)?.trx_id || (d.transaction_id ? 'Ref' : 'N/A')}</span>
                                            <span className="date">{new Date(d.delivery_date || d.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="destination">
                                            <MapPin size={16} />
                                            {d.destination || 'Destination non spécifiée'}
                                        </h3>
                                        <div className="recipient" style={{ marginBottom: '0.4rem', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={14} />
                                            <span>Destinataire: {d.recipient_name || 'Inconnu'}</span>
                                        </div>
                                        <div className="driver">
                                            <User size={14} />
                                            <span>Chauffeur: {d.driver_name || 'Non assigné'}</span>
                                        </div>
                                        <div className="delivery-fee" style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>Prix: {d.delivery_fee?.toLocaleString() || 0} GNF</span>
                                            {d.delivery_items && d.delivery_items.length > 0 && (
                                                <div className="items-summary" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                    <Package size={14} />
                                                    {d.delivery_items.map((it, idx) => (
                                                        <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                            {it.quantity} {it.products?.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="delivery-stepper">
                                    <div className={`step ${['Pending', 'Out', 'Delivered'].includes(d.status) ? 'active' : ''} ${d.status !== 'Pending' ? 'completed' : ''}`}>
                                        <div className="dot"></div>
                                        <span className="label">Préparé</span>
                                    </div>
                                    <div className="line"></div>
                                    <div className={`step ${['Out', 'Delivered'].includes(d.status) ? 'active' : ''} ${d.status === 'Delivered' ? 'completed' : ''}`}>
                                        <div className="dot"></div>
                                        <span className="label">En route</span>
                                    </div>
                                    <div className="line"></div>
                                    <div className={`step ${d.status === 'Delivered' ? 'active completed' : ''}`}>
                                        <div className="dot"></div>
                                        <span className="label">Livré</span>
                                    </div>
                                </div>

                                <div className="delivery-actions">
                                    {d.status === 'Pending' && (
                                        <button className="btn btn-primary" onClick={() => updateStatus(d.id, 'Out')}>
                                            Lancer la livraison <ArrowRight size={16} />
                                        </button>
                                    )}
                                    {d.status === 'Out' && (
                                        <button className="btn btn-success" onClick={() => updateStatus(d.id, 'Delivered')}>
                                            Confirmer la réception <CheckCircle2 size={16} />
                                        </button>
                                    )}
                                    {d.status === 'Delivered' && (
                                        <div className="delivered-badge">
                                            <CheckCircle2 size={16} /> Livré avec succès
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => openItemsModal(d)} title="Gérer les produits" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <ClipboardList size={14} /> Articles
                                        </button>
                                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/delivery-note/${d.id}`)} title="Imprimer le bon de livraison" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Printer size={14} /> Bon
                                        </button>
                                        <button className="btn btn-outline btn-sm btn-delete" onClick={() => deleteDelivery(d.id)} title="Supprimer la livraison" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content card"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h2>Créer une Livraison Manuelle</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleCreateDelivery}>
                                <div className="form-group">
                                    <label>Nom du Destinataire</label>
                                    <input
                                        type="text"
                                        value={formData.recipient_name}
                                        onChange={e => setFormData({ ...formData, recipient_name: e.target.value })}
                                        placeholder="ex: M. Sylla"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Destination / Adresse</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.destination}
                                        onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                        placeholder="ex: Quartier Kaloum, Immeuble X"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nom du Chauffeur</label>
                                        <input
                                            type="text"
                                            value={formData.driver_name}
                                            onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Date de Livraison</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.delivery_date}
                                            onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Prix de Livraison (GNF)</label>
                                        <input
                                            type="number"
                                            value={formData.delivery_fee}
                                            onChange={e => setFormData({ ...formData, delivery_fee: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Package size={18} /> Articles livrés
                                    </h3>
                                    <div className="items-selector" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {formData.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                                <select
                                                    value={item.product_id}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items];
                                                        newItems[idx].product_id = e.target.value;
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                >
                                                    <option value="">Produit...</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items];
                                                        newItems[idx].quantity = e.target.value;
                                                        setFormData({ ...formData, items: newItems });
                                                    }}
                                                    style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                    placeholder="Qté"
                                                />
                                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: 1 }] })}>
                                            <Plus size={14} /> Ajouter un article
                                        </button>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">Créer</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
                {isItemsModalOpen && (
                    <div className="modal-overlay">
                        <motion.div className="modal-content card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <h2>Produits de la Livraison</h2>
                                <button className="close-btn" onClick={() => setIsItemsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <div className="items-editor" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                                {currentDeliveryItems.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5 }}>Aucun article. Ajoutez-en un !</p>}
                                {currentDeliveryItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        <select
                                            value={item.product_id}
                                            onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                                            style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="">Sélectionner un produit</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                            style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            placeholder="Qté"
                                        />
                                        <button className="btn btn-outline" onClick={() => handleRemoveItem(idx)} style={{ padding: '10px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button className="btn btn-outline" onClick={handleAddItem} style={{ width: '100%', marginTop: '10px', borderStyle: 'dashed' }}>
                                    <Plus size={16} /> Ajouter un produit
                                </button>
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-outline" onClick={() => setIsItemsModalOpen(false)}>Annuler</button>
                                <button className="btn btn-primary" onClick={saveDeliveryItems}>Enregistrer les articles</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
