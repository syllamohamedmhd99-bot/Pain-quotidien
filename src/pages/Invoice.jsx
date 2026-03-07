import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Printer, ArrowLeft, Receipt, Download, Share2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import WheatLogo from '../components/WheatLogo';
import './Invoice.css';

export default function Invoice() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [transaction, setTransaction] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchInvoiceData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const numericId = parseInt(id);
                if (isNaN(numericId)) throw new Error("ID invalide");

                // Fetch transaction details
                const { data: trxData, error: trxError } = await supabase
                    .from('transactions')
                    .select('*, clients(name, email, phone)')
                    .eq('id', numericId)
                    .single();

                if (trxError) throw trxError;
                setTransaction(trxData);

                // Fetch transaction items with product names
                const { data: itemsData, error: itemsError } = await supabase
                    .from('transaction_items')
                    .select('*, products(name)')
                    .eq('transaction_id', numericId);

                if (itemsError) throw itemsError;
                setItems(itemsData || []);

                // Fetch delivery fee if available
                const { data: delData } = await supabase
                    .from('deliveries')
                    .select('delivery_fee')
                    .eq('transaction_id', numericId)
                    .single();

                if (delData) {
                    setTransaction(prev => ({ ...prev, delivery_fee: delData.delivery_fee }));
                }

            } catch (error) {
                console.error("Error fetching invoice:", error);
                setTransaction(null);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceData();
    }, [id]);

    useEffect(() => {
        // Lancer automatiquement le téléchargement et l'impression si demandé
        if (!loading && transaction && location.state?.autoPrintAndDownload) {
            // Nettoyer l'état pour ne pas recommencer au rechargement de la page
            window.history.replaceState({}, document.title);

            // Attendre un court instant pour que le rendu soit parfait avant de générer le PDF
            setTimeout(async () => {
                await handleDownloadPDF();
                handlePrint();
            }, 500);
        }
    }, [loading, transaction, location.state]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const element = document.getElementById('invoice-content');
            const opt = {
                margin: 10,
                filename: `Facture_${transaction.trx_id}.pdf`,
                image: { type: 'jpeg', quality: 0.90 }, // Reduced quality slightly for speed
                html2canvas: { scale: 1.5, useCORS: true }, // Lowered scale for better performance, added CORS for external images if any
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // html2pdf returns a promise if used this way
            await html2pdf().set(opt).from(element).save();

        } catch (error) {
            console.error("Erreur lors de la génération du PDF:", error);
            alert("Une erreur est survenue lors de la création du PDF.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        const textMessage = `*Facture Pain Doré*\nN°: ${transaction.trx_id}\nTotal: ${transaction.total_amount.toLocaleString()} GNF\nDate: ${new Date(transaction.date).toLocaleDateString('fr-FR')}\n\nMerci de votre confiance !`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Facture ${transaction.trx_id}`,
                    text: textMessage,
                });
            } catch (err) {
                console.error("Partage annulé ou échoué:", err);
            }
        } else {
            alert("Votre navigateur ne supporte pas le partage direct. Vous pouvez télécharger la facture en PDF pour l'envoyer.");
        }
    };

    if (loading) return <div className="loading">Chargement de la facture...</div>;
    if (!transaction) return <div className="error">Facture non trouvée.</div>;

    return (
        <div className="invoice-view">
            <div className="invoice-actions no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Retour
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline" onClick={handleShare} title="Envoyer par WhatsApp, Email, etc.">
                        <Share2 size={18} /> Envoyer
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={handleDownloadPDF}
                        title="Télécharger en PDF"
                        disabled={isDownloading}
                        style={{ opacity: isDownloading ? 0.7 : 1, cursor: isDownloading ? 'wait' : 'pointer' }}
                    >
                        <Download size={18} /> {isDownloading ? "Génération..." : "Télécharger"}
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint} title="Imprimer">
                        <Printer size={18} /> Imprimer
                    </button>
                </div>
            </div>

            <div className="invoice-paper card glass" id="invoice-content">
                <div className="invoice-header">
                    <div className="brand">
                        <div className="brand-logo">
                            <WheatLogo size={40} />
                        </div>
                        <div>
                            <h1>Pain Doré</h1>
                            <p>Boulangerie Artisanale & Pâtisserie</p>
                        </div>
                    </div>
                    <div className="invoice-meta">
                        <h2>FACTURE</h2>
                        <p><strong>N°:</strong> {transaction.trx_id}</p>
                        <p><strong>Date:</strong> {new Date(transaction.date).toLocaleString('fr-FR')}</p>
                        <p><strong>Paiement:</strong> {transaction.payment_mode}</p>
                    </div>
                </div>

                <div className="invoice-info">
                    <div className="info-block">
                        <h3>Émetteur</h3>
                        <p><strong>Pain Doré SARL</strong></p>
                        <p>Conakry, Guinée</p>
                        <p>Tél: +224 00 00 00 00</p>
                    </div>
                    {transaction.clients && (
                        <div className="info-block">
                            <h3>Client</h3>
                            <p><strong>{transaction.clients.name}</strong></p>
                            {transaction.clients.email && <p>{transaction.clients.email}</p>}
                            {transaction.clients.phone && <p>{transaction.clients.phone}</p>}
                        </div>
                    )}
                </div>

                <div className="table-responsive">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Désignation</th>
                                <th className="text-right">Prix Unitaire</th>
                                <th className="text-center">Qté</th>
                                <th className="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.products?.name || "Produit inconnu"}</td>
                                    <td className="text-right">{item.unit_price.toLocaleString()} GNF</td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right">{(item.unit_price * item.quantity).toLocaleString()} GNF</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="invoice-total">
                    <div className="total-row">
                        <span>Sous-total</span>
                        <span>{transaction.total_amount.toLocaleString()} GNF</span>
                    </div>
                    {transaction.tax > 0 && (
                        <div className="total-row">
                            <span>Taxe (0%)</span>
                            <span>{transaction.tax.toLocaleString()} GNF</span>
                        </div>
                    )}
                    {transaction.delivery_fee > 0 && (
                        <div className="total-row">
                            <span>Frais de livraison</span>
                            <span>{transaction.delivery_fee.toLocaleString()} GNF</span>
                        </div>
                    )}
                    <div className="total-row grand-total">
                        <span>Total à payer</span>
                        <span>{((transaction.total_amount || 0) + (transaction.delivery_fee || 0)).toLocaleString()} GNF</span>
                    </div>
                </div>

                <div className="invoice-footer">
                    <p>Merci de votre confiance !</p>
                    <div className="invoice-stamp">
                        <Receipt size={40} />
                        <span>{transaction.payment_mode?.toUpperCase() || 'PAYÉ'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
