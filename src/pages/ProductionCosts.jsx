import { useState, useEffect } from 'react';
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
    Wheat
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ProductionCosts.css';

export default function ProductionCosts() {
    const [costs, setCosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        category: 'Matière Première',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const categories = [
        'Matière Première',
        'Énergie/Gaz',
        'Livraison',
        'Emballage',
        'Maintenance Four',
        'Main d''œuvre Production',
        'Autre'
    ];

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
                user_id: user?.id
            };

            const { data, error } = await supabase.from('production_costs').insert([payload]);

            if (!error) {
                setIsModalOpen(false);
                setFormData({
                    category: 'Matière Première',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                });
                fetchData();
            }
        } catch (error) {
            console.error("Erreur lors de l'ajout de la charge:", error);
        }
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

    const filteredCosts = costs.filter(cost =>
        cost.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cost.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = filteredCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);

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

            <div className="costs-overview card glass">
                <div className="overview-item">
                    <div className="overview-icon" style={{ backgroundColor: 'rgba(212, 163, 115, 0.1)', color: 'var(--primary-color)' }}>
                        <Flame size={24} />
                    </div>
                    <div>
                        <span className="overview-label">Total Charges Production</span>
                        <h2 className="overview-value">{totalAmount.toLocaleString()} GNF</h2>
                    </div>
                </div>
            </div>

            <div className="filters-section card">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher une charge..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                                    <td className="amount-cell">
                                        {cost.amount.toLocaleString()} GNF
                                    </td>
                                    <td>
                                        <button className="delete-btn" onClick={() => handleDeleteCost(cost.id)}>
                                            <Trash2 size={16} />
                                        </button>
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

            {/* Modal Ajout Charge */}
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
                                <h2>Ajouter une Charge de Production</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
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
                                <div className="form-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">Enregistrer</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
