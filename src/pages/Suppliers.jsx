import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Mail, Phone, Package, Star, Trash2, X, Edit2, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CRM.css'; // Shared CSS for both CRM pages

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "Ingrédients",
        email: "",
        phone: "",
        rating: 5.0,
        status: "Actif"
    });

    const supplierTypes = ["Ingrédients", "Boissons", "Emballages", "Équipement", "Services"];

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name');

            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error("Failed to fetch suppliers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?\nNote: Ses dépenses passées resteront enregistrées.")) return;

        try {
            console.log("Tentative de suppression du fournisseur ID:", id);

            // 1. Dissociation des dépenses
            const { error: dissociationError } = await supabase
                .from('expenses')
                .update({ supplier_id: null })
                .eq('supplier_id', id);

            if (dissociationError) {
                console.warn("Erreur de dissociation (ignorée) :", dissociationError);
            }

            // 2. Suppression du fournisseur
            const { error: deleteError } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (deleteError) {
                console.error("Erreur Supabase lors de la suppression :", deleteError);
                throw new Error(`Code ${deleteError.code}: ${deleteError.message}`);
            }

            console.log("Suppression réussie !");
            setSuppliers(suppliers.filter(s => s.id !== id));
            alert("Fournisseur supprimé avec succès.");
        } catch (err) {
            console.error("Erreur complète :", err);
            alert("ERREUR DE SUPPRESSION :\n" + err.message);
        }
    };

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name,
                type: supplier.type,
                email: supplier.email || "",
                phone: supplier.phone || "",
                rating: supplier.rating || 5.0,
                status: supplier.status || "Actif"
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: "",
                type: "Ingrédients",
                email: "",
                phone: "",
                rating: 5.0,
                status: "Actif"
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...formData,
            rating: parseFloat(formData.rating),
            updated_at: new Date().toISOString()
        };

        try {
            if (editingSupplier) {
                // Update
                const { error } = await supabase
                    .from('suppliers')
                    .update(payload)
                    .eq('id', editingSupplier.id);

                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('suppliers')
                    .insert([payload]);

                if (error) throw error;
            }
            fetchSuppliers();
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
                    <h1>Fournisseurs</h1>
                    <p>Gérez vos partenaires et approvisionnements.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={handlePrint}>
                        <Printer size={18} />
                        Imprimer
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Nouveau Fournisseur
                    </button>
                </div>
            </div>

            <div className="crm-controls card">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <motion.div className="crm-grid" layout>
                <AnimatePresence>
                    {filteredSuppliers.map((supplier) => (
                        <motion.div
                            key={supplier.id}
                            className="crm-card card glass"
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ y: -4 }}
                        >
                            <div className="crm-card-header">
                                <div className="client-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black))' }}>
                                    <Package size={24} color="white" />
                                </div>
                                <div className="client-header-info">
                                    <h3>{supplier.name}</h3>
                                    <span className="status-badge badge-warning" style={{ backgroundColor: 'color-mix(in srgb, var(--text-secondary) 20%, transparent)', color: 'var(--text-secondary)' }}>
                                        {supplier.type}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                                    <button className="btn-icon" onClick={() => handleOpenModal(supplier)}>
                                        <Edit2 size={16} />
                                    </button>
                                    {isAdmin && (
                                        <button className="btn-icon delete-action" onClick={() => handleDelete(supplier.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="crm-card-body">
                                <div className="contact-row">
                                    <Mail size={16} /> <span>{supplier.email || 'N/A'}</span>
                                </div>
                                <div className="contact-row">
                                    <Phone size={16} /> <span>{supplier.phone || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="crm-card-footer">
                                <div className="stat-col" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
                                    <Star size={16} color="var(--primary-color)" fill="var(--primary-color)" />
                                    <span className="stat-val">{supplier.rating}</span>
                                </div>
                                <span className={`status-badge ${supplier.status === 'Premium' || supplier.status === 'Partenaire' ? 'badge-success' : 'badge-warning'}`}>
                                    {supplier.status}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {
                filteredSuppliers.length === 0 && !loading && (
                    <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <p>Aucun fournisseur trouvé.</p>
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
                            <h2>{editingSupplier ? 'Modifier le Fournisseur' : 'Ajouter un Fournisseur'}</h2>

                            <form onSubmit={handleSubmit} className="modal-form">
                                <div className="form-group">
                                    <label>Nom de l'entreprise</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group form-row">
                                    <div className="input-half">
                                        <label>Type de fourniture</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            {supplierTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-half">
                                        <label>Note (sur 5)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            required
                                            value={formData.rating}
                                            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                                        />
                                    </div>
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
                                    <label>Statut</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Actif">Actif</option>
                                        <option value="Partenaire">Partenaire</option>
                                        <option value="Inactif">Inactif</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingSupplier ? 'Mettre à jour' : 'Créer le fournisseur'}
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
