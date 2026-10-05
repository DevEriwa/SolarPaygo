import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Activity, Wallet, Coins, Copy, CheckCircle2, History, CheckCircle, XCircle, AlertCircle, Key, Power, AlertTriangle, Lock, TrendingUp, TrendingDown } from 'lucide-react';
import { BASE_URL } from '../../config';
import * as signalR from '@microsoft/signalr';

export default function CustomerDashboard() {
  const [copied, setCopied] = useState(false);
  // Simulate state kept in case it is needed again in future, but UI is hidden from production
  const [simulateAmount, setSimulateAmount] = useState('');
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateMessage, setSimulateMessage] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState(null);

  // Overload reset state
  const [resetOverloadLoading, setResetOverloadLoading] = useState(false);
  const [resetOverloadResult, setResetOverloadResult] = useState(null);

  // Change password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null);

  const handleResetOverload = async () => {
    setResetOverloadLoading(true);
    setResetOverloadResult(null);
    try {
      const activeToken = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/dashboard/my-system/reset-overload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' }
      });
      const resData = await response.json();
      if (response.ok) {
        setResetOverloadResult({ type: 'success', text: resData.message });
        refetch();
      } else {
        setResetOverloadResult({ type: 'error', text: resData.message || 'Failed to switch on power.' });
      }
    } catch {
      setResetOverloadResult({ type: 'error', text: 'Network error communicating with the server.' });
    } finally {
      setResetOverloadLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordResult({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordResult({ type: 'error', text: 'Password must be at least 4 characters long.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordResult(null);
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/auth/customer/change-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${activeToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const resData = await res.json();
      if (res.ok) {
        setPasswordResult({ type: 'success', text: resData.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordModalOpen(false);
          setPasswordResult(null);
        }, 2200);
      } else {
        setPasswordResult({ type: 'error', text: resData.message || 'Failed to change password.' });
      }
    } catch {
      setPasswordResult({ type: 'error', text: 'Network error updating password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const token = localStorage.getItem('token');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mySystem', token],
    queryFn: async () => {
      const activeToken = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/dashboard/my-system`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          // If not in ghost impersonation session, clean up
          if (!sessionStorage.getItem('superadmin_master_token')) {
            localStorage.removeItem('token');
            window.location.reload();
          }
        }
        throw new Error('Failed to fetch system details');
      }
      return response.json();
    },
    refetchInterval: 10000,
  });

  // SignalR Real-Time Connection
  useEffect(() => {
    if (!data || !data.system || !data.system.hardwareId) return;

    // Compute hub URL from BASE_URL (assuming BASE_URL ends with /api)
    const hubUrl = BASE_URL.replace(/\/api\/?$/, '/hubs/dashboard');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        console.log('Connected to live updates via SignalR');
        // Join group to receive updates targeted to this hardware ID
        connection.invoke('SubscribeToSystem', data.system.hardwareId)
          .catch(err => console.error('Subscription error:', err));
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    connection.on('ReceiveSystemUpdate', () => {
      console.log('Real-time payment/update event received! Refreshing screen...');
      refetch(); // Instantly update UI with new balance, units, and transactions
    });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke('UnsubscribeFromSystem', data.system.hardwareId)
          .then(() => connection.stop())
          .catch(err => console.error(err));
      } else {
        connection.stop();
      }
    };
  }, [data?.system?.hardwareId, refetch]);

  const handleRedeemWallet = async () => {
    setRedeemLoading(true);
    setRedeemResult(null);
    try {
      const response = await fetch(`${BASE_URL}/payment/redeem-wallet`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRedeemResult({ type: data.redeemed ? 'success' : 'info', text: data.message });
        if (data.redeemed) refetch();
      } else {
        setRedeemResult({ type: 'error', text: data.message || 'Failed to redeem wallet balance.' });
      }
    } catch {
      setRedeemResult({ type: 'error', text: 'Network error while redeeming wallet balance.' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // handleSimulatePayment kept for possible admin/debug use â€” not shown in UI
  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    setSimulateLoading(true);
    setSimulateMessage(null);

    try {
      const response = await fetch(`${BASE_URL}/payment/buy-units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hardwareId: data.system.hardwareId,
          amountPaid: parseFloat(simulateAmount)
        })
      });

      if (response.ok) {
        setSimulateMessage({ type: 'success', text: `Payment of â‚¦${simulateAmount} simulated successfully!` });
        setSimulateAmount('');
        refetch();
      } else {
        setSimulateMessage({ type: 'error', text: 'Payment simulation failed.' });
      }
    } catch (err) {
      setSimulateMessage({ type: 'error', text: 'Network error during simulation.' });
    } finally {
      setSimulateLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard">
        <div style={{color: 'white'}}>Loading your system data...</div>
      </div>
    );
  }

  if (isError || !data || !data.system) {
    return (
      <div className="dashboard">
        <div style={{color: 'var(--danger)'}}>Failed to load system data.</div>
      </div>
    );
  }

  const { system, recentTransactions } = data;

  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  // Customer-side User & System Status calculation
  const rawStatus = (system.status || '').trim().toLowerCase();
  const isRelayOn = system.relayState === '1';
  const hasEnergy = (system.availableUnits || 0) > 0 || (system.prepaidNairaBalance || 0) > 0;
  const isMeterOnline = system.meterOnline || system.MeterOnline || (system.lastSyncTime ? (new Date() - new Date(system.lastSyncTime)) < 15 * 60 * 1000 : false);

  let statusText = 'Active & Powered ON';
  let statusColor = 'var(--success)';
  let statusBg = 'rgba(16,185,129,0.12)';
  let StatusIcon = CheckCircle;

  if (rawStatus === 'disabled' || rawStatus === 'inactive') {
    statusText = 'Account Deactivated';
    statusColor = 'var(--danger)';
    statusBg = 'rgba(239,68,68,0.12)';
    StatusIcon = XCircle;
  } else if (!isRelayOn || !hasEnergy || rawStatus === 'locked') {
    statusText = 'Power Cut (Relay Open)';
    statusColor = 'var(--danger)';
    statusBg = 'rgba(239,68,68,0.12)';
    StatusIcon = XCircle;
  } else {
    statusText = 'Active & Powered ON';
    statusColor = 'var(--success)';
    statusBg = 'rgba(16,185,129,0.12)';
    StatusIcon = CheckCircle;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">My Solar System</h1>
          <p className="subtitle">{system.hardwareId}</p>
        </div>

        {/* Meter Status Badge & Password Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {(system.stronMeterId || system.StronMeterId || system.hardwareId) && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '999px',
              background: isMeterOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${isMeterOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: isMeterOnline ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isMeterOnline ? 'var(--success)' : 'var(--danger)',
                display: 'inline-block'
              }}></span>
              {isMeterOnline ? 'Meter Online' : 'Meter Offline'}
            </div>
          )}

          <button
            onClick={() => setPasswordModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Key size={14} color="#f59e0b" /> Change Password
          </button>
        </div>
      </div>

      {/* Overload Alert Card & Switch ON Button */}
      {(system.isOverloaded || system.IsOverloaded || (system.relayState === '0' && (system.availableUnits > 0 || system.prepaidNairaBalance > 0))) && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '750px' }}>
            <AlertTriangle size={30} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>
                System Overload Protection Activated
              </div>
              <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
                Power was automatically switched OFF because total electrical draw exceeded your {system.maxLoadWatts || 2000} W limit. Please unplug heavy appliances (heaters, boiling rings, irons), then click Switch Power Back ON below.
              </div>
            </div>
          </div>
          <button
            onClick={handleResetOverload}
            disabled={resetOverloadLoading}
            style={{
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 22px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
            }}
          >
            <Power size={16} />
            {resetOverloadLoading ? 'Checking & Switching ON...' : 'Switch Power Back ON'}
          </button>
        </div>
      )}

      {resetOverloadResult && (
        <div style={{
          background: resetOverloadResult.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${resetOverloadResult.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '20px',
          color: resetOverloadResult.type === 'success' ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          {resetOverloadResult.text}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'}}>
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <h3>Available Units</h3>
            <div className="stat-value">{(system.availableUnits ?? 0).toFixed(2)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>kWh</span></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7'}}>
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <h3>Prepaid Balance</h3>
            <div className="stat-value">{formatNaira(system.prepaidNairaBalance)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(250, 204, 21, 0.1)', color: '#facc15'}}>
            <Coins size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending Wallet</h3>
            <div className="stat-value">{formatNaira(system.pendingWalletBalance)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(234, 179, 8, 0.1)', color: '#eab308'}}>
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <h3>Current Power Draw</h3>
            <div className="stat-value">{(system.power ?? 0).toFixed(0)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>W</span></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <h3>Total kWh Bought</h3>
            <div className="stat-value">{(system.cumulativeKwhBought ?? 0).toFixed(2)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>kWh</span></div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>All-time energy purchased</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#f87171'}}>
            <TrendingDown size={24} />
          </div>
          <div className="stat-info">
            <h3>Total kWh Used</h3>
            <div className="stat-value">{(system.cumulativeKwhConsumed ?? 0).toFixed(2)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>kWh</span></div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>All-time energy consumed</div>
          </div>
        </div>
      </div>

      {/* Loyalty / Usage Progress Banner */}
      {(() => {
        const bought = system.cumulativeKwhBought ?? 0;
        const tiers = [
          { label: 'Starter', min: 0, max: 100, color: '#94a3b8', nextColor: '#cd7f32' },
          { label: 'Bronze', min: 100, max: 500, color: '#cd7f32', nextColor: '#94a3b8' },
          { label: 'Silver', min: 500, max: 1000, color: '#94a3b8', nextColor: '#facc15' },
          { label: 'Gold', min: 1000, max: null, color: '#facc15', nextColor: null },
        ];
        const currentTier = [...tiers].reverse().find(t => bought >= t.min) || tiers[0];
        const nextTier = tiers[tiers.indexOf(currentTier) + 1] || null;
        const progress = nextTier ? Math.min(100, ((bought - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;
        const remaining = nextTier ? (nextTier.min - bought).toFixed(1) : 0;
        return (
          <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={15} color={currentTier.color} />
                <span style={{ color: currentTier.color, fontWeight: 700, fontSize: '0.88rem' }}>{currentTier.label} Tier</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>— {bought.toFixed(2)} kWh total bought</span>
              </div>
              {nextTier ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {remaining} kWh to <strong style={{ color: nextTier.color }}>{nextTier.label}</strong> tier
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#facc15', fontWeight: 700 }}>🏆 Highest Tier!</span>
              )}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '99px', height: '7px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: '99px', background: currentTier.color, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              💡 Your price per kWh may reduce as you buy more energy. Track your total kWh here to know when you hit the next discount tier.
            </div>
          </div>
        );
      })()}

      <div style={{ marginTop: '-16px', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>
          <Coins size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Pending Wallet is money you've paid that hasn't converted into an energy token yet â€” it converts automatically once it reaches the minimum for your rate, or you can redeem it now below.
        </p>
        <button
          onClick={handleRedeemWallet}
          disabled={redeemLoading || !system.pendingWalletBalance}
          style={{ padding: '8px 14px', borderRadius: '6px', background: 'rgba(250, 204, 21, 0.12)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.4)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Coins size={14} /> {redeemLoading ? 'Redeeming...' : 'Redeem Wallet Balance'}
        </button>
        {redeemResult && (
          <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', fontSize: '0.85rem',
            background: redeemResult.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : redeemResult.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
            color: redeemResult.type === 'success' ? 'var(--success)' : redeemResult.type === 'error' ? 'var(--danger)' : 'var(--text-muted)' }}>
            {redeemResult.text}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
        {/* Payment / Virtual Account Info */}
        <div className="glass-panel">
          <h2 className="section-title">Top-up Account</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            Transfer funds to the virtual account below to instantly recharge your system.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Bank Name</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>{system.virtualBankName}</div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Account Name</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>SolarPaygo - {system.ownerName}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Account Number</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-accent)', letterSpacing: '1px' }}>
                  {system.virtualAccountNumber || 'Pending...'}
                </div>
                {system.virtualAccountNumber && (
                  <button 
                    onClick={() => handleCopy(system.virtualAccountNumber)}
                    style={{ background: 'transparent', border: 'none', color: copied ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Simulation Tools â€” HIDDEN from customer-facing production view */}
          {/* COMMENTED OUT: not shown to customers in live environment
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Test / Simulate Transfer</h3>
            {simulateMessage && (
              <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '6px',
                background: simulateMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: simulateMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.9rem' }}>
                {simulateMessage.text}
              </div>
            )}
            <form onSubmit={handleSimulatePayment} style={{ display: 'flex', gap: '10px' }}>
              <input type="number" placeholder="Amount (â‚¦)" value={simulateAmount}
                onChange={(e) => setSimulateAmount(e.target.value)} required min="100"
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }} />
              <button type="submit" disabled={simulateLoading}
                style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                {simulateLoading ? '...' : 'Simulate'}
              </button>
            </form>
          </div>
          END COMMENTED OUT */}
        </div>

        {/* Transaction History â€” detailed view matching admin panel */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <History size={20} color="var(--primary-accent)" />
            <h2 className="section-title" style={{ marginBottom: 0 }}>Transaction History</h2>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            {recentTransactions?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Amount Paid</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Used Amount</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Units Added</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Added to Wallet</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Wallet Total</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {new Date(tx.transactionDate).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--success)' }}>
                        {formatNaira(tx.amountPaid)}
                      </td>
                      {/* Older transactions may not have usedAmount â€” show a dash rather than misleading 0 */}
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {tx.usedAmount != null ? formatNaira(tx.usedAmount) : 'â€”'}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--primary-accent)', fontWeight: 600 }}>
                        +{tx.unitsAdded?.toFixed(2)} kWh
                      </td>
                      <td style={{ padding: '10px', color: tx.addedToWallet ? 'var(--primary-accent)' : 'var(--text-muted)' }}>
                        {tx.addedToWallet != null ? formatNaira(tx.addedToWallet) : 'â€”'}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {tx.walletBalanceAfter != null ? formatNaira(tx.walletBalanceAfter) : 'â€”'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          color: tx.status === 'Completed' ? 'var(--success)' : 'var(--text-muted)',
                          background: tx.status === 'Completed' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.07)',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                No past transactions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', margin: 0 }}>Change Login Password</h3>
              </div>
              <button
                onClick={() => { setPasswordModalOpen(false); setPasswordResult(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Default password is your Hardware ID (e.g. <code>{system.hardwareId}</code>). Enter your current password and choose a new one.
            </p>

            {passwordResult && (
              <div style={{
                background: passwordResult.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${passwordResult.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: passwordResult.type === 'success' ? 'var(--success)' : 'var(--danger)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}>
                {passwordResult.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password or Hardware ID"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setPasswordModalOpen(false); setPasswordResult(null); }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: 'var(--primary-accent)',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {passwordLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}