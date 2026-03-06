import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, Filter, ArrowUpRight, ArrowDownRight, PackagePlus, Users, ShoppingBag, Trash2, Receipt } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './History.css';

export default function History() {
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("Tous");
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            // Mapper les données de la DB pour qu'elles correspondent au format UI attendu
            const mappedLogs = data.map(trx => ({
                id: trx.trx_id,
                type: trx.type,
                date: new Date(trx.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
                desc: trx.description,
                amount: trx.type === "Achat" ? `- ${trx.total_amount.toLocaleString('fr-FR')} GNF` : `+ ${trx.total_amount.toLocaleString('fr-FR')} GNF`,
                status: trx.status,
                icon: trx.type === "Vente" ? ShoppingBag : trx.type === "Achat" ? ArrowDownRight : trx.type === "Inventaire" ? PackagePlus : Users,
                color: trx.type === "Vente" ? "var(--success-color)" : trx.type === "Achat" ? "var(--danger-color)" : trx.type === "Inventaire" ? "var(--primary-color)" : "var(--accent-color)",
                deletable: true,
                rawId: trx.id,
                paymentMode: trx.payment_mode
            }));

            setLogs(mappedLogs);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleDelete = async (rawId, trxId) => {
        if (!window.confirm(`Voulez-vous vraiment annuler la transaction ${trxId} ? Cette action réinitialisera les stocks associés.`)) {
            return;
        }

        try {
            // Note: Triggers on Supabase will handle the stock restoration automatically
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', rawId);

            if (error) throw error;

            // Refresh the list from server to ensure stock logic is verified
            fetchTransactions();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Erreur lors de l'annulation : " + error.message);
        }
    };

    const filters = ["Tous", "Vente", "Achat", "Inventaire", "CRM"];

    const filteredLogs = logs.filter(log => {
        const matchesType = filterType === "Tous" || log.type === filterType;
        const matchesSearch = log.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="history-page">
            <div className="history-header">
                <div>
                    <h1>Historique</h1>
                    <p>Journal de toutes les activités et transactions récentes.</p>
                </div>
            </div>

            <div className="history-controls card">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher une transaction..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="history-filters">
                    {filters.map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${filterType === f ? 'active' : ''}`}
                            onClick={() => setFilterType(f)}
                        >
                            {f}
                        </button>
                    ))}
                    <div className="date-filter-btn btn-outline">
                        <Calendar size={16} /> <span>Période</span>
                    </div>
                </div>
            </div>

            <div className="history-timeline">
                <AnimatePresence>
                    {filteredLogs.map((log, index) => {
                        const Icon = log.icon;
                        return (
                            <motion.div
                                key={log.id}
                                className="timeline-item card glass"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <div className="timeline-icon" style={{ backgroundColor: `color-mix(in srgb, ${log.color} 15%, transparent)`, color: log.color }}>
                                    <Icon size={20} />
                                </div>

                                <div className="timeline-content">
                                    <div className="timeline-top">
                                        <div className="timeline-title-group">
                                            <span className="log-id">{log.id}</span>
                                            <span className="log-type" style={{ color: log.color }}>• {log.type}</span>
                                        </div>
                                        <span className="log-date">{log.date}</span>
                                    </div>

                                    <h3 className="log-desc">{log.desc}</h3>
                                </div>

                                <div className="timeline-trailing">
                                    <div className={`log-amount ${log.amount.startsWith('+') ? 'amount-positive' : log.amount.startsWith('-') ? 'amount-negative' : 'amount-neutral'}`}>
                                        {log.amount}
                                    </div>
                                    <div className="status-action-group" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        {log.paymentMode && (
                                            <span className="badge badge-outline" style={{ border: '1px solid var(--border-color)', opacity: 0.8, fontSize: '0.7rem' }}>
                                                {log.paymentMode}
                                            </span>
                                        )}
                                        <span className={`status-badge ${log.status === 'Succès' ? 'badge-success' : log.status === 'Confirmé' ? 'badge-warning' : 'badge-neutral'}`}>
                                            {log.status}
                                        </span>
                                        <Link to={`/invoice/${log.rawId}`} className="btn-icon" title="Voir Facture">
                                            <Receipt size={16} />
                                        </Link>
                                        {log.deletable && (
                                            <button className="btn-icon delete-action" onClick={() => handleDelete(log.rawId, log.id)} title="Annuler">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredLogs.length === 0 && (
                    <div className="empty-state">
                        <p>Aucune activité correspondante trouvée.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
