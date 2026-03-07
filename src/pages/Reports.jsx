import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Printer, Download, Share2, Calendar as CalendarIcon, Filter, DollarSign, TrendingUp, TrendingDown, Clock, User, ChefHat } from 'lucide-react';
import { supabase } from '../supabaseClient';
import html2pdf from 'html2pdf.js'; // Importer html2pdf dynamique
import './Reports.css';

export default function Reports() {
    const [transactions, setTransactions] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [productionLogs, setProductionLogs] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("month"); // "today", "week", "month", "year"
    const [reporterName, setReporterName] = useState("");
    const [reporterRole, setReporterRole] = useState("");

    const reportRef = useRef(); // Référence à la zone imprimable/téléchargeable

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Déterminer la date de début selon la période
            const now = new Date();
            let startDate = new Date();

            if (period === "today") {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === "week") {
                startDate.setDate(now.getDate() - 7);
            } else if (period === "month") {
                startDate.setMonth(now.getMonth() - 1);
            } else if (period === "year") {
                startDate.setFullYear(now.getFullYear() - 1);
            }

            const startDateIso = startDate.toISOString();

            // Fetch transactions (Ventes)
            const { data: trxData, error: trxError } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'Vente')
                .gte('date', startDateIso)
                .order('date', { ascending: false });

            if (trxError) throw trxError;

            // Fetch expenses (Dépenses)
            const { data: expData, error: expError } = await supabase
                .from('expenses')
                .select('*')
                .gte('date', startDateIso)
                .order('date', { ascending: false });

            if (expError) throw expError;

            // Fetch Production (Lots de production)
            const { data: prodData, error: prodError } = await supabase
                .from('production_logs')
                .select('*')
                .gte('created_at', startDateIso)
                .order('created_at', { ascending: false });

            if (prodError) throw prodError;

            // Fetch Deliveries (Livraisons)
            const { data: delData, error: delError } = await supabase
                .from('deliveries')
                .select('*, delivery_items(quantity)')
                .gte('delivery_date', startDateIso)
                .order('delivery_date', { ascending: false });

            if (delError) throw delError;

            setTransactions(trxData || []);
            setExpenses(expData || []);
            setProductionLogs(prodData || []);
            setDeliveries(delData || []);

        } catch (error) {
            console.error("Erreur lors du chargement des données de rapport:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculs financiers
    const totalSales = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalDespenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalSales - totalDespenses;

    // Calculs Production
    const totalProductionQty = productionLogs
        .filter(l => l.status === 'Ready')
        .reduce((sum, l) => sum + (l.quantity || 0), 0);

    const productionByProduct = productionLogs
        .filter(l => l.status === 'Ready')
        .reduce((acc, l) => {
            acc[l.product_name] = (acc[l.product_name] || 0) + (l.quantity || 0);
            return acc;
        }, {});

    // Calculs Livraisons
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.status === 'Delivered').length;
    const totalDeliveryFees = deliveries.reduce((sum, d) => sum + (parseFloat(d.delivery_fee) || 0), 0);

    // --- Actions ---

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        const element = reportRef.current;
        const opt = {
            margin: 10,
            filename: `Rapport_Boulangerie_${period}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Rapport d\'Activité - Boulangerie',
                    text: `Voici le résumé financier : Ventes (${totalSales.toLocaleString()} GNF), Dépenses (${totalDespenses.toLocaleString()} GNF), Bénéfice Net (${netProfit.toLocaleString()} GNF).`,
                });
            } catch (err) {
                console.log("Erreur de partage:", err);
            }
        } else {
            // Fallback to mailto
            const subject = encodeURIComponent("Rapport d'Activité - Boulangerie");
            const body = encodeURIComponent(`Résumé financier :\n\nVentes : ${totalSales.toLocaleString()} GNF\nDépenses : ${totalDespenses.toLocaleString()} GNF\nBénéfice Net : ${netProfit.toLocaleString()} GNF\n\nGénéré depuis l'application de gestion.`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    };

    const getPeriodLabel = () => {
        switch (period) {
            case "today": return "Aujourd'hui";
            case "week": return "7 derniers jours";
            case "month": return "30 derniers jours";
            case "year": return "12 derniers mois";
            default: return "Période";
        }
    };

    return (
        <div className="reports-page">
            {/* --- Zone Contrôles (Non Imprimée) --- */}
            <div className="no-print">
                <div className="reports-header card glass">
                    <div>
                        <h1>Rapports Financiers</h1>
                        <p>Analyse de la rentabilité et génération de documents.</p>
                    </div>
                    <div className="action-buttons">
                        <button className="btn btn-outline" onClick={handlePrint} title="Imprimer le rapport en format A4">
                            <Printer size={18} /> <span className="hide-mobile">Imprimer</span>
                        </button>
                        <button className="btn btn-outline" onClick={handleShare} title="Envoyer par message ou e-mail">
                            <Share2 size={18} /> <span className="hide-mobile">Partager</span>
                        </button>
                        <button className="btn btn-primary" onClick={handleDownloadPDF} title="Générer un fichier PDF">
                            <Download size={18} /> <span className="hide-mobile">Télécharger PDF</span>
                        </button>
                    </div>
                </div>

                <div className="reports-filters card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div className="filter-group">
                        <Filter size={18} />
                        <span>Analyse :</span>
                        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select-input">
                            <option value="today">Aujourd'hui</option>
                            <option value="week">7 derniers jours</option>
                            <option value="month">30 derniers jours</option>
                            <option value="year">Cette année</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <User size={18} />
                        <input
                            type="text"
                            placeholder="Nom du responsable"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            className="select-input"
                            style={{ minWidth: '180px' }}
                        />
                    </div>
                    <div className="filter-group">
                        <ChefHat size={18} />
                        <input
                            type="text"
                            placeholder="Poste / Titre"
                            value={reporterRole}
                            onChange={(e) => setReporterRole(e.target.value)}
                            className="select-input"
                            style={{ minWidth: '150px' }}
                        />
                    </div>
                </div>
            </div>

            {/* --- Zone du Rapport (Imprimée & Exportée en PDF) --- */}
            <div className="report-container" ref={reportRef}>
                <div className="report-doc-header">
                    <div className="report-brand">
                        <div className="brand-icon">🥖</div>
                        <div className="brand-text">
                            <h2>Le Pain Doré</h2>
                            <p>Rapport d'Activité Officiel</p>
                        </div>
                    </div>
                    <div className="report-meta">
                        <p><CalendarIcon size={14} /> <strong>Période :</strong> {getPeriodLabel()}</p>
                        <p><Clock size={14} /> <strong>Édité le :</strong> {new Date().toLocaleString('fr-FR')}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">Génération des données...</div>
                ) : (
                    <>
                        <div className="report-summary-cards">
                            <div className="summary-card">
                                <div className="summary-icon bg-success"><TrendingUp size={24} /></div>
                                <div className="summary-info">
                                    <span className="label">Chiffre d'Affaires</span>
                                    <span className="value text-success">{totalSales.toLocaleString()} <small>GNF</small></span>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-icon bg-danger"><TrendingDown size={24} /></div>
                                <div className="summary-info">
                                    <span className="label">Dépenses Totales</span>
                                    <span className="value text-danger">{totalDespenses.toLocaleString()} <small>GNF</small></span>
                                </div>
                            </div>
                            <div className="summary-card" style={{ borderLeft: `4px solid ${netProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
                                <div className="summary-icon bg-primary"><DollarSign size={24} /></div>
                                <div className="summary-info">
                                    <span className="label">Bénéfice Net</span>
                                    <span className={`value ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {netProfit.toLocaleString()} <small>GNF</small>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="report-details">
                            <div className="report-column">
                                <h3>Résumé Financier</h3>
                                <table className="report-table">
                                    <tbody>
                                        <tr>
                                            <td>Chiffre d'Affaires</td>
                                            <td className="text-right text-success">{totalSales.toLocaleString()} GNF</td>
                                        </tr>
                                        <tr>
                                            <td>Dépenses Générales</td>
                                            <td className="text-right text-danger">-{totalDespenses.toLocaleString()} GNF</td>
                                        </tr>
                                        <tr>
                                            <td>Revenus Livraisons (Frais)</td>
                                            <td className="text-right text-success">+{totalDeliveryFees.toLocaleString()} GNF</td>
                                        </tr>
                                        <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
                                            <td>Bénéfice Net Global</td>
                                            <td className={`text-right ${netProfit + totalDeliveryFees >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {(netProfit + totalDeliveryFees).toLocaleString()} GNF
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <h3 style={{ marginTop: '2rem' }}>Production Réalisée</h3>
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Produit</th>
                                            <th className="text-right">Quantité Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(productionByProduct).map(([name, qty]) => (
                                            <tr key={name}>
                                                <td>{name}</td>
                                                <td className="text-right">{qty.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {Object.keys(productionByProduct).length === 0 && (
                                            <tr><td colSpan="2" className="text-center text-secondary">Aucune production terminée</td></tr>
                                        )}
                                        <tr style={{ fontWeight: 'bold', background: 'var(--bg-tertiary)' }}>
                                            <td>TOTAL PRODUCTION</td>
                                            <td className="text-right">{totalProductionQty.toLocaleString()} unités</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="report-column">
                                <h3>Activité Livraisons</h3>
                                <div className="stats-mini-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                                    <div className="stat-mini-card card glass">
                                        <span className="label">Total Courses</span>
                                        <span className="value">{totalDeliveries}</span>
                                    </div>
                                    <div className="stat-mini-card card glass">
                                        <span className="label">Livraisons Réussies</span>
                                        <span className="value text-success">{completedDeliveries}</span>
                                    </div>
                                </div>
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Destination</th>
                                            <th className="text-right">Frais</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deliveries.slice(0, 8).map(d => (
                                            <tr key={d.id}>
                                                <td>{new Date(d.delivery_date).toLocaleDateString('fr-FR')}</td>
                                                <td className="truncate" style={{ maxWidth: '100px' }}>{d.destination}</td>
                                                <td className="text-right">{parseFloat(d.delivery_fee).toLocaleString()} GNF</td>
                                            </tr>
                                        ))}
                                        {deliveries.length > 8 && (
                                            <tr><td colSpan="3" className="text-center text-secondary">... et {deliveries.length - 8} autres</td></tr>
                                        )}
                                    </tbody>
                                </table>

                                <h3 style={{ marginTop: '2rem' }}>Dernières Dépenses</h3>
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Catégorie</th>
                                            <th className="text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.slice(0, 8).map(e => (
                                            <tr key={e.id}>
                                                <td>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                                                <td>{e.category}</td>
                                                <td className="text-right text-danger">-{e.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="report-footer">
                            <p>Document généré automatiquement par l'application <strong>Le Pain Doré</strong>.</p>
                            <div className="report-signature">
                                <div style={{ textAlign: 'right' }}>
                                    {reporterName && (
                                        <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>
                                            {reporterName}
                                        </p>
                                    )}
                                    {reporterRole && (
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                            {reporterRole}
                                        </p>
                                    )}
                                    <div style={{ borderBottom: '1px solid #e2e8f0', width: '200px', marginTop: '2rem', marginLeft: 'auto' }}></div>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Signature du responsable</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
