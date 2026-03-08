import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    Plus,
    Search,
    Filter,
    Trash2,
    Calendar,
    Tag,
    FileText,
    Truck,
    Flame,
    Package,
    Wheat,
    Edit2,
    X,
    ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ProductionCosts.css';

export default function ProductionCosts() {
    const [costs, setCosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Toutes');
    const [dateFilter, setDateFilter] = useState('Tous');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState(null);
    const [formData, setFormData] = useState({
        category: 'Matière Première',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_mode: 'Espèce',
        payment_details: ''
    });

    const categories = [
        'Matière Première',
        'Énergie/Gaz',
        'Livraison',
        'Emballage',
        'Maintenance Four',
        "Main d'œuvre Production",
        'Autre'
    ];

    const dateFilters = ['Tous', "Aujourd'hui", 'Cette Semaine', 'Ce Mois'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('production_costs')
                .select('*')
                .order('date', { ascending: false });

            if (data) setCosts(data);
        } catch (error) {
            console.error("Erreur lors du chargement des charges:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCost = async (e) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                category: formData.category,
                amount: parseFloat(formData.amount),
                description: formData.description,
                date: new Date(formData.date).toISOString(),
                user_id: user?.id,
                payment_mode: formData.payment_mode,
                payment_details: formData.payment_details || null
            };

            let error;
            if (editingCost) {
                const { error: updateError } = await supabase
                    .from('production_costs')
                    .update(payload)
                    .eq('id', editingCost.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('production_costs')
                    .insert([payload]);
                error = insertError;
            }

            if (!error) {
                closeModal();
                fetchData();
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de la charge:", error);
        }
    };

    const openEditModal = (cost) => {
        setEditingCost(cost);
        setFormData({
            category: cost.category,
            amount: cost.amount,
            description: cost.description || '',
            date: new Date(cost.date).toISOString().split('T')[0],
            payment_mode: cost.payment_mode || 'Espèce',
            payment_details: cost.payment_details || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCost(null);
        setFormData({
            category: 'Matière Première',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            payment_mode: 'Espèce',
            payment_details: ''
        });
    };

    const handleDeleteCost = async (id) => {
        if (window.confirm("Voulez-vous vraiment supprimer cette charge de production ?")) {
            try {
                const { error } = await supabase.from('production_costs').delete().eq('id', id);
                if (!error) fetchData();
            } catch (error) {
                console.error("Erreur lors de la suppression:", error);
            }
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Matière Première': return <Wheat size={18} />;
            case 'Énergie/Gaz': return <Flame size={18} />;
            case 'Livraison': return <Truck size={18} />;
            case 'Emballage': return <Package size={18} />;
            default: return <Tag size={18} />;
        }
    };

    const filteredCosts = useMemo(() => {
        return costs.filter(cost => {
            const matchesSearch = (cost.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cost.category.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = categoryFilter === 'Toutes' || cost.category === categoryFilter;

            let matchesDate = true;
            if (dateFilter !== 'Tous') {
                const costDate = new Date(cost.date);
                const now = new Date();
                if (dateFilter === 'Aujourd\'hui') {
                    matchesDate = costDate.toDateString() === now.toDateString();
                } else if (dateFilter === 'Cette Semaine') {
                    const weekAgo = new Date();
                    weekAgo.setDate(now.getDate() - 7);
                    matchesDate = costDate >= weekAgo;
                } else if (dateFilter === 'Ce Mois') {
                    matchesDate = costDate.getMonth() === now.getMonth() && costDate.getFullYear() === now.getFullYear();
                }
            }

            return matchesSearch && matchesCategory && matchesDate;
        });
    }, [costs, searchTerm, categoryFilter, dateFilter]);

    const totalAmount = filteredCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);

    const categoryBreakdown = useMemo(() => {
        const breakdown = {};
        categories.forEach(cat => breakdown[cat] = 0);
        filteredCosts.forEach(cost => {
            if (breakdown[cost.category] !== undefined) {
                breakdown[cost.category] += cost.amount;
            } else {
                breakdown['Autre'] = (breakdown['Autre'] || 0) + cost.amount;
            }
        });
        return breakdown;
    }, [filteredCosts, categories]);

    return (
        <div className="costs-page">
            <div className="page-header">
                <div>
                    <h1>Charges de Production</h1>
                    <p>Matières premières, gaz, livraison et autres coûts directs.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Nouvelle Charge
                </button>
            </div>

            <div className="costs-overview card glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div className="overview-item">
                    <div className="overview-icon" style={{ backgroundColor: 'rgba(212, 163, 115, 0.1)', color: 'var(--primary-color)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <span className="overview-label">Total Filtré</span>
                        <h2 className="overview-value">{totalAmount.toLocaleString()} GNF</h2>
                    </div>
                </div>

                <div className="category-breakdown">
                    {Object.entries(categoryBreakdown).map(([cat, amount]) => amount > 0 && (
                        <div key={cat} className="breakdown-item card glass">
                            <span className="breakdown-label">{getCategoryIcon(cat)} {cat}</span>
                            <span className="breakdown-value">{amount.toLocaleString()} GNF</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="filters-section card glass">
                <div className="search-bar" style={{ flex: 2 }}>
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher une charge..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <Filter size={18} />
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="Toutes">Toutes les catégories</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                <div className="filter-group">
                    <Calendar size={18} />
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                        {dateFilters.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
            </div>

            <div className="costs-list card">
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Catégorie</th>
                                <th>Description</th>
                                <th>Paiement</th>
                                <th>Montant</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCosts.map((cost) => (
                                <tr key={cost.id}>
                                    <td>{new Date(cost.date).toLocaleDateString()}</td>
                                    <td>
                                        <div className="category-cell">
                                            {getCategoryIcon(cost.category)}
                                            <span>{cost.category}</span>
                                        </div>
                                    </td>
                                    <td>{cost.description || '-'}</td>
                                    <td>
                                        <span className="badge badge-outline" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', opacity: 0.8 }}>
                                            {cost.payment_mode}
                                        </span>
                                    </td>
                                    <td className="amount-cell">
                                        {cost.amount.toLocaleString()} GNF
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex' }}>
                                            <button className="edit-btn" onClick={() => openEditModal(cost)}>
                                                <Edit2 size={16} />
                                            </button>
                                            {isAdmin && (
                                                <button className="delete-btn" onClick={() => handleDeleteCost(cost.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCosts.length === 0 && (
                    <div className="empty-state">
                        <p>Aucune charge trouvée.</p>
                    </div>
                )}
            </div>

            {/* Modal Ajout/Modif Charge */}
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
                                <h2>{editingCost ? 'Modifier la Charge' : 'Ajouter une Charge de Production'}</h2>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleAddCost}>
                                <div className="form-group">
                                    <label>Catégorie</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Montant (GNF)</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description (Farine, Gaz, Carburant...)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
                                        placeholder="Précisez la nature de la dépense..."
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Mode de Paiement</label>
                                    <select
                                        value={formData.payment_mode}
                                        onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                                    >
                                        {["Espèce", "Orange Money", "Virement bancaire", "Chèque", "Autre"].map(mode => (
                                            <option key={mode} value={mode}>{mode}</option>
                                        ))}
                                    </select>
                                </div>
                                {formData.payment_mode === "Autre" && (
                                    <div className="form-group">
                                        <label>Détails du paiement</label>
                                        <input
                                            type="text"
                                            placeholder="Précisez..."
                                            value={formData.payment_details}
                                            onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="form-actions">
                                    <button type="button" className="btn btn-outline" onClick={closeModal}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingCost ? 'Mettre à jour' : 'Enregistrer'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
