import { useState } from 'react';
import { Zap, Save, CheckCircle2 } from 'lucide-react';
import { BASE_URL } from '../config';

// Keyed on plan.id + plan.updatedAt by the caller, so this remounts (and re-reads initial
// state from props) whenever the server data actually changes, instead of syncing via effect.
function BandCard({ plan, onSaved }) {
  const [name, setName] = useState(plan.name);
  const [pricePerKwh, setPricePerKwh] = useState(plan.pricePerKwh);

  const [loyaltyDiscountEnabled, setLoyaltyDiscountEnabled] = useState(plan.loyaltyDiscountEnabled);
  const [loyaltyThresholdKwh, setLoyaltyThresholdKwh] = useState(plan.loyaltyThresholdKwh);
  const [loyaltyDiscountPercent, setLoyaltyDiscountPercent] = useState(plan.loyaltyDiscountPercent);

  const [timeFloorProtectionEnabled, setTimeFloorProtectionEnabled] = useState(plan.timeFloorProtectionEnabled);
  const [timeFloorRatePerHour, setTimeFloorRatePerHour] = useState(plan.timeFloorRatePerHour);
  const [timeFloorMinimumKwh, setTimeFloorMinimumKwh] = useState(plan.timeFloorMinimumKwh);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/priceplan/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          pricePerKwh: parseFloat(pricePerKwh),
          loyaltyDiscountEnabled,
          loyaltyThresholdKwh: parseFloat(loyaltyThresholdKwh),
          loyaltyDiscountPercent: parseFloat(loyaltyDiscountPercent),
          timeFloorProtectionEnabled,
          timeFloorRatePerHour: parseFloat(timeFloorRatePerHour),
          timeFloorMinimumKwh: parseFloat(timeFloorMinimumKwh)
        })
      });

      if (response.ok) {
        setSaved(true);
        if (onSaved) onSaved();
        setTimeout(() => setSaved(false), 2000);
      } else {
        const txt = await response.text();
        setError(txt || 'Failed to save price plan.');
      }
    } catch {
      setError('Connection to backend API failed.');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '0.9rem' };
  const subFieldLabel = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' };

  return (
    <div className="glass-panel" style={{ margin: 0, flex: 1, minWidth: '280px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Zap color="var(--primary-accent)" size={20} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Band {plan.band}</span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Band Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Band ${plan.band}`}
          style={fieldStyle}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Price per kWh (₦)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={pricePerKwh}
          onChange={(e) => setPricePerKwh(e.target.value)}
          style={{ ...fieldStyle, padding: '10px 12px', fontSize: '1rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main, white)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={loyaltyDiscountEnabled}
              onChange={(e) => setLoyaltyDiscountEnabled(e.target.checked)}
            />
            Loyalty Discount (Tier 2)
          </label>
          {loyaltyDiscountEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', paddingLeft: '4px' }}>
              <div>
                <label style={subFieldLabel}>Threshold (kWh)</label>
                <input type="number" min="0" step="1" value={loyaltyThresholdKwh} onChange={(e) => setLoyaltyThresholdKwh(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={subFieldLabel}>Discount (%)</label>
                <input type="number" min="0" max="100" step="1" value={loyaltyDiscountPercent} onChange={(e) => setLoyaltyDiscountPercent(e.target.value)} style={fieldStyle} />
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main, white)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={timeFloorProtectionEnabled}
              onChange={(e) => setTimeFloorProtectionEnabled(e.target.checked)}
            />
            Time Floor Protection
          </label>
          {timeFloorProtectionEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', paddingLeft: '4px' }}>
              <div>
                <label style={subFieldLabel}>Rate per hour (₦)</label>
                <input type="number" min="0" step="1" value={timeFloorRatePerHour} onChange={(e) => setTimeFloorRatePerHour(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={subFieldLabel}>Minimum kWh floor</label>
                <input type="number" min="0" step="0.1" value={timeFloorMinimumKwh} onChange={(e) => setTimeFloorMinimumKwh(e.target.value)} style={fieldStyle} />
              </div>
            </div>
          )}
        </div>

        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          If neither box is checked, this band bills strictly on price per kWh.
        </span>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="action-btn"
        style={{
          width: '100%', padding: '10px', flexDirection: 'row', gap: '8px', justifyContent: 'center',
          background: saved ? 'var(--success)' : 'var(--primary-accent)',
          color: 'var(--bg-dark)',
          borderColor: saved ? 'var(--success)' : 'var(--primary-accent)'
        }}
      >
        {saving ? 'Saving...' : saved ? (<><CheckCircle2 size={16} /> Saved</>) : (<><Save size={16} /> Save Band</>)}
      </button>
    </div>
  );
}

export default function SettingsPage({ pricePlans, refreshPricePlans }) {
  const plans = pricePlans || [];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Price Plans</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Configure Band A, Band B and Band C — name, per-kWh rate, and optional loyalty discount / time-floor
          protection rules. Assign a band to a customer from the Dashboard's registration form or Customer Profiles
          tab. Customers without an assigned band keep the platform's standard pricing.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-muted)' }}>Loading price bands...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {plans.map(plan => (
            <BandCard key={`${plan.id}-${plan.updatedAt}`} plan={plan} onSaved={refreshPricePlans} />
          ))}
        </div>
      )}
    </div>
  );
}
