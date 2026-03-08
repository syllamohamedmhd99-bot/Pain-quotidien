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
    Truck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Expenses.css';

export default function Expenses({ profile }) {
    const isAdmin = profile?.role === 'Administrateur';

    const [expenses, setExpenses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        category: 'Fournitures',
        amount: '',
        description: '',
        supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        payment_mode: 'Espèce',
        payment_details: ''
    });

    const categories = [
        'Fournitures',
        'Loyer',
        'Électricité/Eau',
        'Marketing',
        'Maintenance',
        'Autre'
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [expRes, suppRes] = await Promise.all([
                supabase.from('expenses').select('*, suppliers(name)'),
                supabase.from('suppliers').select('id, name')
            ]);

            if (expRes.data) setExpenses(expRes.data);
            if (suppRes.data) setSuppliers(suppRes.data);
        } catch (error) {
            console.error("Erreur lors du chargement des dépenses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                category: formData.category,
                amount: parseFloat(formData.amount),
                description: formData.description,
                supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
                date: new Date(formData.date).toISOString(),
                user_id: user?.id,
                payment_mode: formData.payment_mode,
                payment_details: formData.payment_details || null
            };

            const { data, error } = await supabase.from('expenses').insert([payload]);

            if (error) {
                alert("Erreur lors de l'enregistrement: " + error.message);
                throw error;
            }

            if (!error) {
                setIsModalOpen(false);
                setFormData({
                    category: 'Fournitures',
                    amount: '',
                    description: '',
                    supplier_id: '',
                    date: new Date().toISOString().split('T')[0],
                    payment_mode: 'Espèce',
                    payment_details: ''
                });
                fetchData();
            }
        } catch (error) {
            console.error("Erreur lors de l'ajout de la dépense:", error);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (window.confirm("Voulez-vous vraiment supprimer cette dépense ?")) {
            try {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (!error) fetchData();
            } catch (error) {
                console.error("Erreur lors de la suppression:", error);
            }
        }
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return (
        <div className="expenses-page">
            <div className="page-header">
                <div>
                    <h1>Autres Charges</h1>
                    <p>Suivez vos sorties d'argent et paiements fournisseurs.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Nouvelle Dépense
                </button>
            </div>

            <div className="expenses-overview card glass">
                <div className="overview-item">
                    <div className="overview-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <span className="overview-label">Total des Dépenses</span>
                        <h2 className="overview-value text-danger">{totalAmount.toLocaleString()} GNF</h2>
                    </div>
                </div>
            </div>

            <div className="filters-section card">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher une dépense..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-actions">
                    <button className="btn-outline">
                        <Filter size={18} />
                        Filtres
                    </button>
                </div>
            </div>

            <div className="expenses-list card">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Catégorie</th>
                            <th>Description</th>
                            <th>Fournisseur</th>
                            <th>Paiement</th>
                            <th>Montant</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map((exp) => (
                            <tr key={exp.id}>
                                <td>{new Date(exp.date).toLocaleDateString()}</td>
                                <td>
                                    <span className={`category-pill cat-${exp.category.toLowerCase().replace(/\//g, '-')}`}>
                                        {exp.category}
                                    </span>
                                </td>
                                <td>{exp.description || '-'}</td>
                                <td>{exp.suppliers?.name || 'Aucun'}</td>
                                <td>
                                    <span className="badge badge-outline" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', opacity: 0.8 }}>
                                        {exp.payment_mode}
                                    </span>
                                </td>
                                <td className="text-danger" style={{ fontWeight: 'bold' }}>
                                    {exp.amount.toLocaleString()} GNF
                                </td>
                                <td>
                                    {isAdmin && (
                                        <button className="delete-btn" onClick={() => handleDeleteExpense(exp.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredExpenses.length === 0 && (
                    <div className="empty-state">
                        <p>Aucune dépense trouvée.</p>
                    </div>
                )}
            </div>

            {/* Modal Ajout Dépense */}
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
                                <h2>Ajouter une Dépense</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleAddExpense}>
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
                                    <label>Fournisseur (Optionnel)</label>
                                    <select
                                        value={formData.supplier_id}
                                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                    >
                                        <option value="">-- Sélectionner un fournisseur --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
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
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
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
