import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Mail, Phone, MapPin, Trash2, X, Edit2, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CRM.css'; // Assuming this exists or is shared

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        status: "Actif"
    });

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setClients(clients.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression");
        }
    };

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                email: client.email || "",
                phone: client.phone || "",
                address: client.address || "",
                status: client.status
            });
        } else {
            setEditingClient(null);
            setFormData({
                name: "",
                email: "",
                phone: "",
                address: "",
                status: "Actif"
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingClient) {
                // Update (UPSERT style or direct update)
                const { error } = await supabase
                    .from('clients')
                    .update({ ...formData, updated_at: new Date().toISOString() })
                    .eq('id', editingClient.id);

                if (error) throw error;
            } else {
                // Creation
                const { error } = await supabase
                    .from('clients')
                    .insert([formData]);

                if (error) throw error;
            }
            fetchClients();
            handleCloseModal();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde : " + (err.message || "Erreur inconnue"));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="crm-page">
            <div className="crm-header">
                <div>
                    <h1>Clients</h1>
                    <p>Gérez votre base de données clients et leur historique.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={handlePrint}>
                        <Printer size={18} />
                        Imprimer
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Nouveau Client
                    </button>
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
                    {filteredClients.map((client) => (
                        <motion.div
                            key={client.id}
                            className="crm-card card glass"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ y: -4 }}
                        >
                            <div className="crm-card-header">
                                <div className="client-avatar">
                                    {client.name.charAt(0)}
                                </div>
                                <div className="client-header-info">
                                    <h3>{client.name}</h3>
                                    <span className={`status-badge ${client.status === 'Premium' ? 'badge-warning' : client.status === 'Actif' ? 'badge-success' : 'badge-danger'}`}>
                                        {client.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn-icon" onClick={() => handleOpenModal(client)}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="btn-icon delete-action" onClick={() => handleDelete(client.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="crm-card-body">
                                <div className="contact-row">
                                    <Mail size={16} /> <span>{client.email || 'N/A'}</span>
                                </div>
                                <div className="contact-row">
                                    <Phone size={16} /> <span>{client.phone || 'N/A'}</span>
                                </div>
                                <div className="contact-row">
                                    <MapPin size={16} /> <span className="truncate">{client.address || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="crm-card-footer">
                                <div className="stat-col">
                                    <span className="stat-label">Commandes</span>
                                    <span className="stat-val">{client.ordersCount}</span>
                                </div>
                                <button className="btn btn-outline btn-small">Voir profil</button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {
                filteredClients.length === 0 && !loading && (
                    <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <p>Aucun client trouvé.</p>
                    </motion.div>
                )
            }

            {/* Modal for Add / Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content glass card"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <button className="close-btn action-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                            <h2>{editingClient ? 'Modifier le Client' : 'Ajouter un Client'}</h2>

                            <form onSubmit={handleSubmit} className="modal-form">
                                <div className="form-group">
                                    <label>Nom complet</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group form-row">
                                    <div className="input-half">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-half">
                                        <label>Téléphone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Adresse complète</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="form-group form-row">
                                    <div className="input-half">
                                        <label>Statut</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Actif">Actif</option>
                                            <option value="Inactif">Inactif</option>
                                            <option value="Premium">Premium</option>
                                        </select>
                                    </div>
                                    <div className="input-half">
                                        <label>Points cumulés</label>
                                        <input
                                            type="number"
                                            value={formData.points}
                                            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingClient ? 'Mettre à jour' : 'Créer le client'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
