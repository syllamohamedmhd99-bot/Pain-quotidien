import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp, Croissant, Users, Truck, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
    const [transactions, setTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [viewType, setViewType] = useState('weekly'); // 'weekly' or 'monthly'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trxRes, clientRes, prodRes, suppRes] = await Promise.all([
                    supabase.from('transactions').select('*'),
                    supabase.from('clients').select('*'),
                    supabase.from('products').select('*'),
                    supabase.from('suppliers').select('*'),
                    supabase.from('expenses').select('*')
                ]);

                if (trxRes.data) setTransactions(trxRes.data);
                if (clientRes.data) setClients(clientRes.data);
                if (prodRes.data) setProducts(prodRes.data);
                if (suppRes.data) setSuppliers(suppRes.data);
                if (expensesRes.data) setExpenses(expensesRes.data);
            } catch (error) {
                console.error("Erreur de récupération des données:", error);
            }
        };

        fetchData();
    }, []);

    // Helper: is today
    const isToday = (dateString) => {
        const today = new Date();
        const date = new Date(dateString);
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Calculate Stats
    const totalSalesToday = (Array.isArray(transactions) ? transactions : [])
        .filter(t => isToday(t.date))
        .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const todayOrdersCount = (Array.isArray(transactions) ? transactions : [])
        .filter(t => isToday(t.date)).length;

    const newClientsToday = (Array.isArray(clients) ? clients : [])
        .filter(c => isToday(c.created_at || Date.now())).length;

    const totalStock = (Array.isArray(products) ? products : [])
        .reduce((sum, p) => sum + (p.stock || 0), 0);

    // Chart Data Calculation
    const getWeeklyData = () => {
        const result = [];
        const today = new Date();
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const label = `${days[d.getDay()]} ${d.getFullYear()}`;

            const daySales = (Array.isArray(transactions) ? transactions : [])
                .filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getDate() === d.getDate() &&
                        tDate.getMonth() === d.getMonth() &&
                        tDate.getFullYear() === d.getFullYear();
                })
                .reduce((sum, t) => sum + (t.total_amount || 0), 0);

            result.push({ label, value: daySales });
        }
        return result;
    };

    const getMonthlyData = () => {
        const result = [];
        const today = new Date();
        const months = ['Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const label = `${months[d.getMonth()]} ${d.getFullYear()}`;

            const monthSales = (Array.isArray(transactions) ? transactions : [])
                .filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getMonth() === d.getMonth() &&
                        tDate.getFullYear() === d.getFullYear();
                })
                .reduce((sum, t) => sum + (t.total_amount || 0), 0);

            result.push({ label, value: monthSales });
        }
        return result;
    };

    const chartData = viewType === 'weekly' ? getWeeklyData() : getMonthlyData();
    const maxVal = Math.max(...chartData.map(d => d.value), 1000);

    const stats = [
        { id: 1, title: "Ventes du Jour", value: `${totalSalesToday.toLocaleString()} GNF`, icon: TrendingUp, color: "var(--primary-color)", increase: "+0%" },
        { id: 2, title: "Commandes", value: todayOrdersCount.toString(), icon: ShoppingBag, color: "var(--success-color)", increase: "+0%" },
        { id: 3, title: "Dépenses Totales", value: `${expenses.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()} GNF`, icon: DollarSign, color: "var(--danger-color)", increase: "Global" },
        { id: 4, title: "Stock Critique", value: products.filter(p => p.stock <= (p.min_stock || 10)).length.toString(), icon: AlertTriangle, color: "var(--warning-color)", increase: "Alertes" },
        { id: 5, title: "Produits", value: (Array.isArray(products) ? products.length : 0).toString(), icon: Croissant, color: "var(--accent-color)", increase: "Total" },
    ];

    const stockAlerts = products.filter(p => p.stock <= (p.min_stock || 10)).slice(0, 5);

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Tableau de bord</h1>
                    <p>Bienvenue, voici un aperçu de vos données en temps réel.</p>
                </div>
                <button className="btn btn-primary">
                    <ShoppingBag size={18} />
                    Nouvelle Vente
                </button>
            </div>

            <motion.div
                className="stats-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    const isPositive = stat.increase.startsWith('+');
                    return (
                        <motion.div key={stat.id} className="stat-card card glass" variants={itemVariants}>
                            <div className="stat-card-header">
                                <div>
                                    <h3 className="stat-title">{stat.title}</h3>
                                    <p className="stat-value">{stat.value}</p>
                                </div>
                                <div className="stat-icon" style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 15%, transparent)`, color: stat.color }}>
                                    <Icon size={24} />
                                </div>
                            </div>
                            <div className="stat-card-footer">
                                <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                                    {stat.increase}
                                </span>
                                <span className="stat-compare">par rapport à hier</span>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            <div className="dashboard-content">
                <motion.div
                    className="chart-section card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    <div className="section-header">
                        <h3>Évolution des Ventes</h3>
                        <select
                            className="date-select btn-outline"
                            value={viewType}
                            onChange={(e) => setViewType(e.target.value)}
                        >
                            <option value="weekly">Cette semaine</option>
                            <option value="monthly">Ce mois</option>
                        </select>
                    </div>
                    <div className="chart-container">
                        <div className="line-chart-wrapper">
                            <svg viewBox="0 0 700 250" className="line-chart-svg">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                {chartData.length > 1 && (
                                    <>
                                        <motion.path
                                            d={`M 0 250 ${chartData.map((d, i) => `L ${(i * (700 / (chartData.length - 1)))} ${250 - (d.value / (maxVal || 1) * 200)}`).join(' ')} L 700 250 Z`}
                                            fill="url(#chartGradient)"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />

                                        <motion.path
                                            d={`M 0 ${250 - (chartData[0].value / (maxVal || 1) * 200)} ${chartData.map((d, i) => `L ${(i * (700 / (chartData.length - 1)))} ${250 - (d.value / (maxVal || 1) * 200)}`).join(' ')}`}
                                            fill="none"
                                            stroke="var(--primary-color)"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                                        />

                                        {chartData.map((d, i) => (
                                            <motion.circle
                                                key={i}
                                                cx={(i * (700 / (chartData.length - 1)))}
                                                cy={250 - (d.value / (maxVal || 1) * 200)}
                                                r="6"
                                                fill="var(--card-bg)"
                                                stroke="var(--primary-color)"
                                                strokeWidth="3"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 1 + (i * 0.1) }}
                                                title={`${d.label}: ${d.value.toLocaleString()} GNF`}
                                            />
                                        ))}
                                    </>
                                )}
                            </svg>
                            <div className="chart-labels">
                                {chartData.map((d, i) => (
                                    <span key={i} className="chart-label-text">{d.label}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '1' }}>
                    {stockAlerts.length > 0 && (
                        <motion.div
                            className="stock-alerts card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            style={{ borderLeft: '4px solid var(--danger-color)' }}
                        >
                            <div className="section-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)' }}>
                                    <AlertTriangle size={20} />
                                    Alertes de Stock
                                </h3>
                                <button className="btn-outline btn-small" onClick={() => window.location.href = '/inventory'}>Voir</button>
                            </div>
                            <ul className="alert-list" style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0' }}>
                                {stockAlerts.map(product => (
                                    <li key={product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span>{product.name}</span>
                                        <span className="text-danger" style={{ fontWeight: 'bold' }}>{product.stock} restants</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}

                    <motion.div
                        className="recent-orders card"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        <div className="section-header">
                            <h3>Commandes Récentes</h3>
                            <button className="btn-outline btn-small">Voir tout</button>
                        </div>
                        <ul className="order-list">
                            {(Array.isArray(transactions) ? transactions : []).slice(0, 5).map(trx => (
                                <li key={trx.id} className="order-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <p style={{ fontWeight: 'bold' }}>{trx.trx_id}</p>
                                        <small style={{ color: 'var(--text-secondary)' }}>{new Date(trx.date).toLocaleString()}</small>
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                        {(trx.total_amount || 0).toLocaleString()} GNF
                                    </div>
                                </li>
                            ))}
                            {(Array.isArray(transactions) ? transactions.length : 0) === 0 && (
                                <li className="order-item" style={{ justifyContent: 'center', opacity: 0.5 }}>
                                    <p>Aucune commande récente.</p>
                                </li>
                            )}
                        </ul>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
