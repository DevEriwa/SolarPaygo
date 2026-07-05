import { useState, useEffect } from 'react';
import { CreditCard, Zap, Landmark, ArrowRight, Clipboard, RefreshCw, HelpCircle } from 'lucide-react';
import { BASE_URL } from '../config';

export default function PaymentPortal({ systems, systemsLoading, refreshData }) {
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Results
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // If systems are loaded and we don't have a selection, select the first one
    if (!systemsLoading && systems.length > 0 && !selectedSystemId) {
      setSelectedSystemId(systems[0].id.toString());
    }
  }, [systems, systemsLoading, selectedSystemId]);

  const selectedSystem = systems.find(s => s.id.toString() === selectedSystemId);
  const isDiscounted = selectedSystem && selectedSystem.cumulativeKwhConsumed >= 500;
  const currentRate = isDiscounted ? 1250 : 2500;

  const handleSimulateTransfer = async (e) => {
    e.preventDefault();
    if (!selectedSystem) return;
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessData(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/payment/simulate-webhook`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          virtualAccountNumber: selectedSystem.virtualAccountNumber,
          amount: parseFloat(amount)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessData(data.data);
        setAmount('');
        // Refresh global state so Dashboard sees the payment immediately
        if (refreshData) refreshData();
      } else {
        const txt = await response.text();
        setErrorMsg(txt || "Failed to process transfer simulation.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server. Make sure API is running.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  return (
    <div className="payment-portal" style={{ width: '100%' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Prepaid Recharge Portal</h1>
        <p className="subtitle" style={{ color: 'var(--text-muted)' }}>Top up Naira balance or simulate bank transfer payments to generate STS meter tokens.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
        
        {/* LEFT PANEL: PRICING DETAILS & BANK INFORMATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PRICING PLANS CARD */}
          <div className="glass-panel" style={{ margin: 0 }}>
            <h3 style={{ color: 'white', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap color="var(--primary-accent)" size={20} /> Smart Pricing & Limits
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Base Rate:</span>
                <span style={{ fontWeight: 'bold' }}>₦2,500 / kWh</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Loyalty Discount (Tier 2):</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₦1,250 / kWh (50% Off)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Discount Condition:</span>
                <span style={{ color: 'var(--success)' }}>After 500 kWh of total use</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Maximum Power Output:</span>
                <span style={{ fontWeight: 'bold' }}>300W – 400W</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time Floor Protection:</span>
                <span style={{ color: 'var(--warning)', fontWeight: '500' }}>0.3 kWh OR ₦313/hr minimum</span>
              </div>
            </div>
          </div>

          {/* VIRTUAL ACCOUNT CARD */}
          <div className="glass-panel" style={{ margin: 0 }}>
            <h3 style={{ color: 'white', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Landmark color="#3b82f6" size={20} /> Dedicated Bank Account
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Each solar generator has an assigned Wema/GTBank account. Transfers to these accounts automatically trigger GPRS top-ups.
            </p>

            {systemsLoading ? (
              <div style={{ color: 'var(--text-muted)' }}>Loading account information...</div>
            ) : selectedSystem ? (
              <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Beneficiary Name:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>SolarPaygo - {selectedSystem.ownerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Account Number:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem', color: '#3b82f6' }}>{selectedSystem.virtualAccountNumber}</span>
                    <button onClick={() => copyToClipboard(selectedSystem.virtualAccountNumber)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Clipboard size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bank Name:</span>
                  <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{selectedSystem.virtualBankName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Effective Rate:</span>
                  <span style={{ color: isDiscounted ? 'var(--success)' : 'var(--primary-accent)', fontWeight: 'bold' }}>
                    {isDiscounted ? '₦1,250/kWh (Loyalty)' : '₦2,500/kWh (Standard)'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No active generators registered.</div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: PAYMENT FORM / WEBHOOK SIMULATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '50%' }}>
                <CreditCard color="var(--primary-accent)" size={28} />
              </div>
              <div>
                <h2 style={{ color: 'white', margin: 0 }}>Transfer Simulator</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Test payment webhook and Stron token generation offline</p>
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSimulateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select Generator & Customer</label>
                <select 
                  required
                  value={selectedSystemId}
                  onChange={(e) => setSelectedSystemId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1rem' }}
                >
                  {systems.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.ownerName} ({s.hardwareId}) - Meter: {s.stronMeterId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Transfer Amount (₦)</label>
                <input 
                  type="number" 
                  required
                  min="500"
                  step="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1rem' }}
                />
              </div>

              {/* Live calculator */}
              {selectedSystem && amount && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Calculation:</span>
                    <span>₦{amount} / ₦{currentRate}/kWh</span>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Estimated Units:</span>
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={16} />
                      {(parseFloat(amount) / currentRate).toFixed(2)} kWh
                    </span>
                  </div>
                </div>
              )}

              <button type="submit" className="action-btn pay" style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginTop: '10px', background: 'var(--primary-accent)', color: 'var(--bg-dark)' }} disabled={loading || !selectedSystemId}>
                {loading ? 'Processing Bank Transfer Notification...' : 'Simulate Bank Transfer (Naira)'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* TOKEN RESULTS MODAL/CARD */}
      {successData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', margin: 0, textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.4)', boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}>
            <div style={{ display: 'inline-flex', background: 'var(--success-bg)', padding: '16px', borderRadius: '50%', marginBottom: '20px', color: 'var(--success)' }}>
              <Zap size={36} />
            </div>
            
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>Bank Transfer Successful!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Payment of ₦{successData.amount} received. A standard STS recharge code has been generated.
            </p>

            {/* STS TOKEN BOX */}
            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 'bold' }}>
                STE18-G Prepaid Meter Code:
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary-accent)', fontSize: '1.6rem', letterSpacing: '2px', wordSpacing: '4px', margin: '12px 0' }}>
                {successData.token}
              </div>
              <button onClick={() => copyToClipboard(successData.token)} className="action-btn" style={{ flexDirection: 'row', gap: '6px', margin: '0 auto', fontSize: '0.75rem', padding: '6px 12px' }}>
                <Clipboard size={12} /> Copy Token
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginBottom: '28px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Energy Applied:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>+{successData.units_added?.toFixed(2)} kWh</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button onClick={() => setSuccessData(null)} className="action-btn" style={{ background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)', width: '100%', padding: '12px', fontSize: '1rem' }}>
                Back to Portal
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <HelpCircle size={12} /> Key in the 20 digits above on the meter, and press blue ↵ button.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
