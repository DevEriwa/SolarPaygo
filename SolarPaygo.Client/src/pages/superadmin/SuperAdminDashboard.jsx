import React, { useState, useEffect } from 'react';
import {
  Shield, Server, Zap, CheckCircle, XCircle, LogOut,
  Eye, RefreshCw, Search
} from 'lucide-react';
import { BASE_URL } from '../../config';

export default function SuperAdminDashboard({ handleLogout, onImpersonate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/superadmin/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed fetching superadmin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleAdmin = async (adminId, currentStatus) => {
    const newStatus = !currentStatus;
    const confirmMsg = newStatus 
      ? 'Activate this administrator account?' 
      : 'Deactivate this administrator account? They will be locked out of the portal.';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(prev => ({ ...prev, [`admin_${adminId}`]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/superadmin/toggle-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: adminId, isActive: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.text();
        alert('Action failed: ' + err);
      }
    } catch (err) {
      alert('Error communicating with server');
    } finally {
      setActionLoading(prev => ({ ...prev, [`admin_${adminId}`]: false }));
    }
  };

  const handleToggleCustomer = async (systemId, currentStatus) => {
    const isCurrentlyActive = currentStatus === 'Active';
    const newStatus = !isCurrentlyActive;
    const confirmMsg = newStatus 
      ? 'Activate customer account?' 
      : 'Deactivate customer account? The customer will be unable to log in to the portal.';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(prev => ({ ...prev, [`cust_${systemId}`]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/superadmin/toggle-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: systemId, isActive: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.text();
        alert('Action failed: ' + err);
      }
    } catch (err) {
      alert('Error communicating with server');
    } finally {
      setActionLoading(prev => ({ ...prev, [`cust_${systemId}`]: false }));
    }
  };

  const handleStartImpersonate = async (targetType, targetIdentifier, displayName) => {
    setActionLoading(prev => ({ ...prev, [`imp_${targetIdentifier}`]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/superadmin/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetType, targetIdentifier: String(targetIdentifier) })
      });
      if (res.ok) {
        const result = await res.json();
        onImpersonate(result.token, result.role, displayName || result.target);
      } else {
        const err = await res.text();
        alert('Impersonation failed: ' + err);
      }
    } catch (err) {
      alert('Network error during impersonation');
    } finally {
      setActionLoading(prev => ({ ...prev, [`imp_${targetIdentifier}`]: false }));
    }
  };

  const filteredCustomers = (data?.customers || []).filter(c => {
    const q = search.toLowerCase();
    return (
      (c.ownerName && c.ownerName.toLowerCase().includes(q)) ||
      (c.customerEmail && c.customerEmail.toLowerCase().includes(q)) ||
      (c.hardwareId && c.hardwareId.toLowerCase().includes(q)) ||
      (c.stronMeterId && c.stronMeterId.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <header style={{
        background: '#0d1322',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <img src="/idiasco-logo.png" alt="IDIASCO" style={{ height: '36px', width: 'auto' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>IDIASCO</span>
              <span style={{
                background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                SUPERADMIN CONSOLE
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Complete Fleet Operations, User Control & Stealth Impersonation</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Total Fleet Systems</span>
              <Server size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {data?.summary?.totalSystems ?? '...'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
              {data?.summary?.activeSystems ?? 0} Active Deployments
            </div>
          </div>

          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Total System Balance</span>
              <Zap size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
              &#8358;{Number(data?.summary?.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Cumulative Prepaid Vault
            </div>
          </div>

          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>System Administrators</span>
              <Shield size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {data?.admins?.length ?? '...'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a855f7', marginTop: '4px' }}>
              Authorized Administrative Accounts
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('customers')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'customers' ? '3px solid #f59e0b' : '3px solid transparent',
              color: activeTab === 'customers' ? '#f8fafc' : '#94a3b8',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Customer Systems Directory ({data?.customers?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'admins' ? '3px solid #8b5cf6' : '3px solid transparent',
              color: activeTab === 'admins' ? '#f8fafc' : '#94a3b8',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Administrator Accounts ({data?.admins?.length || 0})
          </button>
        </div>

        {/* TAB 1: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>All Customer Accounts</h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Monitor real-time status, manage deactivation, or impersonate customer sessions.</p>
              </div>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search name, email, meter, hardware..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Customer Name</th>
                    <th style={{ padding: '12px 16px' }}>Email & Contact</th>
                    <th style={{ padding: '12px 16px' }}>Hardware / Meter ID</th>
                    <th style={{ padding: '12px 16px' }}>Prepaid Balance</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                        No customers found matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr key={cust.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#ffffff' }}>
                          {cust.ownerName || 'Unnamed Customer'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                          <div>{cust.customerEmail || 'No email'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cust.customerPhone || 'No phone'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                          <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                            {cust.hardwareId}
                          </span>
                          {cust.stronMeterId && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                              Meter: {cust.stronMeterId}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#f59e0b' }}>
                          &#8358;{Number(cust.prepaidNairaBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: cust.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: cust.status === 'Active' ? '#10b981' : '#ef4444'
                          }}>
                            {cust.status === 'Active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {cust.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleCustomer(cust.id, cust.status)}
                              disabled={actionLoading[`cust_${cust.id}`]}
                              style={{
                                background: cust.status === 'Active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid ' + (cust.status === 'Active' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'),
                                color: cust.status === 'Active' ? '#ef4444' : '#10b981',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}
                            >
                              {cust.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => handleStartImpersonate('Customer', cust.id, cust.ownerName || cust.customerEmail || cust.hardwareId)}
                              disabled={actionLoading[`imp_${cust.id}`]}
                              style={{
                                background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                                border: 'none',
                                color: '#ffffff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                              }}
                            >
                              <Eye size={13} /> Impersonate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ADMINS */}
        {activeTab === 'admins' && (
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>System Administrators</h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Review administrative accounts, toggle permissions, or enter admin sessions.</p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Username</th>
                    <th style={{ padding: '12px 16px' }}>Assigned Role</th>
                    <th style={{ padding: '12px 16px' }}>Account Status</th>
                    <th style={{ padding: '12px 16px' }}>Created Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.admins || []).map(adm => (
                    <tr key={adm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#ffffff' }}>
                        {adm.username}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: adm.role === 'SuperAdmin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: adm.role === 'SuperAdmin' ? '#a78bfa' : '#60a5fa',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {adm.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: adm.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: adm.isActive ? '#10b981' : '#ef4444'
                        }}>
                          {adm.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {adm.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {new Date(adm.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {adm.role !== 'SuperAdmin' && (
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleAdmin(adm.id, adm.isActive)}
                              disabled={actionLoading[`admin_${adm.id}`]}
                              style={{
                                background: adm.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid ' + (adm.isActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'),
                                color: adm.isActive ? '#ef4444' : '#10b981',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}
                            >
                              {adm.isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => handleStartImpersonate('Admin', adm.username, adm.username)}
                              disabled={actionLoading[`imp_${adm.username}`]}
                              style={{
                                background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                                border: 'none',
                                color: '#ffffff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                              }}
                            >
                              <Eye size={13} /> Impersonate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
