import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({ children, darkMode, toggleDarkMode, theme, setTheme, onLogout, profile }) {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="app-layout">
            <Sidebar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                theme={theme}
                setTheme={setTheme}
                onLogout={onLogout}
                isOpen={isMobileMenuOpen}
                onClose={closeMobileMenu}
                profile={profile}
            />

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="mobile-overlay"
                    onClick={closeMobileMenu}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 90
                    }}
                ></div>
            )}

            <main className="main-content">
                <header className="topbar glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                        <button
                            className="mobile-menu-btn btn btn-primary"
                            onClick={toggleMobileMenu}
                        >
                            <Menu size={20} />
                            <span>Menu</span>
                        </button>
                        <div className="topbar-search" style={{ flex: 1 }}>
                            <input type="text" placeholder="Rechercher des produits, commandes..." className="search-input" />
                        </div>
                    </div>
                    <div className="topbar-actions">
                        <Link to="/profile" className="user-profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="avatar" style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="avatar">{profile?.full_name?.[0] || profile?.user_id?.[0]?.toUpperCase() || 'A'}</div>
                            )}
                            <div className="user-info">
                                <span className="user-name">{profile?.full_name || 'Utilisateur'}</span>
                                <span className="user-role">{profile?.role || 'Gérant'}</span>
                            </div>
                        </Link>
                    </div>
                </header>

                <div className="page-container">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="page-content"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
