import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Activity, Wallet, Coins, Copy, CheckCircle2, History, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

  const token = localStorage.getItem('token');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['mySystem'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/dashboard/my-system`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.reload();
        }
        throw new Error('Network response was not ok');
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
        headers: { 'Authorization': `Bearer ${token}` }
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

  // Status badge colours â€” mirrors the admin dashboard palette
  const statusColor = system.status === 'Active' ? 'var(--success)'
    : system.status === 'Locked' ? 'var(--danger)'
    : 'var(--text-muted)';
  const statusBg = system.status === 'Active' ? 'rgba(16,185,129,0.12)'
    : system.status === 'Locked' ? 'rgba(239,68,68,0.12)'
    : 'rgba(255,255,255,0.06)';
  const StatusIcon = system.status === 'Active' ? CheckCircle
    : system.status === 'Locked' ? XCircle
    : AlertCircle;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">My Solar System</h1>
          <p className="subtitle">{system.hardwareId}</p>
        </div>

        {/* Active / Not Active status badge â€” read-only, mirrors admin view */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: '999px',
          background: statusBg,
          border: `1px solid ${statusColor}`,
          color: statusColor,
          fontWeight: 700,
          fontSize: '0.9rem',
          letterSpacing: '0.02em'
        }}>
          <StatusIcon size={16} />
          {system.status === 'Active' ? 'Active'
            : system.status === 'Locked' ? 'Not Active (Locked)'
            : system.status}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'}}>
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <h3>Available Units</h3>
            <div className="stat-value">{system.availableUnits.toFixed(2)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>kWh</span></div>
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
            <div className="stat-value">{system.power.toFixed(0)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>W</span></div>
          </div>
        </div>
      </div>
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
    </div>
  );
}