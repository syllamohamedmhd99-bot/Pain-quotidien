import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp, Wheat, Users, Truck, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import WheatLogo from '../components/WheatLogo';
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

export default function Dashboard({ profile }) {
    const [transactions, setTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [viewType, setViewType] = useState('weekly');
    const [globalView, setGlobalView] = useState(profile?.role === 'Administrateur');

    const isAdmin = profile?.role === 'Administrateur';

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Pour le mode local, on peut passer un paramètre ?all=true
                // En mode Supabase, le RLS gère déjà cela si l'admin a les droits.
                const queryOptions = isAdmin && globalView ? { all: 'true' } : {};

                const [trxRes, clientRes, prodRes, suppRes, expRes] = await Promise.all([
                    supabase.from('transactions').select('*', queryOptions),
                    supabase.from('clients').select('*', queryOptions),
                    supabase.from('products').select('*', queryOptions),
                    supabase.from('suppliers').select('*', queryOptions),
                    supabase.from('expenses').select('*', queryOptions)
                ]);

                if (trxRes.data) setTransactions(trxRes.data);
                if (clientRes.data) setClients(clientRes.data);
                if (prodRes.data) setProducts(prodRes.data);
                if (suppRes.data) setSuppliers(suppRes.data);
                if (expRes.data) setExpenses(expRes.data);
            } catch (error) {
                console.error("Erreur de récupération des données:", error);
            }
        };

        fetchData();
    }, [globalView]);

    const isToday = (dateString) => {
        const today = new Date();
        const date = new Date(dateString);
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // BI Calculations
    const totalRevenue = (Array.isArray(transactions) ? transactions : [])
        .filter(t => !t.trx_id?.startsWith('FACT-'))
        .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const totalExpenses = (Array.isArray(expenses) ? expenses : [])
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = totalRevenue - totalExpenses;

    const totalSalesToday = (Array.isArray(transactions) ? transactions : [])
        .filter(t => isToday(t.date) && !t.trx_id?.startsWith('FACT-'))
        .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const todayOrdersCount = (Array.isArray(transactions) ? transactions : [])
        .filter(t => isToday(t.date) && !t.trx_id?.startsWith('FACT-')).length;

    // Top Products Calculation
    const getTopProducts = () => {
        const productSales = {};
        (Array.isArray(transactions) ? transactions : []).forEach(trx => {
            if (trx.items && Array.isArray(trx.items)) {
                trx.items.forEach(item => {
                    const name = item.name || item.product_name;
                    productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
                });
            }
        });
        return Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, qty]) => ({ name, qty }));
    };

    const topProducts = getTopProducts();

    const getWeeklyData = () => {
        const result = [];
        const today = new Date();
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const label = `${days[d.getDay()]}`;

            const daySales = (Array.isArray(transactions) ? transactions : [])
                .filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getDate() === d.getDate() &&
                        tDate.getMonth() === d.getMonth() &&
                        tDate.getFullYear() === d.getFullYear() &&
                        !t.trx_id?.startsWith('FACT-');
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
            const label = `${months[d.getMonth()]}`;

            const monthSales = (Array.isArray(transactions) ? transactions : [])
                .filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getMonth() === d.getMonth() &&
                        tDate.getFullYear() === d.getFullYear() &&
                        !t.trx_id?.startsWith('FACT-');
                })
                .reduce((sum, t) => sum + (t.total_amount || 0), 0);

            result.push({ label, value: monthSales });
        }
        return result;
    };

    const chartData = viewType === 'weekly' ? getWeeklyData() : getMonthlyData();
    const maxVal = Math.max(...chartData.map(d => d.value), 1000);

    const stats = [
        { id: 1, title: "Profit Net", value: `${netProfit.toLocaleString()} GNF`, icon: DollarSign, color: "var(--primary-color)", increase: "+12%" },
        { id: 2, title: "Ventes du Jour", value: `${totalSalesToday.toLocaleString()} GNF`, icon: TrendingUp, color: "var(--success-color)", increase: "+5%" },
        { id: 3, title: "Commandes Jour", value: todayOrdersCount.toString(), icon: ShoppingBag, color: "var(--primary-color)", increase: "+2" },
        { id: 4, title: "Stock Critique", value: products.filter(p => p.stock <= (p.min_stock || 10)).length.toString(), icon: AlertTriangle, color: "var(--danger-color)", increase: "Alertes" },
    ];

    const stockAlerts = products.filter(p => p.stock <= (p.min_stock || 10)).slice(0, 5);

    return (
        <motion.div
            className="dashboard"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            <div className="dashboard-header">
                <div>
                    <h1>Tableau de bord {isAdmin && (globalView ? "(Global)" : "(Personnel)")}</h1>
                    <p>{isAdmin ? "Gérez l'ensemble de l'activité ou votre propre performance." : "Voici l'analyse de votre performance aujourd'hui."}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {isAdmin && (
                        <div className="view-toggle" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                            <button
                                className={`btn ${!globalView ? 'btn-primary' : 'btn-text'}`}
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => setGlobalView(false)}
                            >
                                Ma Vue
                            </button>
                            <button
                                className={`btn ${globalView ? 'btn-primary' : 'btn-text'}`}
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => setGlobalView(true)}
                            >
                                Global
                            </button>
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={() => window.location.href = '/pos'}>
                        <DollarSign size={18} />
                        Nouvelle Vente
                    </button>
                </div>
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
                                <div className="stat-icon" style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 12%, transparent)`, color: stat.color }}>
                                    <Icon size={24} />
                                </div>
                            </div>
                            <div className="stat-card-footer">
                                <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                                    {stat.increase}
                                </span>
                                <span className="stat-compare">croissance</span>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            <div className="dashboard-content">
                <motion.div
                    className="chart-section card glass"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.7 }}
                >
                    <div className="section-header">
                        <h3>Performance Commerciale</h3>
                        <select
                            className="date-select"
                            value={viewType}
                            onChange={(e) => setViewType(e.target.value)}
                        >
                            <option value="weekly">Hebdomadaire</option>
                            <option value="monthly">Mensuel</option>
                        </select>
                    </div>
                    <div className="chart-container">
                        <div className="line-chart-wrapper">
                            <svg viewBox="0 0 700 250" className="line-chart-svg">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.4" />
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
                                            transition={{ duration: 1.5, delay: 0.5 }}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <motion.div
                        className="top-products card glass"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.7 }}
                    >
                        <div className="section-header">
                            <h3>Top 5 Produits</h3>
                        </div>
                        <div className="top-products-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {topProducts.map((p, i) => (
                                <div key={i} className="product-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="rank" style={{ width: '28px', height: '28px', background: 'var(--primary-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{p.qty} vendus</div>
                                    </div>
                                    <div className="progress-bar-bg" style={{ width: '60px', height: '6px', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div className="progress" style={{ width: `${(p.qty / (topProducts[0].qty || 1)) * 100}%`, height: '100%', background: 'var(--primary-color)' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        className="recent-orders card glass"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                    >
                        <div className="section-header">
                            <h3>Ventes Récentes</h3>
                            <button className="btn-outline btn-small" onClick={() => window.location.href = '/history'}>Voir plus</button>
                        </div>
                        <ul className="order-list">
                            {(Array.isArray(transactions) ? transactions : []).slice(0, 4).map(trx => (
                                <li key={trx.id} className="order-item">
                                    <div className="order-info">
                                        <p style={{ fontWeight: 'bold' }}>{trx.trx_id}</p>
                                        <p style={{ color: 'var(--text-secondary)' }}>{new Date(trx.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="order-price">
                                        {(trx.total_amount || 0).toLocaleString()} GNF
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

