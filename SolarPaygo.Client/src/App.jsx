import ScrollToTop from './components/ScrollToTop';
﻿import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Sun, LayoutDashboard, CreditCard, Settings, LogOut } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import './App.css';
import { BASE_URL } from './config';

import Dashboard from './pages/Dashboard';
import PaymentPortal from './pages/PaymentPortal';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import ImpersonationBanner from './components/ImpersonationBanner';
import LandingPage from './pages/landing/LandingPage';
import ContactPage from './pages/landing/ContactPage';
import InvestorsPage from './pages/landing/InvestorsPage';
import CustomerExperiencePage from './pages/landing/CustomerExperiencePage';
import PilotingProgrammePage from './pages/landing/PilotingProgrammePage';

const queryClient = new QueryClient();

// The role claim key varies depending on the backend framework standard.
// Returns null for a missing or undecodable token - the effect below is what
// actually logs the user out in that case.
function decodeRoleFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || null;
  } catch {
    return null;
  }
}

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  // Decoded synchronously on first render. Previously this started as null and was
  // only populated by the effect below, so on a page refresh every admin query
  // (which is gated on role === 'Admin') stayed disabled for that first render and
  // the dashboard could sit on "Loading..." instead of fetching.
  const [role, setRole] = useState(() => decodeRoleFromToken(localStorage.getItem('token')));
  const [ghostTarget, setGhostTarget] = useState(() => sessionStorage.getItem('impersonated_target'));
  const [ghostRole, setGhostRole] = useState(() => sessionStorage.getItem('impersonated_role'));
  const isImpersonating = !!sessionStorage.getItem('superadmin_master_token');

  const handleStartImpersonate = (impersonatedToken, targetRole, targetName) => {
    const currentMaster = localStorage.getItem('token');
    sessionStorage.setItem('superadmin_master_token', currentMaster);
    sessionStorage.setItem('impersonated_target', targetName);
    sessionStorage.setItem('impersonated_role', targetRole);
    setGhostTarget(targetName);
    setGhostRole(targetRole);

    localStorage.setItem('token', impersonatedToken);
    setToken(impersonatedToken);
    setRole(targetRole);
    queryClient.clear();
  };

  const handleExitImpersonate = () => {
    const masterToken = sessionStorage.getItem('superadmin_master_token');
    sessionStorage.removeItem('superadmin_master_token');
    sessionStorage.removeItem('impersonated_target');
    sessionStorage.removeItem('impersonated_role');
    setGhostTarget(null);
    setGhostRole(null);

    if (masterToken) {
      localStorage.setItem('token', masterToken);
      setToken(masterToken);
      setRole('SuperAdmin');
    } else {
      handleLogout();
    }
    queryClient.clear();
  };

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
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

  // Fetch the 3 fixed price bands (shared by Settings and Dashboard band-assignment UI)
  const { data: pricePlans, refetch: refreshPricePlans } = useQuery({
    queryKey: ['pricePlans'],
    queryFn: async () => {
      const t = localStorage.getItem('token');
      if (!t) throw new Error('No token');
      const response = await fetch(`${BASE_URL}/priceplan`, {
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/investors" element={<InvestorsPage />} />
        <Route path="/customer-experience" element={<CustomerExperiencePage />} />
        <Route path="/piloting-programme" element={<PilotingProgrammePage />} />
        <Route path="/login" element={<Login setAuthToken={setToken} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // SuperAdmin Layout
  if (role === 'SuperAdmin') {
    return (
      <>
        {isImpersonating && (
          <ImpersonationBanner role={ghostRole} target={ghostTarget} onExit={handleExitImpersonate} />
        )}
        <SuperAdminDashboard handleLogout={handleLogout} onImpersonate={handleStartImpersonate} />
      </>
    );
  }

  // Admin Layout
  if (role === 'Admin') {
    return (
      <div className="app-container" style={isImpersonating ? { paddingTop: '42px' } : {}}>
        {isImpersonating && (
          <ImpersonationBanner role={ghostRole} target={ghostTarget} onExit={handleExitImpersonate} />
        )}
        <aside className="sidebar">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ffffff', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex' }}>
              <img src="/idiasco-logo.png" alt="IDIASCO" style={{ height: '30px', width: 'auto' }} />
            </div>
            <span>IDIASCO <span style={{fontWeight: 400, color: '#f59e0b', fontSize: '0.85em'}}>PAYGO</span></span>
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
                pricePlans={pricePlans || []}
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
              <SettingsPage
                pricePlans={pricePlans || []}
                refreshPricePlans={refreshPricePlans}
              />
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
      <div className="app-container" style={isImpersonating ? { paddingTop: '42px' } : {}}>
        {isImpersonating && (
          <ImpersonationBanner role={ghostRole} target={ghostTarget} onExit={handleExitImpersonate} />
        )}
        <aside className="sidebar">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ffffff', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex' }}>
              <img src="/idiasco-logo.png" alt="IDIASCO" style={{ height: '30px', width: 'auto' }} />
            </div>
            <span>My <span style={{fontWeight: 400, color: '#10b981', fontSize: '0.85em'}}>IDIASCO</span></span>
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
      <ScrollToTop />
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Router>
  );
}

export default App;

