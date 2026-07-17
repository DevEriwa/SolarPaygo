import React, { useState, useEffect } from 'react';
import { Lock, Unlock, MinusCircle, CreditCard, Plus, Activity, User, ShieldAlert, BadgeCheck, Phone, Mail, FileText } from 'lucide-react';
import { BASE_URL } from '../config';

export default function Dashboard({ dashboardData, loading, refreshData }) {
  const [filter, setFilter] = useState('All');
  
  // Registration modal states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regHardwareId, setRegHardwareId] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regMeterId, setRegMeterId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBvn, setRegBvn] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGeneratorCapacity, setRegGeneratorCapacity] = useState('2KV');
  const [regError, setRegError] = useState(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [relayError, setRelayError] = useState(null);
  const [relayLoading, setRelayLoading] = useState(null); // id of system being toggled

  // Derive summary from passed-in data
  const summary = dashboardData || { systems: [], revenueToday: 0, recentPayments: [] };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const formattedDob = regDob ? new Date(regDob).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
const response = await fetch(`${BASE_URL}/dashboard/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },

        body: JSON.stringify({
          hardwareId: regHardwareId.trim(),
          ownerName: regOwnerName.trim(),
          stronMeterId: regMeterId.trim(),
          customerEmail: regEmail.trim(),
          customerPhone: regPhone.trim(),
          customerBvn: regBvn.trim(),
          customerDob: formattedDob,
          customerGender: regGender,
          generatorCapacity: regGeneratorCapacity
        })
      });

      if (response.ok) {
        setRegSuccess(true);
        setRegHardwareId('');
        setRegOwnerName('');
        setRegMeterId('');
        setRegEmail('');
        setRegPhone('');
        setRegBvn('');
        setRegDob('');
        setRegGeneratorCapacity('2KV');
        refreshData();
        setTimeout(() => setIsRegisterOpen(false), 2000);
      } else {
        const txt = await response.text();
        setRegError(txt || "Failed to register device.");
      }
    } catch (err) {
      setRegError("Connection to backend API failed.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleToggleState = async (id, action) => {
    setRelayError(null);
    setRelayLoading(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/dashboard/systems/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        refreshData(); // Re-fetch shared data in App.jsx
      } else {
        // Try to read a meaningful error from the backend
        try {
          const errData = await response.json();
          setRelayError(errData.message || `Action "${action}" failed (${response.status})`);
        } catch {
          setRelayError(`Action "${action}" failed (${response.status})`);
        }
      }
    } catch (err) {
      setRelayError(`Network error: could not reach API for system ${id}`);
      console.error(`Failed to ${action} system ${id}`);
    } finally {
      setRelayLoading(null);
    }
  };

  const [expandedSystemId, setExpandedSystemId] = useState(null);
  const [stronTokenResult, setStronTokenResult] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  const handleAdminAction = async (id, action, body = null) => {
    setRelayError(null);
    setStronTokenResult(null);
    setAdminActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      if (body) {
        config.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${BASE_URL}/dashboard/systems/${id}/${action}`, config);
      const data = await response.json();
      
      if (response.ok) {
        setStronTokenResult({
          token: data.token || null,
          message: data.message || "Action completed successfully."
        });
        refreshData();
      } else {
        setRelayError(data.message || `Action failed with status ${response.status}`);
      }
    } catch (err) {
      setRelayError("Network connection error. Check if backend API is reachable.");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const systems = summary.systems || summary.Systems || [];
  const activeSystems = systems.filter(s => s.status === 'Active' || s.status === 'active');
  const lockedSystems = systems.filter(s => s.status === 'Locked' || s.status === 'locked');
  const filteredSystems = filter === 'All' ? systems : systems.filter(s => s.status === filter);

  // Derive overall sync health: green if ALL meters with a Stron ID reported online, orange/red otherwise
  const metersWithId = systems.filter(s => s.stronMeterId || s.StronMeterId);
  const onlineCount = metersWithId.filter(s => s.meterOnline || s.MeterOnline).length;
  const syncStatus = metersWithId.length === 0 ? 'none' : onlineCount === metersWithId.length ? 'online' : onlineCount === 0 ? 'offline' : 'partial';

  // Formatting helpers
  const formatNaira = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.getDate() === today.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (today.getDate() - d.getDate() === 1) return 'Yesterday';
    return `${today.getDate() - d.getDate()} days ago`;
  };

  return (
    <div className="dashboard-container" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Platform Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>STE18-G Smart Meter Vending & Squad Virtual Accounts Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => { setRegSuccess(false); setRegError(null); setIsRegisterOpen(true); }} className="action-btn" style={{ background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)', flexDirection: 'row', gap: '8px', padding: '8px 16px' }}>
            <Plus size={18} /> Register Generator
          </button>
          <div className="live-badge" style={{
            background: syncStatus === 'online' ? 'rgba(16,185,129,0.15)' : syncStatus === 'offline' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${syncStatus === 'online' ? 'rgba(16,185,129,0.4)' : syncStatus === 'offline' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
            color: syncStatus === 'online' ? 'var(--success)' : syncStatus === 'offline' ? 'var(--danger)' : 'var(--warning)'
          }}>
            <div className="live-dot" style={{ background: syncStatus === 'online' ? 'var(--success)' : syncStatus === 'offline' ? 'var(--danger)' : 'var(--warning)' }}></div>
            {syncStatus === 'online' ? 'Meter Online' : syncStatus === 'offline' ? 'Meter Offline' : syncStatus === 'partial' ? 'Partial Sync' : 'No Meter ID'}
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Devices</h3>
          <div className="value blue">{systems.length}</div>
          <div className="sub-text">Registered systems</div>
        </div>
        <div className="stat-card">
          <h3>Active</h3>
          <div className="value green">{activeSystems.length}</div>
          <div className="sub-text">Currently running</div>
        </div>
        <div className="stat-card">
          <h3>Locked</h3>
          <div className="value red">{lockedSystems.length}</div>
          <div className="sub-text">Prepaid balance depleted</div>
        </div>
        <div className="stat-card">
          <h3>Revenue Today</h3>
          <div className="value yellow">{formatNaira(summary.revenueToday || summary.RevenueToday || 0)}</div>
          <div className="sub-text">{(summary.recentPayments || summary.RecentPayments || []).length} transactions</div>
        </div>
      </div>

      {/* SOLAR GENERATOR UNITS SECTION */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2>Solar Systems Status</h2>
          <div className="filter-tabs">
            {['All', 'Active', 'Locked', 'Disabled'].map(f => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {relayError && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', borderRadius: '8px', padding: '10px 16px', margin: '0 0 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
            <span>⚠️ {relayError}</span>
            <button onClick={() => setRelayError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Device & Customer</th>
              <th>Squad Virtual Account</th>
              <th>Naira Balance</th>
              <th>Meter Live Telemetry</th>
              <th>Energy Remaining</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map(sys => {
              const s = sys.status.toLowerCase();
              const totalBought = sys.cumulativeKwhBought || 0;
              const totalUsed = sys.cumulativeKwhConsumed || 0;
              const remaining = sys.availableUnits || 0;
              const generatorCapacityKw = parseFloat((sys.generatorCapacity || '2KV').replace(/[^0-9.]/g, '')) || 2;
              const maxCapacityKwh = generatorCapacityKw * 100; // display scale
              const percent = Math.min((remaining / Math.max(totalBought, 1)) * 100, 100).toFixed(0);
              const isDiscounted = sys.cumulativeKwhConsumed >= 500;
                         return (
                <React.Fragment key={sys.id}>
                  <tr 
                    onClick={() => { 
                      setExpandedSystemId(expandedSystemId === sys.id ? null : sys.id); 
                      setStronTokenResult(null); 
                    }} 
                    style={{ cursor: 'pointer', background: expandedSystemId === sys.id ? 'rgba(255,255,255,0.02)' : '' }}
                  >
                    {/* Device Info */}
                    <td>
                      <div className="device-name">{sys.ownerName || 'Unknown Unit'}</div>
                      <div className="device-id">{sys.hardwareId}</div>
                      {sys.stronMeterId && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary-accent)', marginTop: '4px', fontFamily: 'monospace' }}>
                          Meter: {sys.stronMeterId}
                        </div>
                      )}
                      {sys.generatorCapacity && (
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ background: 'rgba(250,200,50,0.12)', color: '#f5c842', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            ⚡ {sys.generatorCapacity} Generator
                          </span>
                        </div>
                      )}
                    </td>
                    
                    {/* Virtual Account details */}
                    <td>
                      {sys.virtualAccountNumber ? (
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#3b82f6' }}>{sys.virtualAccountNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sys.virtualBankName}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No VA Assigned</span>
                      )}
                    </td>

                    {/* Cash Balance */}
                    <td>
                      <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: sys.prepaidNairaBalance > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatNaira(sys.prepaidNairaBalance)}
                      </div>
                      {/* Tariff Label */}
                      <div style={{ marginTop: '4px' }}>
                        {isDiscounted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            <BadgeCheck size={10} /> 50% Disc. (₦1,250/kWh)
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                            Std. Tariff (₦2,500/kWh)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Meter Live Telemetry */}
                    <td>
                      {sys.stronMeterId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          <div style={{ display: 'flex', gap: '8px', color: 'var(--text-main)' }}>
                            <span>{sys.voltage?.toFixed(1) || '0.0'}V</span>
                            <span>·</span>
                            <span>{sys.current?.toFixed(2) || '0.00'}A</span>
                            <span>·</span>
                            <span style={{ color: 'var(--primary-accent)' }}>{sys.power?.toFixed(0) || '0'}W</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            {sys.relayState === "1" ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>Relay Closed</span>
                            ) : (
                              <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>Relay Open (Cut)</span>
                            )}
                            
                            {sys.coverState === "1" && (
                              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <ShieldAlert size={10} /> Tamper
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Telemetry Offline</span>
                      )}
                    </td>

                    {/* Energy units Remaining */}
                    <td>
                      <div className="progress-container">
                        <div className="progress-track">
                          <div className={`progress-fill ${s}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="progress-text" style={{ color: remaining > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {remaining.toFixed(2)} kWh remaining
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span>📥 Bought: <strong>{totalBought.toFixed(2)} kWh</strong></span>
                          <span>📤 Used: <strong>{totalUsed.toFixed(2)} kWh</strong></span>
                        </div>
                      </div>
                    </td>

                    {/* Row actions */}
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                        {relayLoading === sys.id ? (
                          <button className="action-btn" style={{ padding: '6px 12px', opacity: 0.6 }} disabled>
                            ⏳ Sending...
                          </button>
                        ) : sys.relayState === '0' || sys.RelayState === '0' ? (
                          <button onClick={(e) => { e.stopPropagation(); handleToggleState(sys.id, 'relay-on'); }} className="action-btn unlock" style={{ padding: '6px 12px' }}>
                            <Unlock size={14} /> Close Relay
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleToggleState(sys.id, 'relay-off'); }} className="action-btn disable" style={{ padding: '6px 12px' }}>
                            <MinusCircle size={14} /> Lock Relay
                          </button>
                        )}
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setExpandedSystemId(expandedSystemId === sys.id ? null : sys.id); 
                            setStronTokenResult(null); 
                          }} 
                          className="action-btn" 
                          style={{ padding: '6px 12px', background: expandedSystemId === sys.id ? 'var(--primary-accent)' : 'rgba(255,255,255,0.03)', borderColor: expandedSystemId === sys.id ? 'var(--primary-accent)' : 'var(--border-color)', color: expandedSystemId === sys.id ? 'var(--bg-dark)' : 'white' }}
                        >
                          ⚙️ Manage Stron
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedSystemId === sys.id && (
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                      <td colSpan="6" style={{ padding: '20px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                          
                          {/* Stron Remote Operations */}
                          <div>
                            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ⚡ Hunan Stron AMI Smart Meter Commands
                            </h4>
                            
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                              <button 
                                onClick={() => handleAdminAction(sys.id, 'clear-tamper')}
                                disabled={adminActionLoading}
                                className="action-btn" 
                                style={{ flex: 1, padding: '10px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                              >
                                {adminActionLoading ? '⏳ Processing...' : 'Clear Tamper State'}
                              </button>
                              
                              <button 
                                onClick={() => {
                                  if (confirm(`Are you sure you want to completely reset all credit on the physical meter and database for system ${sys.hardwareId}? This will lock the system and reset the balance to 0.`)) {
                                    handleAdminAction(sys.id, 'clear-credit');
                                  }
                                }}
                                disabled={adminActionLoading}
                                className="action-btn" 
                                style={{ flex: 1, padding: '10px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              >
                                {adminActionLoading ? '⏳ Processing...' : 'Clear Credit (Reset)'}
                              </button>
                            </div>

                            {/* Token result display */}
                            {stronTokenResult && (
                              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold', marginBottom: '4px' }}>{stronTokenResult.message}</div>
                                {stronTokenResult.token && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STS 20-Digit Keypad Code:</span>
                                    <strong style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'var(--primary-accent)', letterSpacing: '1px' }}>
                                      {stronTokenResult.token}
                                    </strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Transmit Custom Token */}
                            <div style={{ marginTop: '12px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Transmit Custom STS Token (Remote OTA to Meter)</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                  type="text" 
                                  value={manualToken} 
                                  onChange={(e) => setManualToken(e.target.value)} 
                                  placeholder="e.g. 2043 2769 0230 2834 8888" 
                                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontFamily: 'monospace' }}
                                />
                                <button 
                                  onClick={() => {
                                    if (manualToken) {
                                      handleAdminAction(sys.id, 'send-token', { token: manualToken });
                                      setManualToken('');
                                    }
                                  }}
                                  disabled={adminActionLoading || !manualToken}
                                  className="action-btn"
                                  style={{ padding: '8px 16px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)' }}
                                >
                                  Send Token
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Meter Diagnostics Column */}
                          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '0.95rem' }}>📋 Live Telemetry Diagnostics</h4>
                            <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div><span style={{ color: 'white' }}>Meter Status:</span> {sys.meterOnline || sys.MeterOnline ? '🟢 Online (Connected)' : '🔴 Offline (Unreachable)'}</div>
                              <div><span style={{ color: 'white' }}>Physical Switch (Relay):</span> {sys.relayState === '1' ? 'Closed (Power ON)' : 'Open (Power OFF)'}</div>
                              <div><span style={{ color: 'white' }}>Cover State (Tamper):</span> {sys.coverState === '1' ? '⚠️ TAMPER ACTIVE (OPEN)' : 'Normal'}</div>
                              <div><span style={{ color: 'white' }}>Voltage / Current:</span> {sys.voltage?.toFixed(1) || '0.0'} V / {sys.current?.toFixed(2) || '0.00'} A</div>
                              <div><span style={{ color: 'white' }}>Active Load Draw:</span> {sys.power?.toFixed(0) || '0'} W (Max: {sys.maxLoadWatts || 2000} W)</div>
                              <div><span style={{ color: 'white' }}>Cumulative Consumption:</span> {totalUsed.toFixed(2)} kWh</div>
                              <div><span style={{ color: 'white' }}>Customer Phone/Email:</span> {sys.customerPhone || 'N/A'} / {sys.customerEmail || 'N/A'}</div>
                              <div><span style={{ color: 'white' }}>Last Sync Time:</span> {sys.lastSyncTime ? new Date(sys.lastSyncTime).toLocaleString() : 'Never'}</div>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredSystems.length === 0 && !loading && (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No systems match filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* RECENT PAYMENTS SCROLL */}
      <div className="recent-payments-container">
        <h2 className="section-title">Recent Payments & STS Tokens Generated</h2>
        <div className="payments-scroll">
          {(summary.recentPayments || summary.RecentPayments)?.map((payment, i) => (
            <div className="payment-card" key={payment.id || i} style={{ minWidth: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="p-id">{payment.hardwareId}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(payment.transactionDate)}</span>
              </div>
              <div className="p-amount">{formatNaira(payment.amountPaid)}</div>
              <div className="p-details" style={{ marginTop: '8px' }}>
                <span className="p-units">+{payment.unitsAdded?.toFixed(2)} kWh</span>
                {payment.stsToken && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: '6px', padding: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>STS Keypad Code:</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary-accent)', fontSize: '0.95rem', letterSpacing: '1px', textAlign: 'center' }}>{payment.stsToken}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!(summary.recentPayments || summary.RecentPayments) || (summary.recentPayments || summary.RecentPayments).length === 0) && !loading && (
            <div style={{ color: 'var(--text-muted)', padding: '20px' }}>No recent payments today.</div>
          )}
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {isRegisterOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'white', margin: 0 }}>Register New Prepaid Generator</h2>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {regError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                {regError}
              </div>
            )}
            
            {regSuccess && (
              <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                Generator registered! Creating Squad Virtual Account...
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Hardware ID (System Serial)</label>
                  <div style={{ position: 'relative' }}>
                    <Activity size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input required type="text" value={regHardwareId} onChange={(e) => setRegHardwareId(e.target.value.toUpperCase())} placeholder="e.g. SG-007" style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Stron Smart Meter ID</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input required type="text" maxLength="12" value={regMeterId} onChange={(e) => setRegMeterId(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 9013151606" style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>⚡ Generator Capacity</label>
                <select required value={regGeneratorCapacity} onChange={(e) => setRegGeneratorCapacity(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '0.95rem' }}>
                  <option value="1KV">1KV – Small (Residential, 1 room)</option>
                  <option value="2KV">2KV – Medium (Standard Household)</option>
                  <option value="3KV">3KV – Large (Small Business / Shop)</option>
                  <option value="5KV">5KV – Extra Large (Commercial)</option>
                  <option value="7.5KV">7.5KV – Heavy Duty</option>
                  <option value="10KV">10KV – Industrial</option>
                </select>
                <span style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '4px', display: 'block' }}>⚠️ Load must not exceed 90% of this capacity or the relay will automatically trip off.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Owner Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input required type="text" value={regOwnerName} onChange={(e) => setRegOwnerName(e.target.value)} placeholder="e.g. Olamide Johnson" style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Date of Birth</label>
                    <div style={{ position: 'relative' }}>
                      <input type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)} required style={{ width: '100%', padding: '12px 12px 12px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Gender</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label>
                        <input type="radio" name="gender" value="1" checked={regGender === '1'} onChange={() => setRegGender('1')} /> Male
                      </label>
                      <label>
                        <input type="radio" name="gender" value="2" checked={regGender === '2'} onChange={() => setRegGender('2')} /> Female
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Customer Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input required type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="e.g. 08123456787" style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Customer Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input required type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="e.g. olamide@example.com" style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Bank Verification Number (BVN)</label>
                <div style={{ position: 'relative' }}>
                  <BadgeCheck size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input required type="text" maxLength="11" value={regBvn} onChange={(e) => setRegBvn(e.target.value.replace(/\D/g, ''))} placeholder="11-digit BVN for Squad profiling" style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', letterSpacing: '2px' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Note: BVN is strictly required by the Central Bank of Nigeria (CBN) to create dynamic payment virtual accounts.</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" onClick={() => setIsRegisterOpen(false)} className="action-btn" style={{ flex: 1, padding: '12px' }} disabled={regLoading}>Cancel</button>
                <button type="submit" className="action-btn" style={{ flex: 1, padding: '12px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)' }} disabled={regLoading}>
                  {regLoading ? 'Registering & Profiling...' : 'Register Generator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
