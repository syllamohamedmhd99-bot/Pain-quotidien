import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Receipt, Eye, Printer, Calendar, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Invoices.css';

export default function Invoices() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("Tous");

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*, clients(name)')
                .eq('type', 'Vente')
                .order('date', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.trx_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.clients?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "Tous" || inv.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="invoices-page">
            <div className="page-header">
                <div>
                    <h1>Encaissements</h1>
                    <p>Gérez vos reçus de vente et suivez les paiements.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
                    <Plus size={18} /> Nouvel Encaissement
                </button>
            </div>

            <div className="invoices-controls card">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher par N° ou client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="btn-outline select-input"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="Tous">Tous les statuts</option>
                        <option value="Succès">Payé</option>
                        <option value="Attente">En attente</option>
                    </select>
                    <button className="btn btn-outline">
                        <Calendar size={18} /> Période
                    </button>
                    <button className="btn btn-outline">
                        <Download size={18} /> Exporter
                    </button>
                </div>
            </div>

            <div className="invoices-list card glass">
                <div className="table-responsive">
                    <table className="invoices-table">
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Date</th>
                                <th>Client</th>
                                <th className="text-right">Montant</th>
                                <th>Statut</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredInvoices.map((inv, idx) => (
                                    <motion.tr
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <td className="font-bold">{inv.trx_id}</td>
                                        <td>{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                                        <td>{inv.clients?.name || "Client au passage"}</td>
                                        <td className="text-right font-bold text-primary">
                                            {inv.total_amount.toLocaleString()} GNF
                                        </td>
                                        <td>
                                            <span className={`badge ${inv.status === 'Succès' ? 'badge-success' : 'badge-warning'}`}>
                                                {inv.status === 'Succès' ? 'Payé' : inv.status}
                                            </span>
                                        </td>
                                        <td className="text-center actions-cell">
                                            <Link to={`/invoice/${inv.id}`} className="action-btn" title="Voir">
                                                <Eye size={18} />
                                            </Link>
                                            <button className="action-btn" title="Imprimer" onClick={() => navigate(`/invoice/${inv.id}`)}>
                                                <Printer size={18} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredInvoices.length === 0 && !loading && (
                    <div className="empty-state">
                        <Receipt size={48} />
                        <p>Aucun reçu trouvé.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
