import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Sun, LayoutDashboard, CreditCard, Settings, LogOut } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import './App.css';
import { BASE_URL } from './config';

import Dashboard from './pages/Dashboard';
import PaymentPortal from './pages/PaymentPortal';
import Login from './pages/Login';
import CustomerDashboard from './pages/customer/CustomerDashboard';

const queryClient = new QueryClient();

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // The role claim key varies depending on the backend framework standard
        const userRole = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        setRole(userRole);
      } catch (err) {
        console.error('Invalid token', err);
        handleLogout();
      }
    } else {
      setRole(null);
    }
  }, [token]);

  // Fetch admin dashboard data
  const { data: dashboardData, isLoading: dataLoading, refetch: refreshData } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const t = localStorage.getItem('token');
      if (!t) throw new Error('No token');
      const response = await fetch(`${BASE_URL}/dashboard/systems`, {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      if (response.ok) {
        return response.json();
      } else if (response.status === 401) {
        handleLogout();
        throw new Error('Unauthorized');
      }
      throw new Error('Network response was not ok');
    },
    enabled: !!token && role === 'Admin',
    refetchInterval: 10000,
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setRole(null);
    queryClient.clear();
  };

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login setAuthToken={setToken} />} />
      </Routes>
    );
  }

  // Admin Layout
  if (role === 'Admin') {
    return (
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Sun size={28} className="logo-icon" />
            <span>SolarPay <span style={{fontWeight: 400}}>PAYGO</span></span>
          </div>
          
          <nav style={{ flex: 1 }}>
            <ul className="nav-links">
              <li>
                <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                  <LayoutDashboard size={20} />
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/payments" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                  <CreditCard size={20} />
                  Payment Portal
                </NavLink>
              </li>
              <li>
                <NavLink to="/settings" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                  <Settings size={20} />
                  Settings
                </NavLink>
              </li>
            </ul>
          </nav>

          <button onClick={handleLogout} className="action-btn" style={{ marginTop: 'auto', width: '100%', borderColor: 'var(--border-color)' }}>
            <LogOut size={16} /> Logout
          </button>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <Dashboard
                dashboardData={dashboardData}
                loading={dataLoading}
                refreshData={refreshData}
              />
            } />
            <Route path="/payments" element={
              <PaymentPortal
                systems={dashboardData ? (dashboardData.systems || dashboardData.Systems || []) : []}
                systemsLoading={dataLoading}
                refreshData={refreshData}
              />
            } />
            <Route path="/settings" element={
              <div className="glass-panel">
                <h2>Settings</h2>
                <p style={{color: 'var(--text-muted)', marginTop: '10px'}}>System configuration coming soon.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Customer Layout
  if (role === 'Customer') {
    return (
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <Sun size={28} className="logo-icon" />
            <span>My <span style={{fontWeight: 400}}>SolarPay</span></span>
          </div>
          
          <nav style={{ flex: 1 }}>
            <ul className="nav-links">
              <li>
                <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                  <LayoutDashboard size={20} />
                  My System
                </NavLink>
              </li>
            </ul>
          </nav>

          <button onClick={handleLogout} className="action-btn" style={{ marginTop: 'auto', width: '100%', borderColor: 'var(--border-color)' }}>
            <LogOut size={16} /> Logout
          </button>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<CustomerDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Fallback if role is not recognized
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2>Loading or Unauthorized...</h2>
      <button onClick={handleLogout} className="action-btn">Logout</button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Router>
  );
}

export default App;
