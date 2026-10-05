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
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  // Change password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null);

  const handleResetOverload = async () => {
    if (resetCooldown > 0) return;
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
        setResetCooldown(30); // 30s safety cooldown to protect meter relay
        refetch();
      } else {
        setResetOverloadResult({ type: 'error', text: resData.message || 'Failed to switch on power.' });
        setResetCooldown(10);
      }
    } catch {
      setResetOverloadResult({ type: 'error', text: 'Network error communicating with the server.' });
      setResetCooldown(10);
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
  const isOverloadTripped = Boolean(system.isOverloaded || system.IsOverloaded);
  const isPowerCut = !isRelayOn || isOverloadTripped || rawStatus === 'locked' || system.status === 'Locked' || system.Status === 'Locked';
  const shouldShowRestoreAction = isPowerCut || (!isMeterOnline && !isRelayOn);

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

          {shouldShowRestoreAction && hasEnergy && (
            <button
              onClick={handleResetOverload}
              disabled={resetOverloadLoading || resetCooldown > 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: resetCooldown > 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 158, 11, 0.2)',
                border: `1px solid ${resetCooldown > 0 ? 'var(--border-color)' : 'rgba(245, 158, 11, 0.5)'}`,
                color: resetCooldown > 0 ? 'var(--text-muted)' : '#f59e0b',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: resetCooldown > 0 ? 'not-allowed' : 'pointer'
              }}
              title="Switch meter power ON or reset overload"
            >
              <Power size={14} /> {resetOverloadLoading ? 'Switching...' : resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Switch Power ON'}
            </button>
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

      {/* Power Cut / Overload / Reconnection Alert Banner */}
      {shouldShowRestoreAction && (
        <div style={{
          background: isOverloadTripped ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isOverloadTripped ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
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
            <AlertTriangle size={30} color={isOverloadTripped ? '#f59e0b' : '#ef4444'} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: isOverloadTripped ? '#f59e0b' : '#ef4444', fontSize: '1rem' }}>
                {isOverloadTripped 
                  ? 'System Overload Protection Activated' 
                  : !hasEnergy 
                    ? 'Zero Balance — Power Switched OFF' 
                    : !isMeterOnline 
                      ? 'Meter Offline & Power Cut' 
                      : 'Power Cut (Relay Open)'}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.4 }}>
                {isOverloadTripped
                  ? `Power was automatically switched OFF because total electrical draw exceeded your ${system.maxLoadWatts || 2000} W limit. Please unplug heavy appliances (heaters, boiling rings, irons), then click Switch Power Back ON below.`
                  : !hasEnergy
                    ? 'Your meter has run out of energy units. Please transfer funds to your dedicated virtual account below to recharge and restore power.'
                    : !isMeterOnline
                      ? 'Power is cut and the meter is currently offline. Disconnect any heavy appliances and click Switch Power Back ON to restore power and re-establish connection.'
                      : 'Your power is currently switched OFF. Please ensure heavy loads are disconnected, then click Switch Power Back ON below.'}
              </div>
            </div>
          </div>
          {hasEnergy ? (
            <button
              onClick={handleResetOverload}
              disabled={resetOverloadLoading || resetCooldown > 0}
              style={{
                background: resetCooldown > 0 ? 'rgba(255, 255, 255, 0.1)' : '#f59e0b',
                color: resetCooldown > 0 ? 'var(--text-muted)' : '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 22px',
                fontWeight: 700,
                cursor: resetCooldown > 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                boxShadow: resetCooldown > 0 ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Power size={16} />
              {resetOverloadLoading ? 'Checking & Switching ON...' : resetCooldown > 0 ? `Wait (${resetCooldown}s)` : 'Switch Power Back ON'}
            </button>
          ) : (
            <button
              onClick={() => {
                const el = document.getElementById('top-up-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'var(--primary-accent)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 22px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
            >
              <Wallet size={16} /> Top-Up Account
            </button>
          )}
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

      {/* Loyalty / Usage Progress Banner — uses real plan threshold */}
      {(() => {
        const plan = system.pricePlan;
        // --- Core kWh values --------------------------------------------------
        const consumed = system.cumulativeKwhConsumed ?? 0; // what billing uses
        const bought   = system.cumulativeKwhBought   ?? 0; // for display info

        // --- Resolve the real loyalty threshold from the price plan -----------
        // Backend PricingEngine checks CumulativeKwhConsumed >= LoyaltyThresholdKwh,
        // so we mirror exactly that logic here for accuracy.
        const loyaltyEnabled   = plan?.loyaltyDiscountEnabled  ?? false;
        const loyaltyThreshold = plan?.loyaltyThresholdKwh     ?? 500;  // default 500
        const loyaltyDiscount  = plan?.loyaltyDiscountPercent   ?? 50;   // default 50%
        const baseRate         = plan?.pricePerKwh              ?? 2500;
        const discountedRate   = baseRate * (1 - loyaltyDiscount / 100);

        const loyaltyUnlocked  = loyaltyEnabled && consumed >= loyaltyThreshold;
        const kwhToDiscount    = loyaltyEnabled ? Math.max(0, loyaltyThreshold - consumed) : null;
        const progress         = loyaltyEnabled
          ? Math.min(100, (consumed / loyaltyThreshold) * 100)
          : null; // no plan — hide bar

        return (
          <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={15} color={loyaltyUnlocked ? '#facc15' : '#94a3b8'} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: loyaltyUnlocked ? '#facc15' : 'var(--text-main)' }}>
                  {loyaltyUnlocked ? '🏆 Loyalty Discount Unlocked!' : 'Loyalty Progress'}
                </span>
                {plan && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    — {plan.name || plan.band}
                  </span>
                )}
              </div>

              {loyaltyEnabled && (
                loyaltyUnlocked ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#facc15', background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '6px', padding: '3px 10px' }}>
                    ✅ Rate: ₦{discountedRate.toLocaleString()}/kWh ({loyaltyDiscount}% off)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: '#f59e0b' }}>{kwhToDiscount?.toFixed(2)} kWh consumed</strong> to unlock {loyaltyDiscount}% discount
                  </span>
                )
              )}
            </div>

            {/* kWh consumed progress bar — only shown if plan has loyalty enabled */}
            {loyaltyEnabled && (
              <>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '99px', height: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    borderRadius: '99px',
                    background: loyaltyUnlocked
                      ? 'linear-gradient(90deg, #f59e0b, #facc15)'
                      : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                    transition: 'width 0.6s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>{consumed.toFixed(2)} kWh consumed</span>
                  <span>Target: {loyaltyThreshold.toLocaleString()} kWh</span>
                </div>
              </>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Bought: </span>
                <strong style={{ color: 'var(--text-main)' }}>{bought.toFixed(2)} kWh</strong>
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Consumed: </span>
                <strong style={{ color: 'var(--text-main)' }}>{consumed.toFixed(2)} kWh</strong>
              </div>
              {plan && (
                <div style={{ fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current Rate: </span>
                  <strong style={{ color: loyaltyUnlocked ? '#facc15' : '#38bdf8' }}>
                    ₦{(loyaltyUnlocked ? discountedRate : baseRate).toLocaleString()}/kWh
                  </strong>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {loyaltyEnabled
                ? loyaltyUnlocked
                  ? `🎉 You have qualified for the ${loyaltyDiscount}% loyalty discount on your Band ${plan?.band || ''} plan. Your electricity is now billed at ₦${discountedRate.toLocaleString()}/kWh.`
                  : `💡 When your total energy consumed reaches ${loyaltyThreshold.toLocaleString()} kWh, your rate drops by ${loyaltyDiscount}% to ₦${discountedRate.toLocaleString()}/kWh automatically.`
                : '💡 Your current plan charges a flat rate per kWh. Loyalty discount is not enabled on this plan.'}
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