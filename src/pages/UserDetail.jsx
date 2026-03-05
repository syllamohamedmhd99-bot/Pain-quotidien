import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserCog, Mail, Shield, Save, Trash2, Calendar, FileText, ShoppingBag, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CRM.css'; // On réutilise les styles CRM

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [instructions, setInstructions] = useState("");
    const [isSavingMsg, setIsSavingMsg] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Statistiques rapides
    const [stats, setStats] = useState({
        totalSales: 0,
        totalSalesAmount: 0,
        lastActive: 'Inconnu'
    });

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Profile
                const { data: prof, error: profError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (profError) throw profError;
                setProfile(prof);
                setInstructions(prof?.instructions || "");

                // 2. Fetch User's Recent Sales (Transactions)
                const { data: sales, error: salesError } = await supabase
                    .from('transactions')
                    .select('total_amount, created_at')
                    .eq('type', 'Vente')
                    //.eq('created_by', id) // Idéalement, si vous stockez l'ID de créateur dans la transaction
                    // Pour l'instant, si vous n'avez pas de colonne created_by dans transactions, 
                    // ces stats seront globales ou vides. Ajustez selon votre schéma.
                    .limit(50);

                if (!salesError && sales && sales.length > 0) {
                    setStats({
                        totalSales: sales.length,
                        totalSalesAmount: sales.reduce((sum, s) => sum + s.total_amount, 0),
                        lastActive: new Date(sales[0].created_at).toLocaleDateString('fr-FR')
                    });
                }

            } catch (error) {
                console.error("Erreur lors de la récupération :", error);
                alert("Impossible de charger les détails de l'utilisateur : " + error.message);
                navigate('/admin/users');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchUserData();
    }, [id, navigate]);

    const handleSaveInstructions = async () => {
        setIsSavingMsg(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ instructions: instructions, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            alert("Instructions enregistrées avec succès ! Elles apparaîtront sur le tableau de bord de cet utilisateur.");
        } catch (error) {
            console.error("Save Instructions Error:", error);
            alert("Erreur lors de l'enregistrement : " + error.message);
        } finally {
            setIsSavingMsg(false);
        }
    };

    const handleDeleteUser = async () => {
        const confirmDelete = window.confirm(`Voulez-vous VRAIMENT supprimer définitivement le compte de ${profile?.full_name || 'cet utilisateur'} ? Cette action est irréversible.`);
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Vous n'êtes pas connecté.");

            // Appeler la fonction Serverless Vercel pour supprimer l'utilisateur via l'API Admin
            const response = await fetch('/api/deleteUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ targetUserId: id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de la suppression");
            }

            alert("Utilisateur supprimé avec succès.");
            navigate('/admin/users');
        } catch (error) {
            console.error("Delete User Error:", error);
            alert("Erreur lors de la suppression : " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>Chargement du profil...</div>;
    if (!profile) return null;

    return (
        <div className="crm-page">
            <div className="crm-header" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn-icon" onClick={() => navigate('/admin/users')} style={{ padding: '0.5rem', background: 'var(--bg-secondary)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>Profil de {profile.full_name || 'Utilisateur'}</h1>
                        <p>Supervision et instructions pour ce compte.</p>
                    </div>
                </div>
                <div className={`badge ${profile.role === 'Administrateur' ? 'badge-primary' : 'badge-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    {profile.role === 'Administrateur' ? <Shield size={16} style={{ marginRight: 8 }} /> : <UserCog size={16} style={{ marginRight: 8 }} />}
                    {profile.role}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
                {/* Colonne Principale */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Section Instructions */}
                    <motion.div className="card glass p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem' }}>
                            <FileText size={20} color="var(--primary-color)" />
                            Instructions & Directives
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            Laissez un message ou des consignes à cet utilisateur. Ce texte s'affichera de manière très visible sur son Tableau de Bord dès sa prochaine connexion.
                        </p>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Ex: N'oublie pas de recompter la caisse ce soir. Fais attention à l'inventaire des baguettes..."
                            style={{
                                width: '100%',
                                minHeight: '150px',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontFamily: 'inherit',
                                fontSize: '1rem',
                                resize: 'vertical'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn btn-primary" onClick={handleSaveInstructions} disabled={isSavingMsg}>
                                {isSavingMsg ? 'Enregistrement...' : <><Save size={18} /><span>Enregistrer les instructions</span></>}
                            </button>
                        </div>
                    </motion.div>

                    {/* Section Historique d'Activité (Aperçu) */}
                    <motion.div className="card glass p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.2rem' }}>
                            <Calendar size={20} color="var(--primary-color)" />
                            Dernières activités (Aperçu)
                        </h2>
                        {stats.totalSales > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="stat-card" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--success-color) 20%, transparent)', color: 'var(--success-color)', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalSales}</div>
                                    <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ventes réalisées</div>
                                </div>
                                <div className="stat-card" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--primary-color) 20%, transparent)', color: 'var(--primary-color)', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalSalesAmount.toLocaleString('fr-FR')} GNF</div>
                                    <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Chiffre généré (Est.)</div>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Les statistiques d'activités fines pour cet utilisateur arriveront dans une prochaine mise à jour.</p>
                        )}
                        <div style={{ marginTop: '1.5rem' }}>
                            <button className="btn btn-outline" onClick={() => navigate('/history')}>Voir l'historique complet</button>
                        </div>
                    </motion.div>

                </div>

                {/* Colonne Latérale */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Infos basiques */}
                    <div className="card glass p-4">
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Informations</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={16} color="var(--text-secondary)" />
                                <span style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{profile.user_id}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={16} color="var(--text-secondary)" />
                                <span style={{ fontSize: '0.9rem' }}>Droits : {profile.role}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} color="var(--text-secondary)" />
                                <span style={{ fontSize: '0.9rem' }}>Créé le : {new Date(profile.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Zone Danger */}
                    {profile.role !== 'Administrateur' && (
                        <div className="card" style={{ border: '1px solid color-mix(in srgb, var(--danger-color) 30%, transparent)', background: 'color-mix(in srgb, var(--danger-color) 5%, transparent)', padding: '1.5rem' }}>
                            <h3 style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
                                <AlertCircle size={18} />
                                Zone Dangereuse
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                                La suppression de ce compte bloquera son accès au système de façon irréversible. Toutes les factures et données créées par lui seront conservées.
                            </p>
                            <button
                                className="btn"
                                style={{ width: '100%', background: 'var(--danger-color)', color: 'white', border: 'none' }}
                                onClick={handleDeleteUser}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Suppression...' : <><Trash2 size={16} /> Supprimer le compte</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
