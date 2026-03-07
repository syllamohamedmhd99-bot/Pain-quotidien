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
    ArrowRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Deliveries.css';

export default function Deliveries() {
    const [deliveries, setDeliveries] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tous');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        destination: '',
        driver_name: '',
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'Pending'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [delRes, trxRes] = await Promise.all([
                supabase.from('deliveries').select('*, transactions(*)').order('created_at', { ascending: false }),
                supabase.from('transactions').select('*').eq('type', 'Vente').order('date', { ascending: false })
            ]);

            if (delRes.data) setDeliveries(delRes.data);
            if (trxRes.data) setTransactions(trxRes.data);
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
            await supabase.from('deliveries').insert([formData]);
            setIsModalOpen(false);
            setFormData({ destination: '', driver_name: '', delivery_date: new Date().toISOString().split('T')[0], status: 'Pending' });
            fetchData();
        } catch (err) {
            console.error("Error creating delivery:", err);
        }
    };

    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const matchesSearch = d.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.transactions?.trx_id?.toLowerCase().includes(searchTerm.toLowerCase());
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

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Pending': return 'En attente';
            case 'Out': return 'En cours';
            case 'Delivered': return 'Livré';
            default: return status;
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
                                            <span className="trx-id">{d.transactions?.trx_id || 'N/A'}</span>
                                            <span className="date">{new Date(d.delivery_date || d.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="destination">
                                            <MapPin size={16} />
                                            {d.destination || 'Destination non spécifiée'}
                                        </h3>
                                        <div className="driver">
                                            <User size={14} />
                                            <span>Chauffeur: {d.driver_name || 'Non assigné'}</span>
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
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">Créer</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
