import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Timer, CheckCircle, Play, Trash2, Plus, AlertCircle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Production.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Production() {
    const [productionLogs, setProductionLogs] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBatch, setNewBatch] = useState({ product_name: '', quantity: 10, status: 'Pending' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, logRes] = await Promise.all([
                supabase.from('products').select('*'),
                supabase.from('production_logs').select('*').order('created_at', { ascending: false })
            ]);

            if (prodRes.data) setProducts(prodRes.data);
            if (logRes.data) setProductionLogs(logRes.data);
        } catch (error) {
            console.error("Erreur de récupération:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBatch = async (e) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('production_logs')
                .insert([newBatch])
                .select();

            if (data) {
                setProductionLogs([data[0], ...productionLogs]);
                setIsModalOpen(false);
                setNewBatch({ product_name: '', quantity: 10, status: 'Pending' });
            }
        } catch (error) {
            console.error("Erreur d'ajout:", error);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            // If status becomes "Ready", we should update the actual product stock
            if (newStatus === 'Ready') {
                const batch = productionLogs.find(l => l.id === id);
                const product = products.find(p => p.name === batch.product_name);

                if (product) {
                    await supabase
                        .from('products')
                        .update({ stock: (product.stock || 0) + batch.quantity })
                        .eq('id', product.id);
                }
            }

            const { data, error } = await supabase
                .from('production_logs')
                .update({ status: newStatus, updated_at: new Date() })
                .eq('id', id)
                .select();

            if (data) {
                setProductionLogs(productionLogs.map(log => log.id === id ? data[0] : log));
                if (newStatus === 'Ready') fetchData(); // Refresh products too
            }
        } catch (error) {
            console.error("Erreur de mise à jour:", error);
        }
    };

    const deleteBatch = async (id) => {
        if (!window.confirm("Supprimer ce lot de production ?")) return;
        try {
            await supabase.from('production_logs').delete().eq('id', id);
            setProductionLogs(productionLogs.filter(log => log.id !== id));
        } catch (error) {
            console.error("Erreur de suppression:", error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending': return <span className="badge badge-warning">En Attente</span>;
            case 'In Oven': return <span className="badge" style={{ backgroundColor: 'rgba(239, 108, 0, 0.1)', color: '#ef6c00' }}>Au Four</span>;
            case 'Ready': return <span className="badge badge-success">Prêt</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <div className="production-page">
            <div className="dashboard-header">
                <div>
                    <h1>Gestion de Production</h1>
                    <p>Suivez ce qui est au four et gérez vos fournées en temps réel.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} />
                    Nouvelle Fournée
                </button>
            </div>

            {loading ? (
                <div className="loading">Chargement...</div>
            ) : (
                <motion.div
                    className="production-grid"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {productionLogs.length === 0 ? (
                        <div className="card glass empty-state">
                            <ChefHat size={48} opacity={0.3} />
                            <p>Aucune production en cours. Commencez une nouvelle fournée !</p>
                        </div>
                    ) : (
                        productionLogs.map((log) => (
                            <motion.div key={log.id} className="card glass production-card" variants={itemVariants}>
                                <div className="production-card-header">
                                    <div>
                                        <h3>{log.product_name}</h3>
                                        <p className="quantity">{log.quantity} pièces</p>
                                    </div>
                                    {getStatusBadge(log.status)}
                                </div>

                                <div className="production-card-body">
                                    <div className="timer-info">
                                        <Timer size={16} />
                                        <span>Lancé le {new Date(log.created_at).toLocaleTimeString()}</span>
                                    </div>

                                    <div className="status-timeline">
                                        <div className={`step ${log.status === 'Pending' ? 'active' : 'completed'}`}></div>
                                        <div className={`step ${log.status === 'In Oven' ? 'active' : log.status === 'Ready' ? 'completed' : ''}`}></div>
                                        <div className={`step ${log.status === 'Ready' ? 'active' : ''}`}></div>
                                    </div>
                                </div>

                                <div className="production-card-actions">
                                    {log.status === 'Pending' && (
                                        <button className="btn btn-secondary btn-small" onClick={() => updateStatus(log.id, 'In Oven')}>
                                            <Play size={14} /> Mettre au four
                                        </button>
                                    )}
                                    {log.status === 'In Oven' && (
                                        <button className="btn btn-primary btn-small" onClick={() => updateStatus(log.id, 'Ready')}>
                                            <CheckCircle size={14} /> Marquer comme Prêt
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button className="btn-icon text-danger" onClick={() => deleteBatch(log.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content card glass"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h2>Nouvelle Fournée</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleAddBatch}>
                                <div className="form-group">
                                    <label>Produit</label>
                                    <select
                                        required
                                        value={newBatch.product_name}
                                        onChange={(e) => setNewBatch({ ...newBatch, product_name: e.target.value })}
                                    >
                                        <option value="">Sélectionner un produit</option>
                                        {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Quantité</label>
                                    <input
                                        type="number"
                                        required
                                        value={newBatch.quantity}
                                        onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">Lancer la Production</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
