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
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState('default'); // 'default', 'matcha', 'ocean', 'berry'
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
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
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} theme={theme} setTheme={setTheme} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/history" element={<History />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<CreateInvoice />} />
                <Route path="/invoice/:id" element={<Invoice />} />
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
