import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Trash2,
    Calendar,
    User,
    DollarSign,
    CheckCircle,
    Clock,
    X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Salaries.css';

export default function Salaries() {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        employee_name: '',
        amount: '',
        period: '',
        status: 'Payé',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('salaries')
                .select('*')
                .order('date', { ascending: false });

            if (data) setSalaries(data);
        } catch (error) {
            console.error("Erreur lors du chargement des salaires:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSalary = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                employee_name: formData.employee_name,
                amount: parseFloat(formData.amount),
                period: formData.period,
                status: formData.status,
                date: new Date(formData.date).toISOString()
            };

            const { error } = await supabase.from('salaries').insert([payload]);

            if (!error) {
                setIsModalOpen(false);
                setFormData({
                    employee_name: '',
                    amount: '',
                    period: '',
                    status: 'Payé',
                    date: new Date().toISOString().split('T')[0]
                });
                fetchData();
            }
        } catch (error) {
            console.error("Erreur lors de l'ajout du salaire:", error);
        }
    };

    const handleDeleteSalary = async (id) => {
        if (window.confirm("Supprimer ce paiement ?")) {
            await supabase.from('salaries').delete().eq('id', id);
            fetchData();
        }
    };

    const filteredSalaries = useMemo(() => {
        return salaries.filter(s =>
            s.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.period.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [salaries, searchTerm]);

    const totalPaid = salaries.reduce((sum, s) => sum + (s.status === 'Payé' ? s.amount : 0), 0);

    return (
        <div className="salaries-page">
            <div className="page-header">
                <div>
                    <h1>Salaires des Employés</h1>
                    <p>Gérez les paiements mensuels et les acomptes.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Nouveau Paiement
                </button>
            </div>

            <div className="salaries-overview card glass">
                <div className="overview-item">
                    <div className="overview-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <span className="overview-label">Total Payé (Global)</span>
                        <h2 className="overview-value text-success">{totalPaid.toLocaleString()} GNF</h2>
                    </div>
                </div>
            </div>

            <div className="filters-section card glass">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un employé ou une période..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="salaries-list card">
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Employé</th>
                                <th>Période</th>
                                <th>Montant</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSalaries.map((s) => (
                                <tr key={s.id}>
                                    <td>{new Date(s.date).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={16} />
                                            {s.employee_name}
                                        </div>
                                    </td>
                                    <td>{s.period}</td>
                                    <td style={{ fontWeight: 'bold' }}>{s.amount.toLocaleString()} GNF</td>
                                    <td>
                                        <span className={s.status === 'Payé' ? 'status-paid' : 'status-pending'}>
                                            {s.status === 'Payé' ? <CheckCircle size={12} /> : <Clock size={12} />}
                                            {s.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="delete-btn" onClick={() => handleDeleteSalary(s.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay">
                        <motion.div className="modal-content card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                            <div className="modal-header">
                                <h2>Nouveau Paiement</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleAddSalary}>
                                <div className="form-group">
                                    <label>Nom de l'employé</label>
                                    <input required type="text" value={formData.employee_name} onChange={e => setFormData({ ...formData, employee_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Montant (GNF)</label>
                                    <input required type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Période (ex: Mars 2024)</label>
                                    <input required type="text" value={formData.period} onChange={e => setFormData({ ...formData, period: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Statut</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Payé">Payé</option>
                                        <option value="En attente">En attente</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
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
