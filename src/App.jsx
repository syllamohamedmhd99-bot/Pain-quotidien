import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import POS from './pages/POS';
import History from './pages/History';
import Auth from './pages/Auth';
import Invoice from './pages/Invoice';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Profile from './pages/Profile';
import Expenses from './pages/Expenses';
import Production from './pages/Production';
import Reports from './pages/Reports';
import ProductionCosts from './pages/ProductionCosts';
import UsersManagement from './pages/UsersManagement';
import UserDetail from './pages/UserDetail';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState('default'); // 'default', 'matcha', 'ocean', 'berry', 'sunset', 'lavender', 'midnight', 'eco'
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile in App:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const bodyClass = document.body.classList;
    bodyClass.remove('dark', 'theme-matcha', 'theme-ocean', 'theme-berry');

    if (darkMode) bodyClass.add('dark');
    if (theme !== 'default') bodyClass.add(`theme-${theme}`);

  }, [darkMode, theme]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
  }

  const isAdmin = profile?.role === 'Administrateur';

  // Composant pour protéger les routes individuellement par permissions
  const ProtectedRoute = ({ children, path }) => {
    if (loading) return null;
    if (!profile) return <Navigate to="/auth" />;
    if (isAdmin) return children; // L'admin a accès à tout

    const perms = profile.permissions || [];
    if (perms.includes(path) || path === '/' || path === '/profile') {
      return children;
    }

    // Sinon redirection vers le Dashboard
    return <Navigate to="/" replace />;
  };

  return (
    <Router>
      <Routes>
        {/* Full screen auth page without Layout */}
        <Route path="/auth" element={
          !session ? <Auth onLogin={() => { }} /> : <Navigate to="/" />
        } />

        {/* All other pages wrapped in Layout */}
        <Route path="/*" element={
          session ? (
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} theme={theme} setTheme={setTheme} onLogout={handleLogout} profile={profile}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<Profile session={session} />} />

                <Route path="/pos" element={<ProtectedRoute path="/pos"><POS /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute path="/inventory"><Inventory /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute path="/clients"><Clients /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute path="/suppliers"><Suppliers /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute path="/history"><History /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute path="/expenses"><Expenses /></ProtectedRoute>} />
                <Route path="/production-costs" element={<ProtectedRoute path="/production-costs"><ProductionCosts /></ProtectedRoute>} />
                <Route path="/production" element={<ProtectedRoute path="/production"><Production /></ProtectedRoute>} />

                {/* Facturation et ses sous-pages */}
                <Route path="/invoices" element={<ProtectedRoute path="/invoices"><Invoices /></ProtectedRoute>} />
                <Route path="/invoices/new" element={<ProtectedRoute path="/invoices/new"><CreateInvoice /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute path="/reports"><Reports /></ProtectedRoute>} />

                <Route path="/invoice/:id" element={<Invoice />} />

                {/* Admin Only Routes */}
                {isAdmin && (
                  <>
                    <Route path="/admin/users" element={<UsersManagement />} />
                    <Route path="/admin/user/:id" element={<UserDetail />} />
                  </>
                )}

                {/* Redirect unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

            </Layout>
          ) : (
            <Navigate to="/auth" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
