import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Inventory.css';

const categories = ["Tous", "Pains", "Viennoiseries", "Pâtisseries"];
const productCategories = ["Pains", "Viennoiseries", "Pâtisseries", "Boissons"];

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [filter, setFilter] = useState("Tous");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "Pain", // Changed from "Pains" to "Pain"
        price: "",
        stock: "",
        min_stock: 10, // Added min_stock
        status: "En stock",
        image: ""
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p => {
        const matchesCategory = filter === "Tous" || p.category === filter;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;

        try {
            // 1. Dissocier le produit de ses lignes de transaction
            await supabase
                .from('transaction_items')
                .update({ product_id: null })
                .eq('product_id', id);

            // 2. Supprimer le produit
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression : " + (err.message || err.details || ""));
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                category: product.category,
                price: parseFloat(product.price), // Parse to float
                stock: parseInt(product.stock), // Parse to int
                min_stock: parseInt(product.min_stock || 10), // Parse to int, default to 10
                status: product.status,
                image: product.image || ""
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: "",
                category: "Pain", // Changed from "Pains" to "Pain"
                price: "",
                stock: "",
                min_stock: 10, // Default for new product
                status: "En stock",
                image: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock),
            min_stock: Number(formData.min_stock), // Include min_stock in payload
            updated_at: new Date().toISOString()
        };

        try {
            if (editingProduct) {
                // Mise à jour (UPDATE)
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);

                if (error) throw error;
            } else {
                // Création (INSERT)
                const { error } = await supabase
                    .from('products')
                    .insert([payload]);

                if (error) throw error;
            }
            fetchProducts();
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
        <div className="inventory">
            <div className="inventory-header">
                <div>
                    <h1>Inventaire</h1>
                    <p>Gérez vos produits, prix et stocks.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={handlePrint}>
                        <Printer size={18} />
                        Imprimer
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Nouveau Produit
                    </button>
                </div>
            </div>

            <div className="inventory-controls card">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="category-filters">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-btn ${filter === cat ? 'active' : ''}`}
                            onClick={() => setFilter(cat)}
                        >
                            {cat}
                            {filter === cat && (
                                <motion.div layoutId="filter-pill" className="filter-pill" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <motion.div className="products-grid" layout>
                <AnimatePresence>
                    {filteredProducts.map((product) => (
                        <motion.div
                            key={product.id}
                            className="product-card card"
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="product-image">
                                <img src={product.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"} alt={product.name} />
                                <span className={`status-pill ${product.stock <= 0 ? 'status-danger' : (product.stock <= product.min_stock ? 'status-warning' : 'status-success')}`}>
                                    {product.stock <= 0 ? 'Rupture' : (product.stock <= product.min_stock ? 'Stock Faible' : 'En stock')}
                                </span>
                            </div>

                            <div className="product-info">
                                <div className="product-meta">
                                    <span className="product-category">{product.category}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="action-btn" onClick={() => handleOpenModal(product)}><Edit2 size={16} /></button>
                                        <button className="action-btn delete-action" onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <h3 className="product-title">{product.name}</h3>

                                <div className="product-details">
                                    <div className="price-tag">{product.price.toLocaleString('fr-FR')} GNF</div>
                                    <div className="stock-info">
                                        <span className="stock-label">Stock disponible</span>
                                        <span className={`stock-count ${product.stock <= product.min_stock ? 'text-danger' : ''}`}>
                                            {product.stock} {product.category === 'Pain' ? 'unités' : 'kg'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {filteredProducts.length === 0 && !loading && (
                <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p>Aucun produit ne correspond à votre recherche.</p>
                </motion.div>
            )}

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
                            <h2>{editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}</h2>

                            <form onSubmit={handleSubmit} className="modal-form">
                                <div className="form-group">
                                    <label>Nom du Produit</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group form-row">
                                    <div className="input-half">
                                        <label>Prix (GNF)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-half">
                                        <label>Stock</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group form-row">
                                    <div className="input-half">
                                        <label>Seuil d'alerte (Min)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.min_stock}
                                            onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-half">
                                        <label>Catégorie</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-half">
                                        <label>Statut</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="En stock">En stock</option>
                                            <option value="Faible">Faible</option>
                                            <option value="Rupture">Rupture</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Image du Produit</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    {formData.image && (
                                        <div style={{ marginTop: '0.8rem', borderRadius: '8px', overflow: 'hidden', height: '120px', width: 'fit-content' }}>
                                            <img src={formData.image} alt="Aperçu" style={{ height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Annuler</button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
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
