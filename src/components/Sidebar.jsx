import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LayoutDashboard, ShoppingCart, Wheat, Users, Truck, History as HistoryIcon, LogOut, Sun, Moon, Palette, Croissant, Receipt, X, User, Wallet, ChefHat, ShieldCheck } from 'lucide-react';
import './Sidebar.css';

const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Encaissement', path: '/pos', icon: ShoppingCart },
    { name: 'Inventaire', path: '/inventory', icon: Wheat },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Fournisseurs', path: '/suppliers', icon: Truck },
    { name: 'Production', path: '/production', icon: ChefHat },
    {
        name: 'Charges',
        path: '/expenses',
        icon: Wallet,
        subItems: [
            { name: 'Charges Générales', path: '/expenses' },
            { name: 'Charges Production', path: '/production-costs' }
        ]
    },
    {
        name: 'Facturation',
        path: '/invoices',
        icon: Receipt,
        subItems: [
            { name: 'Historique', path: '/invoices' },
            { name: 'Créer Facture', path: '/invoices/new' },
            { name: 'Rapports', path: '/reports' }
        ]
    },
    { name: 'Mon Profil', path: '/profile', icon: User },
    { name: 'Historique Activité', path: '/history', icon: HistoryIcon },
    {
        name: 'Administration',
        path: '/admin/users',
        icon: ShieldCheck,
        adminOnly: true
    },
];

export default function Sidebar({ darkMode, toggleDarkMode, theme, setTheme, onLogout, isOpen, onClose, profile }) {
    const location = useLocation();
    const [openSubmenu, setOpenSubmenu] = useState(null);

    useEffect(() => {
        // Auto-open submenu if a sub-item is active
        const activeItem = navItems.find(item =>
            item.subItems && item.subItems.some(sub => location.pathname === sub.path)
        );
        if (activeItem) {
            setOpenSubmenu(activeItem.name);
        }
    }, [location.pathname]);

    const toggleSubmenu = (name) => {
        setOpenSubmenu(openSubmenu === name ? null : name);
    };

    const handleLinkClick = () => {
        if (onClose) onClose();
    };

    return (
        <motion.aside
            className={`sidebar glass ${isOpen ? 'open' : ''}`}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="logo-icon">
                        <Croissant size={32} />
                    </div>
                    <h2>Pain Doré</h2>
                </div>
                <button
                    className="close-sidebar-btn"
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {navItems.filter(item => {
                        // 1. Check Admin Only
                        if (item.adminOnly && profile?.role !== 'Administrateur') return false;

                        // 2. Check Permissions for Staff (Admins have access to everything)
                        if (profile?.role !== 'Administrateur') {
                            // If user is Staff, they must have the path in their permissions array
                            // Special case: Profile and Dashboard (/) are usually always accessible
                            if (item.path === '/' || item.path === '/profile') return true;

                            // For other items, check permissions
                            const perms = profile?.permissions || [];

                            // Check item path or any of its subItems paths
                            const hasAccess = perms.includes(item.path) ||
                                (item.subItems && item.subItems.some(sub => perms.includes(sub.path)));

                            if (!hasAccess) return false;
                        }

                        return true;

                    }).map((item) => {
                        const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));
                        const Icon = item.icon;
                        const hasSubItems = !!item.subItems;

                        return (
                            <li key={item.name}>
                                {hasSubItems ? (
                                    <div className={`nav-item-container ${isActive ? 'active-parent' : ''}`}>
                                        <button
                                            className={`nav-link ${isActive ? 'active' : ''} ${openSubmenu === item.name ? 'open' : ''}`}
                                            onClick={() => toggleSubmenu(item.name)}
                                        >
                                            <Icon className="nav-icon" size={20} />
                                            <span>{item.name}</span>
                                            <ChevronDown
                                                size={16}
                                                className={`chevron-icon ${openSubmenu === item.name ? 'rotated' : ''}`}
                                            />
                                        </button>
                                        <AnimatePresence>
                                            {openSubmenu === item.name && (
                                                <motion.ul
                                                    className="sub-nav"
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                >
                                                    {item.subItems
                                                        .map(sub => (
                                                            <li key={sub.path}>
                                                                <Link to={sub.path} className={`sub-nav-link ${location.pathname === sub.path ? 'active' : ''}`} onClick={handleLinkClick}>
                                                                    <span>{sub.name}</span>
                                                                </Link>
                                                            </li>
                                                        ))}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
                                        <Icon className="nav-icon" size={20} />
                                        <span>{item.name}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className="active-pill"
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <div className="theme-selector">
                    <div className="theme-label">
                        <Palette size={16} />
                        <span>Thème</span>
                    </div>
                    <div className="theme-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <button className={`theme-btn ${theme === 'default' ? 'active' : ''}`} onClick={() => setTheme('default')} title="Blé Doré" style={{ backgroundColor: '#d4a373' }}></button>
                        <button className={`theme-btn ${theme === 'matcha' ? 'active' : ''}`} onClick={() => setTheme('matcha')} title="Matcha" style={{ backgroundColor: '#8da47e' }}></button>
                        <button className={`theme-btn ${theme === 'ocean' ? 'active' : ''}`} onClick={() => setTheme('ocean')} title="Océan" style={{ backgroundColor: '#6096b4' }}></button>
                        <button className={`theme-btn ${theme === 'berry' ? 'active' : ''}`} onClick={() => setTheme('berry')} title="Baie" style={{ backgroundColor: '#9a7197' }}></button>
                        <button className={`theme-btn ${theme === 'sunset' ? 'active' : ''}`} onClick={() => setTheme('sunset')} title="Coucher de soleil" style={{ backgroundColor: '#f3722c' }}></button>
                        <button className={`theme-btn ${theme === 'lavender' ? 'active' : ''}`} onClick={() => setTheme('lavender')} title="Lavande" style={{ backgroundColor: '#8338ec' }}></button>
                        <button className={`theme-btn ${theme === 'midnight' ? 'active' : ''}`} onClick={() => setTheme('midnight')} title="Marine" style={{ backgroundColor: '#3a86ff' }}></button>
                        <button className={`theme-btn ${theme === 'eco' ? 'active' : ''}`} onClick={() => setTheme('eco')} title="Éco-Vibrant" style={{ backgroundColor: '#43aa8b' }}></button>
                    </div>
                </div>

                <button onClick={toggleDarkMode} className="theme-toggle btn btn-outline" style={{ display: 'flex' }}>
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{darkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
                </button>
                <button onClick={() => { handleLinkClick(); onLogout(); }} className="logout-btn btn btn-outline" style={{ display: 'flex' }}>
                    <LogOut size={20} />
                    <span>Déconnexion</span>
                </button>
            </div>
        </motion.aside>
    );
}
