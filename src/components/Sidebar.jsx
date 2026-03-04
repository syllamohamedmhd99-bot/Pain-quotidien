import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LayoutDashboard, ShoppingCart, Wheat, Users, Truck, History as HistoryIcon, LogOut, Sun, Moon, Palette, Croissant, Receipt } from 'lucide-react';
import './Sidebar.css';

const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Encaissement', path: '/pos', icon: ShoppingCart },
    { name: 'Inventaire', path: '/inventory', icon: Wheat },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Fournisseurs', path: '/suppliers', icon: Truck },
    {
        name: 'Facturation',
        path: '/invoices',
        icon: Receipt,
        subItems: [
            { name: 'Historique', path: '/invoices' },
            { name: 'Créer Facture', path: '/invoices/new' },
        ]
    },
    { name: 'Historique Activité', path: '/history', icon: HistoryIcon },
];

export default function Sidebar({ darkMode, toggleDarkMode, theme, setTheme, onLogout }) {
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

    return (
        <motion.aside
            className="sidebar glass"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="sidebar-header">
                <div className="logo-icon">
                    <Croissant size={32} />
                </div>
                <h2>Pain Quotidien</h2>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    {navItems.map((item) => {
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
                                                    {item.subItems.map(sub => (
                                                        <li key={sub.path}>
                                                            <Link to={sub.path} className={`sub-nav-link ${location.pathname === sub.path ? 'active' : ''}`}>
                                                                <span>{sub.name}</span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
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
                    <div className="theme-options">
                        <button className={`theme-btn ${theme === 'default' ? 'active' : ''}`} onClick={() => setTheme('default')} title="Doré" style={{ backgroundColor: '#d4a373' }}></button>
                        <button className={`theme-btn ${theme === 'matcha' ? 'active' : ''}`} onClick={() => setTheme('matcha')} title="Matcha" style={{ backgroundColor: '#8da47e' }}></button>
                        <button className={`theme-btn ${theme === 'ocean' ? 'active' : ''}`} onClick={() => setTheme('ocean')} title="Océan" style={{ backgroundColor: '#6096b4' }}></button>
                        <button className={`theme-btn ${theme === 'berry' ? 'active' : ''}`} onClick={() => setTheme('berry')} title="Violet" style={{ backgroundColor: '#9a7197' }}></button>
                    </div>
                </div>

                <button onClick={toggleDarkMode} className="theme-toggle btn btn-outline">
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{darkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
                </button>
                <button onClick={onLogout} className="logout-btn btn btn-outline">
                    <LogOut size={20} />
                    <span>Déconnexion</span>
                </button>
            </div>
        </motion.aside>
    );
}
