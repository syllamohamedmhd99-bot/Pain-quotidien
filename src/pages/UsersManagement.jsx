import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCog, ShieldAlert, Mail, Shield, CheckCircle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CRM.css';

export default function UsersManagement() {
    const [profiles, setProfiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [selectedRole, setSelectedRole] = useState("Staff");

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name');

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error("Failed to fetch profiles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const filteredProfiles = profiles.filter(p =>
        (p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.user_id && p.user_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenModal = (profile) => {
        setEditingProfile(profile);
        setSelectedRole(profile.role || "Staff");
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProfile(null);
    };

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: selectedRole, updated_at: new Date().toISOString() })
                .eq('id', editingProfile.id);

            if (error) throw error;

            alert(`Rôle mis à jour avec succès pour ${editingProfile.full_name || editingProfile.user_id}`);
            fetchProfiles();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la mise à jour du rôle.");
        }
    };

    return (
        <div className="crm-page">
            <div className="crm-header">
                <div>
                    <h1>Gestion des Utilisateurs</h1>
                    <p>Contrôlez l'accès au système et attribuez les rôles (Administrateur / Staff).</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="badge badge-warning" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                        <ShieldAlert size={16} style={{ marginRight: '8px' }} />
                        Zone Administrateur
                    </div>
                </div>
            </div>

            <div className="crm-controls card">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <motion.div className="crm-grid" layout>
                <AnimatePresence>
                    {filteredProfiles.map((profile) => (
                        <motion.div
                            key={profile.id}
                            className="crm-card card glass"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ y: -4 }}
                        >
                            <div className="crm-card-header">
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Avatar"
                                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className="client-avatar">
                                        {profile.full_name ? profile.full_name.charAt(0) : (profile.user_id ? profile.user_id.charAt(0).toUpperCase() : 'U')}
                                    </div>
                                )}
                                <div className="client-header-info">
                                    <h3>{profile.full_name || 'Utilisateur sans nom'}</h3>
                                    <span className={`status-badge ${profile.role === 'Administrateur' ? 'badge-primary' : 'badge-secondary'}`}>
                                        {profile.role === 'Administrateur' ? <Shield size={12} style={{ marginRight: 4 }} /> : <UserCog size={12} style={{ marginRight: 4 }} />}
                                        {profile.role || 'Staff'}
                                    </span>
                                </div>
                            </div>

                            <div className="crm-card-body">
                                <div className="contact-row">
                                    <Mail size={16} /> <span className="truncate">{profile.user_id || 'Email inconnu'}</span>
                                </div>
                                <div className="contact-row">
                                    <CheckCircle size={16} style={{ color: 'var(--success-color)' }} />
                                    <span>Compte Actif</span>
                                </div>
                            </div>

                            <div className="crm-card-footer" style={{ justifyContent: 'flex-end' }}>
                                <button className="btn btn-outline btn-small" onClick={() => handleOpenModal(profile)}>
                                    Modifier le rôle
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {filteredProfiles.length === 0 && !loading && (
                <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p>Aucun utilisateur trouvé.</p>
                </motion.div>
            )}

            {/* Modal for Edit Role */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content glass card"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ maxWidth: '400px' }}
                        >
                            <button className="close-btn action-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                            <h2>Modifier le rôle</h2>

                            <div style={{ marginBottom: '1.5rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                                Utilisateur : <strong style={{ color: 'var(--text-primary)' }}>{editingProfile?.full_name || editingProfile?.user_id}</strong>
                            </div>

                            <form onSubmit={handleUpdateRole} className="modal-form">
                                <div className="form-group">
                                    <label>Rôle d'accès</label>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Staff">Staff (Accès restreint)</option>
                                        <option value="Administrateur">Administrateur (Accès total)</option>
                                    </select>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                                        {selectedRole === 'Administrateur'
                                            ? "Les administrateurs peuvent voir cette page, modifier les prix et supprimer des données."
                                            : "Le Staff peut utiliser le point de vente et voir les stocks, mais sans droits de modification globaux."}
                                    </p>
                                </div>

                                <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
