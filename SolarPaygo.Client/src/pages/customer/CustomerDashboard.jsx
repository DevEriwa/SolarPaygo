import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Activity, Wallet, Copy, CheckCircle2, History } from 'lucide-react';
import { BASE_URL } from '../../config';
import * as signalR from '@microsoft/signalr';

export default function CustomerDashboard() {
  const [copied, setCopied] = useState(false);
  const [simulateAmount, setSimulateAmount] = useState('');
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateMessage, setSimulateMessage] = useState(null);

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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    setSimulateLoading(true);
    setSimulateMessage(null);

    try {
      // We will hit the existing generic buy-units endpoint with the customer's hardware ID
      // Normally, this would be a webhook from Squad/Paystack. 
      // For this test, we reuse the manual top-up endpoint.
      const response = await fetch(`${BASE_URL}/payment/buy-units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hardwareId: data.system.hardwareId, 
          amountPaid: parseFloat(simulateAmount) 
        })
      });

      if (response.ok) {
        setSimulateMessage({ type: 'success', text: `Payment of ₦${simulateAmount} simulated successfully!` });
        setSimulateAmount('');
        refetch(); // Instantly update the dashboard
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

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">My Solar System</h1>
          <p className="subtitle">{system.hardwareId} • {system.status}</p>
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
          <div className="stat-icon" style={{background: 'rgba(234, 179, 8, 0.1)', color: '#eab308'}}>
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <h3>Current Power Draw</h3>
            <div className="stat-value">{system.power.toFixed(0)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>W</span></div>
          </div>
        </div>
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

          {/* Simulation Tools for Testing */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Test / Simulate Transfer</h3>
            {simulateMessage && (
              <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '6px', background: simulateMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: simulateMessage.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
                {simulateMessage.text}
              </div>
            )}
            <form onSubmit={handleSimulatePayment} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="number" 
                placeholder="Amount (₦)"
                value={simulateAmount}
                onChange={(e) => setSimulateAmount(e.target.value)}
                required
                min="100"
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
              />
              <button 
                type="submit" 
                disabled={simulateLoading}
                style={{ padding: '10px 16px', borderRadius: '6px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                {simulateLoading ? '...' : 'Simulate'}
              </button>
            </form>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <History size={20} color="var(--primary-accent)" />
            <h2 className="section-title" style={{ marginBottom: 0 }}>Transaction History</h2>
          </div>
          
          <div style={{ overflowY: 'auto', maxHeight: '400px', paddingRight: '10px' }}>
            {recentTransactions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentTransactions.map((tx) => (
                  <div key={tx.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, color: 'white' }}>{formatNaira(tx.amountPaid)}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatTime(tx.transactionDate)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: 'var(--primary-accent)', fontSize: '0.9rem', fontWeight: 500 }}>
                        +{tx.unitsAdded.toFixed(2)} units
                      </div>
                      <div style={{ fontSize: '0.85rem', color: tx.status === 'Completed' ? 'var(--success)' : 'var(--text-muted)', background: tx.status === 'Completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
