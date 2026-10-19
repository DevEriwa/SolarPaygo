import { useState } from 'react';
import { Zap, Save, CheckCircle2, Plus, Trash2, X, Pencil } from 'lucide-react';
import { BASE_URL } from '../config';
import GeneratorCapacitiesSection from './GeneratorCapacities';
import DeviceGroupsSection from './DeviceGroups';

const fieldStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '0.9rem' };
const subFieldLabel = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' };

function LoyaltyAndFloorFields({
  loyaltyDiscountEnabled, setLoyaltyDiscountEnabled,
  loyaltyThresholdKwh, setLoyaltyThresholdKwh,
  loyaltyDiscountPercent, setLoyaltyDiscountPercent,
  timeFloorProtectionEnabled, setTimeFloorProtectionEnabled,
  timeFloorRatePerHour, setTimeFloorRatePerHour,
  timeFloorMinimumKwh, setTimeFloorMinimumKwh,
  disabled = false
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main, white)', cursor: disabled ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            checked={loyaltyDiscountEnabled}
            disabled={disabled}
            onChange={(e) => setLoyaltyDiscountEnabled(e.target.checked)}
          />
          Loyalty Discount (Tier 2)
        </label>
        {loyaltyDiscountEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', paddingLeft: '4px' }}>
            <div>
              <label style={subFieldLabel}>Threshold (kWh)</label>
              <input type="number" min="0" step="1" disabled={disabled} value={loyaltyThresholdKwh} onChange={(e) => setLoyaltyThresholdKwh(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={subFieldLabel}>Discount (%)</label>
              <input type="number" min="0" max="100" step="1" disabled={disabled} value={loyaltyDiscountPercent} onChange={(e) => setLoyaltyDiscountPercent(e.target.value)} style={fieldStyle} />
            </div>
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main, white)', cursor: disabled ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            checked={timeFloorProtectionEnabled}
            disabled={disabled}
            onChange={(e) => setTimeFloorProtectionEnabled(e.target.checked)}
          />
          Time Floor Protection
        </label>
        {timeFloorProtectionEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', paddingLeft: '4px' }}>
            <div>
              <label style={subFieldLabel}>Rate per hour (₦)</label>
              <input type="number" min="0" step="1" disabled={disabled} value={timeFloorRatePerHour} onChange={(e) => setTimeFloorRatePerHour(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={subFieldLabel}>Minimum kWh floor</label>
              <input type="number" min="0" step="0.1" disabled={disabled} value={timeFloorMinimumKwh} onChange={(e) => setTimeFloorMinimumKwh(e.target.value)} style={fieldStyle} />
            </div>
          </div>
        )}
      </div>

      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        If neither box is checked, this plan bills strictly on price per kWh.
      </span>
    </div>
  );
}

// Keyed on plan.id + plan.updatedAt by the caller, so this remounts (and re-reads initial
// state from props) whenever the server data actually changes, instead of syncing via effect.
function PlanCard({ plan, onSaved, onDeleted }) {
  const [name, setName] = useState(plan.name);
  const [pricePerKwh, setPricePerKwh] = useState(plan.pricePerKwh);

  const [loyaltyDiscountEnabled, setLoyaltyDiscountEnabled] = useState(plan.loyaltyDiscountEnabled);
  const [loyaltyThresholdKwh, setLoyaltyThresholdKwh] = useState(plan.loyaltyThresholdKwh);
  const [loyaltyDiscountPercent, setLoyaltyDiscountPercent] = useState(plan.loyaltyDiscountPercent);

  const [timeFloorProtectionEnabled, setTimeFloorProtectionEnabled] = useState(plan.timeFloorProtectionEnabled);
  const [timeFloorRatePerHour, setTimeFloorRatePerHour] = useState(plan.timeFloorRatePerHour);
  const [timeFloorMinimumKwh, setTimeFloorMinimumKwh] = useState(plan.timeFloorMinimumKwh);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  // Cards open read-only so a live tariff can't be changed by accident -
  // the admin must explicitly click Edit first (mirrors the Delete affordance).
  const [editing, setEditing] = useState(false);

  // Restore the last-saved values and drop out of edit mode.
  const handleCancelEdit = () => {
    setName(plan.name);
    setPricePerKwh(plan.pricePerKwh);
    setLoyaltyDiscountEnabled(plan.loyaltyDiscountEnabled);
    setLoyaltyThresholdKwh(plan.loyaltyThresholdKwh);
    setLoyaltyDiscountPercent(plan.loyaltyDiscountPercent);
    setTimeFloorProtectionEnabled(plan.timeFloorProtectionEnabled);
    setTimeFloorRatePerHour(plan.timeFloorRatePerHour);
    setTimeFloorMinimumKwh(plan.timeFloorMinimumKwh);
    setError(null);
    setEditing(false);
  };

  const buildBody = () => ({
    name,
    pricePerKwh: parseFloat(pricePerKwh),
    loyaltyDiscountEnabled,
    loyaltyThresholdKwh: parseFloat(loyaltyThresholdKwh),
    loyaltyDiscountPercent: parseFloat(loyaltyDiscountPercent),
    timeFloorProtectionEnabled,
    timeFloorRatePerHour: parseFloat(timeFloorRatePerHour),
    timeFloorMinimumKwh: parseFloat(timeFloorMinimumKwh)
  });

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
        body: JSON.stringify(buildBody())
      });

      if (response.ok) {
        setSaved(true);
        setEditing(false);
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

  const handleDelete = async () => {
    if (!confirm(`Delete "${name || plan.name}"? Any customers currently assigned to this plan will revert to standard pricing.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/priceplan/${plan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.affectedCustomers > 0) {
          alert(`${data.affectedCustomers} customer(s) reverted to standard pricing.`);
        }
        if (onDeleted) onDeleted();
      } else {
        const txt = await response.text();
        setError(txt || 'Failed to delete price plan.');
        setDeleting(false);
      }
    } catch {
      setError('Connection to backend API failed.');
      setDeleting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ margin: 0, flex: 1, minWidth: '280px', opacity: deleting ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap color="var(--primary-accent)" size={20} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{plan.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => (editing ? handleCancelEdit() : setEditing(true))}
            disabled={saving || deleting}
            title={editing ? 'Cancel editing' : 'Edit plan'}
            style={{ background: 'transparent', border: 'none', color: editing ? 'var(--text-muted)' : 'var(--primary-accent)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            {editing ? <X size={16} /> : <Pencil size={16} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            title="Delete plan"
            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Plan Name</label>
        <input
          type="text"
          value={name}
          disabled={!editing}
          onChange={(e) => setName(e.target.value)}
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
          disabled={!editing}
          onChange={(e) => setPricePerKwh(e.target.value)}
          style={{ ...fieldStyle, padding: '10px 12px', fontSize: '1rem' }}
        />
      </div>

      <LoyaltyAndFloorFields
        loyaltyDiscountEnabled={loyaltyDiscountEnabled} setLoyaltyDiscountEnabled={setLoyaltyDiscountEnabled}
        loyaltyThresholdKwh={loyaltyThresholdKwh} setLoyaltyThresholdKwh={setLoyaltyThresholdKwh}
        loyaltyDiscountPercent={loyaltyDiscountPercent} setLoyaltyDiscountPercent={setLoyaltyDiscountPercent}
        timeFloorProtectionEnabled={timeFloorProtectionEnabled} setTimeFloorProtectionEnabled={setTimeFloorProtectionEnabled}
        timeFloorRatePerHour={timeFloorRatePerHour} setTimeFloorRatePerHour={setTimeFloorRatePerHour}
        timeFloorMinimumKwh={timeFloorMinimumKwh} setTimeFloorMinimumKwh={setTimeFloorMinimumKwh}
        disabled={!editing}
      />

      {error && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCancelEdit}
            disabled={saving || deleting}
            className="action-btn"
            style={{
              padding: '10px 14px', flexDirection: 'row', gap: '6px', justifyContent: 'center',
              background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-color)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="action-btn"
            style={{
              flex: 1, padding: '10px', flexDirection: 'row', gap: '8px', justifyContent: 'center',
              background: 'var(--primary-accent)',
              color: 'var(--bg-dark)',
              borderColor: 'var(--primary-accent)'
            }}
          >
            {saving ? 'Saving...' : (<><Save size={16} /> Save Plan</>)}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          disabled={saving || deleting}
          className="action-btn"
          style={{
            width: '100%', padding: '10px', flexDirection: 'row', gap: '8px', justifyContent: 'center',
            background: saved ? 'var(--success)' : 'transparent',
            color: saved ? 'var(--bg-dark)' : 'var(--primary-accent)',
            borderColor: saved ? 'var(--success)' : 'var(--primary-accent)'
          }}
        >
          {saved ? (<><CheckCircle2 size={16} /> Saved</>) : (<><Pencil size={16} /> Edit Plan</>)}
        </button>
      )}
    </div>
  );
}

function NewPlanCard({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [pricePerKwh, setPricePerKwh] = useState('2500');

  const [loyaltyDiscountEnabled, setLoyaltyDiscountEnabled] = useState(false);
  const [loyaltyThresholdKwh, setLoyaltyThresholdKwh] = useState('500');
  const [loyaltyDiscountPercent, setLoyaltyDiscountPercent] = useState('50');

  const [timeFloorProtectionEnabled, setTimeFloorProtectionEnabled] = useState(false);
  const [timeFloorRatePerHour, setTimeFloorRatePerHour] = useState('313');
  const [timeFloorMinimumKwh, setTimeFloorMinimumKwh] = useState('0.3');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/priceplan`, {
        method: 'POST',
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
        if (onCreated) onCreated();
      } else {
        const txt = await response.text();
        setError(txt || 'Failed to create price plan.');
      }
    } catch {
      setError('Connection to backend API failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ margin: 0, flex: 1, minWidth: '280px', border: '1px dashed var(--primary-accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus color="var(--primary-accent)" size={20} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>New Plan</span>
        </div>
        <button
          onClick={onCancel}
          disabled={saving}
          title="Cancel"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Plan Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Band D"
          style={fieldStyle}
          autoFocus
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

      <LoyaltyAndFloorFields
        loyaltyDiscountEnabled={loyaltyDiscountEnabled} setLoyaltyDiscountEnabled={setLoyaltyDiscountEnabled}
        loyaltyThresholdKwh={loyaltyThresholdKwh} setLoyaltyThresholdKwh={setLoyaltyThresholdKwh}
        loyaltyDiscountPercent={loyaltyDiscountPercent} setLoyaltyDiscountPercent={setLoyaltyDiscountPercent}
        timeFloorProtectionEnabled={timeFloorProtectionEnabled} setTimeFloorProtectionEnabled={setTimeFloorProtectionEnabled}
        timeFloorRatePerHour={timeFloorRatePerHour} setTimeFloorRatePerHour={setTimeFloorRatePerHour}
        timeFloorMinimumKwh={timeFloorMinimumKwh} setTimeFloorMinimumKwh={setTimeFloorMinimumKwh}
      />

      {error && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={saving || !name.trim()}
        className="action-btn"
        style={{
          width: '100%', padding: '10px', flexDirection: 'row', gap: '8px', justifyContent: 'center',
          background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)'
        }}
      >
        {saving ? 'Creating...' : (<><Plus size={16} /> Create Plan</>)}
      </button>
    </div>
  );
}

export default function SettingsPage({ pricePlans, refreshPricePlans }) {
  const plans = pricePlans || [];
  const [adding, setAdding] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Once we've seen a non-empty list at least once, an empty list means "all deleted",
  // not "still loading" — avoids showing a misleading "Loading..." message forever.
  if (plans.length > 0 && !hasLoaded) setHasLoaded(true);

  const handleCreated = () => {
    setAdding(false);
    if (refreshPricePlans) refreshPricePlans();
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Price Plans</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Create, edit, and delete price plans — name, per-kWh rate, and optional loyalty discount / time-floor
            protection rules. Assign a plan to a customer from the Dashboard's registration form or Customer Profiles
            tab. Customers without an assigned plan keep the platform's standard pricing.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="action-btn"
            style={{ flexShrink: 0, padding: '10px 16px', flexDirection: 'row', gap: '8px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)' }}
          >
            <Plus size={16} /> Add Plan
          </button>
        )}
      </div>

      {plans.length === 0 && !adding && !hasLoaded ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-muted)' }}>Loading price plans...</p>
        </div>
      ) : plans.length === 0 && !adding ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-muted)' }}>No price plans yet — click "Add Plan" to create one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {plans.map(plan => (
            <PlanCard key={`${plan.id}-${plan.updatedAt}`} plan={plan} onSaved={refreshPricePlans} onDeleted={refreshPricePlans} />
          ))}
          {adding && (
            <NewPlanCard onCreated={handleCreated} onCancel={() => setAdding(false)} />
          )}
        </div>
      )}

      <GeneratorCapacitiesSection />
      <DeviceGroupsSection />
    </div>
  );
}
