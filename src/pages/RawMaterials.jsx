import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wheat,
    Plus,
    Search,
    Trash2,
    Edit2,
    X,
    AlertTriangle,
    ShoppingBag,
    History
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './RawMaterials.css';

export default function RawMaterials() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        quantity: '',
        unit: 'kg',
        min_stock: 5
    });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('raw_materials')
                .select('*')
                .order('name');
            if (data) setMaterials(data);
        } catch (err) {
            console.error("Error fetching raw materials:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            quantity: parseFloat(formData.quantity),
            unit: formData.unit,
            min_stock: parseFloat(formData.min_stock)
        };

        try {
            if (editingMaterial) {
                await supabase.from('raw_materials').update(payload).eq('id', editingMaterial.id);
            } else {
                await supabase.from('raw_materials').insert([payload]);
            }
            fetchMaterials();
            closeModal();
        } catch (err) {
            console.error("Error saving raw material:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette matière première ?")) return;
        try {
            await supabase.from('raw_materials').delete().eq('id', id);
            fetchMaterials();
        } catch (err) {
            console.error("Error deleting:", err);
        }
    };

    const openModal = (material = null) => {
        if (material) {
            setEditingMaterial(material);
            setFormData({
                name: material.name,
                quantity: material.quantity,
                unit: material.unit,
                min_stock: material.min_stock
            });
        } else {
            setEditingMaterial(null);
            setFormData({ name: '', quantity: '', unit: 'kg', min_stock: 5 });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingMaterial(null);
    };

    const filteredMaterials = useMemo(() => {
        return materials.filter(m =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [materials, searchTerm]);

    return (
        <div className="raw-materials">
            <div className="page-header">
                <div>
                    <h1>Matières Premières</h1>
                    <p>Gérez vos stocks d'ingrédients et fournitures.</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Nouvel Ingrédient
                </button>
            </div>

            <div className="controls-row card glass">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un ingrédient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading">Chargement...</div>
            ) : (
                <div className="materials-grid">
                    {filteredMaterials.map(m => (
                        <motion.div
                            key={m.id}
                            className={`material-card card glass ${m.quantity <= m.min_stock ? 'critical' : ''}`}
                            layout
                        >
                            <div className="card-top">
                                <div className="icon-box">
                                    <Wheat size={24} />
                                </div>
                                <div className="actions">
                                    <button className="btn-icon" onClick={() => openModal(m)}><Edit2 size={16} /></button>
                                    <button className="btn-icon text-danger" onClick={() => handleDelete(m.id)}><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="card-content">
                                <h3>{m.name}</h3>
                                <div className="stock-display">
                                    <span className="amount">{m.quantity}</span>
                                    <span className="unit">{m.unit}</span>
                                </div>

                                {m.quantity <= m.min_stock && (
                                    <div className="alert-badge">
                                        <AlertTriangle size={14} />
                                        <span>Stock Faible</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-footer">
                                <span className="min-label">Min: {m.min_stock} {m.unit}</span>
                            </div>
                        </motion.div>
                    ))}
                    {filteredMaterials.length === 0 && (
                        <div className="empty-state card glass">
                            <Wheat size={48} opacity={0.2} />
                            <p>Aucune matière première trouvée.</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            className="modal-content card"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h2>{editingMaterial ? 'Modifier' : 'Ajouter'} un Ingrédient</h2>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Nom</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="ex: Farine de blé"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Quantité Actuelle</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Unité</label>
                                        <select
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="g">g</option>
                                            <option value="l">l</option>
                                            <option value="sac">sac</option>
                                            <option value="unité">unité</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Seuil d'alerte (Min)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.min_stock}
                                        onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={closeModal}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">Enregistrer</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
