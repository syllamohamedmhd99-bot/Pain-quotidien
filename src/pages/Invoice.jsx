import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Printer, ArrowLeft, Receipt } from 'lucide-react';
import './Invoice.css';

export default function Invoice() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

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

            } catch (error) {
                console.error("Error fetching invoice:", error);
                setTransaction(null);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="loading">Chargement de la facture...</div>;
    if (!transaction) return <div className="error">Facture non trouvée.</div>;

    return (
        <div className="invoice-view">
            <div className="invoice-actions no-print">
                <button className="btn btn-outline" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Retour
                </button>
                <button className="btn btn-primary" onClick={handlePrint}>
                    <Printer size={18} /> Imprimer la Facture
                </button>
            </div>

            <div className="invoice-paper card glass">
                <div className="invoice-header">
                    <div className="brand">
                        <div className="brand-logo">🥖</div>
                        <div>
                            <h1>Pain Quotidien</h1>
                            <p>Boulangerie Artisanale & Pâtisserie</p>
                        </div>
                    </div>
                    <div className="invoice-meta">
                        <h2>FACTURE</h2>
                        <p><strong>N°:</strong> {transaction.trx_id}</p>
                        <p><strong>Date:</strong> {new Date(transaction.date).toLocaleString('fr-FR')}</p>
                    </div>
                </div>

                <div className="invoice-info">
                    <div className="info-block">
                        <h3>Émetteur</h3>
                        <p><strong>Pain Quotidien SARL</strong></p>
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
                    <div className="total-row grand-total">
                        <span>Total à payer</span>
                        <span>{transaction.total_amount.toLocaleString()} GNF</span>
                    </div>
                </div>

                <div className="invoice-footer">
                    <p>Merci de votre confiance !</p>
                    <div className="invoice-stamp">
                        <Receipt size={40} />
                        <span>PAYÉ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
