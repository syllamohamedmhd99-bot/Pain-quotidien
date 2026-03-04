import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Mail, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Profile.css';

export default function Profile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        role: 'Gérant',
        avatar_url: null,
        email: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            // Use the universal supabase client (handles local or online)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows"

            // Get session info for email
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email || 'admin@boulangerie.local';

            setProfile({
                ...(data || {}),
                full_name: data?.full_name || '',
                role: data?.role || 'Gérant',
                avatar_url: data?.avatar_url || null,
                email: userEmail
            });
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, avatar_url: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    full_name: profile.full_name,
                    role: profile.role,
                    avatar_url: profile.avatar_url,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            alert("Profil mis à jour avec succès !");
            window.location.reload();
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Erreur lors de la sauvegarde du profil.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Chargement du profil...</div>;

    return (
        <div className="profile-settings">
            <div className="profile-header">
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ArrowLeft size={18} />
                    Retour
                </button>
                <h1>Paramètres du Profil</h1>
                <p>Gérez vos informations personnelles et votre apparence.</p>
            </div>

            <motion.div
                className="profile-card card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <form onSubmit={handleSave}>
                    <div className="profile-avatar-section">
                        <div className="profile-avatar-wrapper">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="profile-avatar-large" />
                            ) : (
                                <div className="avatar-placeholder-large">
                                    {profile.full_name?.[0] || profile.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <label htmlFor="avatar-upload" className="change-avatar-btn">
                                <Camera size={20} />
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                />
                            </label>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3>Photo de Profil</h3>
                            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>PNG ou JPG. Max 2MB.</p>
                        </div>
                    </div>

                    <div className="profile-details-grid" style={{ marginTop: '2rem' }}>
                        <div className="form-group">
                            <label><User size={16} /> Nom Complet</label>
                            <input
                                type="text"
                                value={profile.full_name || ''}
                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                placeholder="Ex: Mohamed Sylla"
                            />
                        </div>
                        <div className="form-group">
                            <label><Mail size={16} /> Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                style={{ opacity: 0.7, cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="form-group">
                            <label><Shield size={16} /> Rôle</label>
                            <input
                                type="text"
                                value={profile.role || ''}
                                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                placeholder="Ex: Administrateur, Gérant..."
                            />
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => navigate('/')}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        >
                            <Save size={18} />
                            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
