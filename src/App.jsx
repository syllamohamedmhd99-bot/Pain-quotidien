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
import UsersManagement from './pages/UsersManagement';
import UserDetail from './pages/UserDetail';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const ProtectedRoute = ({ children, requiredPath, profile }) => {
  if (!profile) return null;
  if (profile.role === 'Administrateur') return children;

  if (profile.role === 'Staff' && Array.isArray(profile.permissions)) {
    if (profile.permissions.includes(requiredPath)) {
      return children;
    }

    // Special logic for nested invoices
    if (requiredPath.startsWith('/invoice/') && profile.permissions.includes('/invoices')) {
      return children;
    }
  }

  return <Navigate to="/" replace />;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState('default'); // 'default', 'matcha', 'ocean', 'berry'
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
                <Route path="/" element={<Dashboard profile={profile} />} />
                <Route path="/profile" element={<Profile session={session} />} />

                <Route path="/pos" element={<ProtectedRoute requiredPath="/pos" profile={profile}><POS /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute requiredPath="/inventory" profile={profile}><Inventory /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute requiredPath="/clients" profile={profile}><Clients /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute requiredPath="/suppliers" profile={profile}><Suppliers /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute requiredPath="/history" profile={profile}><History /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute requiredPath="/expenses" profile={profile}><Expenses /></ProtectedRoute>} />
                <Route path="/production" element={<ProtectedRoute requiredPath="/production" profile={profile}><Production /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute requiredPath="/invoices" profile={profile}><Invoices /></ProtectedRoute>} />
                <Route path="/invoices/new" element={<ProtectedRoute requiredPath="/invoices/new" profile={profile}><CreateInvoice /></ProtectedRoute>} />
                <Route path="/invoice/:id" element={<ProtectedRoute requiredPath="/invoice/:id" profile={profile}><Invoice /></ProtectedRoute>} />

                {/* Admin Only Routes */}
                <Route path="/users" element={isAdmin ? <UsersManagement /> : <Navigate to="/" />} />
                <Route path="/users/:id" element={isAdmin ? <UserDetail /> : <Navigate to="/" />} />
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
