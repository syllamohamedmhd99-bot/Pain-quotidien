import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCog, ShieldAlert, Mail, Shield, CheckCircle, X, Plus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CRM.css';

export default function UsersManagement() {
    const [profiles, setProfiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [selectedRole, setSelectedRole] = useState("Staff");
    const [selectedPermissions, setSelectedPermissions] = useState([]); // Nouveau state pour les permissions

    const availablePages = [
        { id: '/pos', name: 'Encaissement' },
        { id: '/inventory', name: 'Inventaire' },
        { id: '/clients', name: 'Clients' },
        { id: '/suppliers', name: 'Fournisseurs' },
        { id: '/expenses', name: 'Dépenses' },
        { id: '/production', name: 'Production' },
        { id: '/invoices', name: 'Facturation (Historique)' },
        { id: '/invoices/new', name: 'Créer Facture' },
        { id: '/history', name: 'Historique Activité' },
    ];

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'Staff' });
    const [isCreating, setIsCreating] = useState(false);

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
        // Initialiser les permissions à partir de la BDD, sinon tout cocher par défaut pour le staff
        let perms = profile.permissions;
        if (!Array.isArray(perms)) {
            perms = availablePages.map(p => p.id); // Par défaut on donne accès à tout si non défini
        }
        setSelectedPermissions(perms);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProfile(null);
    };

    const togglePermission = (pageId) => {
        setSelectedPermissions(prev =>
            prev.includes(pageId)
                ? prev.filter(id => id !== pageId)
                : [...prev, pageId]
        );
    };

    const selectAllPermissions = () => setSelectedPermissions(availablePages.map(p => p.id));
    const deselectAllPermissions = () => setSelectedPermissions([]);

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    role: selectedRole,
                    permissions: selectedRole === 'Administrateur' ? [] : selectedPermissions, // Les admins on ignore leurs permissions
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingProfile.id);

            if (error) throw error;

            alert(`Rôles et permissions mis à jour avec succès pour ${editingProfile.full_name || editingProfile.user_id}`);
            fetchProfiles();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la mise à jour : " + error.message);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Vous n'êtes pas connecté.");

            const response = await fetch('/api/createUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ ...newUser, defaultPermissions: availablePages.map(p => p.id) }) // On passe les permissions par défaut si besoin
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur inconnue");
            }

            alert("Utilisateur créé avec succès ! Pensez à configurer ses permissions si c'est un Staff.");
            setIsCreateModalOpen(false);
            setNewUser({ fullName: '', email: '', password: '', role: 'Staff' });
            fetchProfiles();
        } catch (error) {
            console.error("Create User Error:", error);
            alert("Erreur: " + error.message);
        } finally {
            setIsCreating(false);
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
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={20} />
                    <span>Créer un utilisateur</span>
                </button>
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
                                    Modifier rôles & permissions
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
                            style={{ maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <button className="close-btn action-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                            <h2>Modifier le compte</h2>

                            <div style={{ marginBottom: '1.5rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                                Utilisateur : <strong style={{ color: 'var(--text-primary)' }}>{editingProfile?.full_name || editingProfile?.user_id}</strong>
                            </div>

                            <form onSubmit={handleUpdateRole} className="modal-form">
                                <div className="form-group">
                                    <label>Rôle principal</label>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Staff">Staff (Accès restreint)</option>
                                        <option value="Administrateur">Administrateur (Accès total)</option>
                                    </select>
                                </div>

                                {selectedRole === 'Staff' && (
                                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span>Permissions d'accès</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button type="button" onClick={selectAllPermissions} style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Tout</button>
                                                <button type="button" onClick={deselectAllPermissions} style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Aucun</button>
                                            </div>
                                        </label>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            {availablePages.map(page => (
                                                <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermissions.includes(page.id)}
                                                        onChange={() => togglePermission(page.id)}
                                                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                                                    />
                                                    {page.name}
                                                </label>
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.8rem 0 0', lineHeight: 1.4 }}>
                                            Cochez les pages que cet utilisateur est autorisé à voir dans son menu.
                                        </p>
                                    </div>
                                )}

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

            {/* Modal for Create User */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content glass card"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ maxWidth: '400px' }}
                        >
                            <button className="close-btn action-btn" onClick={() => setIsCreateModalOpen(false)}>
                                <X size={20} />
                            </button>
                            <h2>Créer un utilisateur</h2>

                            <form onSubmit={handleCreateUser} className="modal-form">
                                <div className="form-group">
                                    <label>Nom complet</label>
                                    <input
                                        type="text" required
                                        value={newUser.fullName}
                                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email" required
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mot de passe</label>
                                    <input
                                        type="password" required minLength="6"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Rôle</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Staff">Staff</option>
                                        <option value="Administrateur">Administrateur</option>
                                    </select>
                                </div>

                                <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={isCreating}>
                                        {isCreating ? 'Création...' : 'Créer'}
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
