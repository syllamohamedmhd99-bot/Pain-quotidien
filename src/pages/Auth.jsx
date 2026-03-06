import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, LogIn, UserPlus, Croissant } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WheatLogo from '../components/WheatLogo';
import { supabase } from '../supabaseClient';
import './Auth.css';

export default function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // session is handled by onAuthStateChange in App.jsx
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
                if (error) throw error;
                alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
                setIsLogin(true);
            }
        } catch (error) {
            setErrorMsg(error.message || 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    // Animation variants for the form container
    const formVariants = {
        hidden: { opacity: 0, x: isLogin ? -50 : 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
        exit: { opacity: 0, x: isLogin ? 50 : -50, transition: { duration: 0.3 } }
    };

    // Generate random floating particles
    const particles = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            size: Math.random() * 12 + 4, // 4px to 16px
            x: Math.random() * 100, // 0 to 100 view width
            delay: Math.random() * 8, // Staggered start times
            duration: Math.random() * 15 + 15 // 15s to 30s for slow floating
        }));
    }, []);


    return (
        <div className="auth-container">
            {/* Animated Background Shapes */}
            <div className="auth-bg-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            {/* Small floating particles animation */}
            <div className="particles-container">
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        className="particle"
                        style={{
                            width: p.size,
                            height: p.size,
                            left: `${p.x}vw`,
                        }}
                        initial={{ y: '100vh', opacity: 0 }}
                        animate={{
                            y: '-10vh',
                            opacity: [0, 1, 1, 0],
                            x: `calc(${p.x}vw + ${Math.random() * 40 - 20}px)`
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <div className="auth-header">
                    <motion.div
                        className="auth-logo"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <WheatLogo size={48} />
                    </motion.div>
                    <motion.h2
                        className="auth-title"
                        key={isLogin ? 'login-title' : 'register-title'}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isLogin ? 'Bon retour !' : 'Rejoignez-nous'}
                    </motion.h2>
                    <p className="auth-subtitle">
                        {isLogin ? 'Connectez-vous pour gérer votre boulangerie' : 'Créez votre compte Pain Doré'}
                    </p>
                </div>

                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ color: 'var(--danger-color)', backgroundColor: 'color-mix(in srgb, var(--danger-color) 10%, transparent)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}
                    >
                        {errorMsg}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    <motion.form
                        key={isLogin ? 'login-form' : 'register-form'}
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="auth-form"
                        onSubmit={handleSubmit}
                    >
                        {!isLogin && (
                            <div className="input-group">
                                <User className="input-icon" size={20} />
                                <input
                                    type="text"
                                    className="auth-input"
                                    placeholder="Nom complet"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="input-group">
                            <Mail className="input-icon" size={20} />
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="Adresse email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <Lock className="input-icon" size={20} />
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="Mot de passe"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {isLogin && (
                            <a href="#" className="forgot-password">Mot de passe oublié ?</a>
                        )}

                        <motion.button
                            type="submit"
                            className="auth-submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {loading ? 'Chargement...' : isLogin ? (
                                    <><LogIn size={20} /> Se connecter</>
                                ) : (
                                    <><UserPlus size={20} /> S'inscrire</>
                                )}
                            </span>
                        </motion.button>
                    </motion.form>
                </AnimatePresence>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                        <button type="button" onClick={toggleMode} className="auth-toggle-btn">
                            {isLogin ? "S'inscrire" : "Se connecter"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
