import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Printer, ArrowLeft, Truck, Download, User, MapPin, Package } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import WheatLogo from '../components/WheatLogo';
import './Invoice.css'; // Reusing invoice styles for consistency

export default function DeliveryNote() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [delivery, setDelivery] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchDeliveryData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Fetch delivery details
                const { data: delData, error: delError } = await supabase
                    .from('deliveries')
                    .select('id, transaction_id, destination, driver_name, delivery_date, status, delivery_fee, recipient_name, created_at, transactions(trx_id, date, clients(name, phone))')
                    .eq('id', id)
                    .single();

                if (delError) {
                    // If the join fails (e.g., transactions table missing or join error), try fetching without the join
                    console.warn("Initial fetch with join failed, attempting fallback:", delError.message);
                    const { data: fallbackDelData, error: fallbackDelError } = await supabase
                        .from('deliveries')
                        .select('id, transaction_id, destination, driver_name, delivery_date, status, delivery_fee, recipient_name, created_at') // Fetch specific columns
                        .eq('id', id)
                        .single();

                    if (fallbackDelError) throw fallbackDelError;
                    setDelivery(fallbackDelData);
                } else {
                    setDelivery(delData);
                }

                // Fetch delivery items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('delivery_items')
                    .select('*, products(name)')
                    .eq('delivery_id', id);

                if (itemsError) throw itemsError;
                setItems(itemsData || []);

            } catch (error) {
                console.error("Error fetching delivery note:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveryData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const element = document.getElementById('delivery-note-content');
            const opt = {
                margin: 10,
                filename: `Bon_Livraison_${delivery.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error("Erreur PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <div className="loading">Chargement...</div>;
    if (!delivery) return <div className="error">Livraison non trouvée.</div>;

    const displayDate = delivery.delivery_date ? new Date(delivery.delivery_date) : new Date(delivery.created_at);

    return (
        <div className="invoice-view">
            <div className="invoice-actions no-print">
                <button className="btn btn-outline" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Retour
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline" onClick={handleDownloadPDF} disabled={isDownloading}>
                        <Download size={18} /> {isDownloading ? "Génération..." : "Télécharger"}
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        <Printer size={18} /> Imprimer
                    </button>
                </div>
            </div>

            <div className="invoice-paper card glass" id="delivery-note-content">
                <div className="invoice-header">
                    <div className="brand">
                        <div className="brand-logo">
                            <WheatLogo size={40} />
                        </div>
                        <div>
                            <h1>Pain Doré</h1>
                            <p>Bon de Livraison</p>
                        </div>
                    </div>
                    <div className="invoice-meta">
                        <h2>BON DE LIVRAISON</h2>
                        <p><strong>Réf:</strong> DL-{delivery.id.toString().substring(0, 8).toUpperCase()}</p>
                        <p><strong>Date:</strong> {displayDate.toLocaleDateString('fr-FR')}</p>
                        {delivery.transactions && <p><strong>Commande:</strong> {(Array.isArray(delivery.transactions) ? delivery.transactions[0] : delivery.transactions)?.trx_id}</p>}
                    </div>
                </div>

                <div className="invoice-info">
                    <div className="info-block">
                        <h3>Expéditeur</h3>
                        <p><strong>Pain Doré SARL</strong></p>
                        <p>Conakry, Guinée</p>
                        <p>Tél: +224 00 00 00 00</p>
                    </div>
                    <div className="info-block">
                        <h3>Destinataire</h3>
                        <p><strong>{delivery.recipient_name || (Array.isArray(delivery.transactions) ? delivery.transactions[0] : delivery.transactions)?.clients?.name || "Client"}</strong></p>
                        <p><MapPin size={14} /> {delivery.destination}</p>
                        {((Array.isArray(delivery.transactions) ? delivery.transactions[0] : delivery.transactions)?.clients?.phone) && <p>Tél: {(Array.isArray(delivery.transactions) ? delivery.transactions[0] : delivery.transactions).clients.phone}</p>}
                    </div>
                </div>

                <div className="info-section card glass" style={{ marginBottom: '20px', padding: '15px' }}>
                    <p><strong>Chauffeur:</strong> {delivery.driver_name || 'Non assigné'}</p>
                    <p><strong>Statut:</strong> {delivery.status}</p>
                </div>

                <div className="table-responsive">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Désignation Produit</th>
                                <th className="text-center">Quantité Livrée</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.products?.name || "Produit"}</td>
                                    <td className="text-center"><strong>{item.quantity}</strong></td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="text-center">Aucun article spécifié</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="invoice-footer" style={{ marginTop: '50px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <p>Signature Chauffeur</p>
                            <div style={{ height: '80px', borderBottom: '1px solid #ccc' }}></div>
                        </div>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <p>Signature Client</p>
                            <div style={{ height: '80px', borderBottom: '1px solid #ccc' }}></div>
                        </div>
                    </div>
                    <p style={{ marginTop: '40px', fontSize: '0.8rem', color: '#666' }}>
                        Merci de votre confiance ! Document généré le {new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
