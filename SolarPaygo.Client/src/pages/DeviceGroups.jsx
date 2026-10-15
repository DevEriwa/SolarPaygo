import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Pencil, Layers, UserCheck, ShieldAlert, DollarSign, Calendar, Percent, Copy, Check, Clock } from 'lucide-react';
import { BASE_URL } from '../config';

const fieldStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-dark)',
  color: 'white',
  fontSize: '0.88rem'
};

const subFieldLabel = {
  display: 'block',
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  marginBottom: '4px',
  fontWeight: 600
};

const MONTHS = [
  { val: '01', name: 'Jan (01)' },
  { val: '02', name: 'Feb (02)' },
  { val: '03', name: 'Mar (03)' },
  { val: '04', name: 'Apr (04)' },
  { val: '05', name: 'May (05)' },
  { val: '06', name: 'Jun (06)' },
  { val: '07', name: 'Jul (07)' },
  { val: '08', name: 'Aug (08)' },
  { val: '09', name: 'Sep (09)' },
  { val: '10', name: 'Oct (10)' },
  { val: '11', name: 'Nov (11)' },
  { val: '12', name: 'Dec (12)' }
];

function DateInputGroup({ value, onChange }) {
  const parts = (value || '').split('-');
  const year = parts[0] || '';
  const month = parts[1] || '';
  const day = parts[2] ? parts[2].substring(0, 2) : '';

  const update = (newDay, newMonth, newYear) => {
    if (!newDay && !newMonth && !newYear) {
      onChange('');
      return;
    }
    const d = newDay || day || '01';
    const m = newMonth || month || '01';
    const y = newYear || year || String(new Date().getFullYear());
    onChange(`${y}-${m}-${d}`);
  };

  const preview = value ? (() => {
    try {
      const [y, m, d] = value.split('-');
      const mObj = MONTHS.find(x => x.val === m);
      return `${parseInt(d, 10)} ${mObj ? mObj.name.split(' ')[0] : m} ${y}`;
    } catch {
      return '';
    }
  })() : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={subFieldLabel}>Investment Start Date (Day / Month / Year)</label>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Day Select */}
        <select
          style={{ ...fieldStyle, width: '70px', padding: '8px 6px', textAlign: 'center' }}
          value={day}
          onChange={e => update(e.target.value, month, year)}
        >
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => {
            const v = String(i + 1).padStart(2, '0');
            return <option key={v} value={v}>{v}</option>;
          })}
        </select>

        {/* Month Select */}
        <select
          style={{ ...fieldStyle, width: '115px', padding: '8px 6px' }}
          value={month}
          onChange={e => update(day, e.target.value, year)}
        >
          <option value="">Month</option>
          {MONTHS.map(m => (
            <option key={m.val} value={m.val}>{m.name}</option>
          ))}
        </select>

        {/* Year Select */}
        <select
          style={{ ...fieldStyle, width: '85px', padding: '8px 6px', textAlign: 'center' }}
          value={year}
          onChange={e => update(day, month, e.target.value)}
        >
          <option value="">Year</option>
          {Array.from({ length: 16 }, (_, i) => {
            const y = String(2020 + i);
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>
      {preview && (
        <div style={{ fontSize: '0.73rem', color: '#38bdf8', marginTop: '4px', fontWeight: 600 }}>
          📅 {preview} (Cycle begins on this date)
        </div>
      )}
    </div>
  );
}

function formatNaira(val) {
  if (!val && val !== 0) return '₦0';
  return '₦' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function GroupRow({ group, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [isActive, setIsActive] = useState(group.isActive);
  const [order, setOrder] = useState(group.displayOrder);

  // Smart Remittance & Investment Governance
  const [investorsCapital, setInvestorsCapital] = useState(group.investorsCapital || 0);
  const [isRoiEnabled, setIsRoiEnabled] = useState(!!group.isRoiEnabled);
  const [roiPercentage, setRoiPercentage] = useState(group.roiPercentage || 15);
  const [remittanceShare, setRemittanceShare] = useState(group.remittanceSharePercent || 100);
  const [settlementCycle, setSettlementCycle] = useState(group.settlementCycle || 'Monthly');

  // Investment Start Date (Annual Reoccurring Anchor)
  const [investmentStartDate, setInvestmentStartDate] = useState(
    group.investmentStartDate ? group.investmentStartDate.split('T')[0] : ''
  );

  // Exit Governance
  const [isReturnCapital, setIsReturnCapital] = useState(!!group.isReturnCapital);

  // Investor Account
  const [investorEnabled, setInvestorEnabled] = useState(!!group.investorAdminAccountId);
  const [investorUsername, setInvestorUsername] = useState(group.investorUsername || '');
  const [investorPassword, setInvestorPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleReturnCapitalToggle = (checked) => {
    setIsReturnCapital(checked);
    if (checked) {
      if (Number(roiPercentage) === 15 || !roiPercentage) {
        setRoiPercentage(10);
      }
    } else {
      if (Number(roiPercentage) === 10) {
        setRoiPercentage(15);
      }
    }
  };

  const handleInvestorToggle = (checked) => {
    setInvestorEnabled(checked);
    if (checked && !investorUsername) {
      const slug = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'portfolio';
      setInvestorUsername(`investor_${slug}`);
      if (!investorPassword) setInvestorPassword('Inv@2026!');
    }
  };

  const copyCreds = () => {
    const text = `Username: ${investorUsername}${investorPassword ? `\nPassword: ${investorPassword}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/devicegroup/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name,
          description,
          isActive,
          displayOrder: Number(order),
          investorsCapital: Number(investorsCapital) || 0,
          isRoiEnabled,
          roiPercentage: Number(roiPercentage) || 0,
          remittanceSharePercent: Number(remittanceShare) || 100,
          settlementCycle,
          investmentStartDate: investmentStartDate || null,
          isReturnCapital,
          investorEnabled,
          investorUsername: investorEnabled ? investorUsername : null,
          investorPassword: investorEnabled && investorPassword ? investorPassword : null
        })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(typeof body === 'string' ? body : (body && body.message) || 'Could not save.');
        return;
      }

      setEditing(false);
      onChanged();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete group "${group.name}"?`)) return;
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/devicegroup/${group.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError((body && body.message) || 'Could not delete.');
        return;
      }

      onChanged();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', opacity: group.isActive ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '150px', fontWeight: 700, color: 'var(--primary-accent)', fontSize: '1rem' }}>
            {group.name}
          </div>
          <div style={{ flex: 1, minWidth: '160px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            {group.description || 'No description'}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {group.investmentStartDate && (
              <span style={{ fontSize: '0.74rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Start Date: {new Date(group.investmentStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (Reoccurring)
              </span>
            )}

            {group.isRoiEnabled ? (
              <span style={{ fontSize: '0.74rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                Capital: {formatNaira(group.investorsCapital)} • {group.roiPercentage}% ROI ({formatNaira(Math.round(group.investorsCapital * (group.roiPercentage / 100)))}/yr cap)
              </span>
            ) : (
              <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px' }}>
                Standard Tab
              </span>
            )}

            {group.isReturnCapital && (
              <span style={{ fontSize: '0.74rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Exit Notice: {group.roiPercentage}% ROI
                {group.daysRemainingInExitWindow != null && ` (${group.daysRemainingInExitWindow}d left)`}
              </span>
            )}

            {group.investorUsername && (
              <span style={{ fontSize: '0.74rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserCheck size={12} /> @{group.investorUsername}
              </span>
            )}

            <span style={{ fontSize: '0.74rem', color: group.isActive ? 'var(--success)' : 'var(--text-muted)', minWidth: '46px', textAlign: 'center' }}>
              {group.isActive ? 'Active' : 'Retired'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setEditing(true)} className="action-btn" style={{ padding: '6px 10px' }} title="Edit"><Pencil size={14} /></button>
            <button onClick={remove} disabled={busy} className="action-btn" style={{ padding: '6px 10px' }} title="Delete"><Trash2 size={14} /></button>
          </div>
        </div>

        {error && <span style={{ color: 'var(--danger)', fontSize: '0.76rem' }}>{error}</span>}
      </div>
    );
  }

  return (
    <div style={{ padding: '18px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,.02)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Row 1: Primary Details */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={subFieldLabel}>Group Name</label>
          <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. London" />
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={subFieldLabel}>Description</label>
          <input style={fieldStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Distribution for light" />
        </div>
        <div style={{ width: '80px' }}>
          <label style={subFieldLabel}>Order</label>
          <input style={fieldStyle} type="number" value={order} onChange={e => setOrder(e.target.value)} />
        </div>
      </div>

      {/* Row 2: Investment Capital, Date & ROI Governance */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ width: '170px' }}>
          <label style={subFieldLabel}>Investors Capital (₦)</label>
          <input
            style={fieldStyle}
            type="number"
            placeholder="e.g. 10000"
            value={investorsCapital}
            onChange={e => setInvestorsCapital(e.target.value)}
          />
        </div>

        {/* Unambiguous Day / Month / Year Picker */}
        <DateInputGroup value={investmentStartDate} onChange={setInvestmentStartDate} />

        {/* %ROI Input */}
        <div style={{ width: '85px' }}>
          <label style={subFieldLabel}>%ROI</label>
          <input
            style={fieldStyle}
            type="number"
            step="0.1"
            value={roiPercentage}
            onChange={e => setRoiPercentage(e.target.value)}
          />
        </div>

        {/* %ROI Checkbox */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={subFieldLabel}>%ROI Active</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', height: '36px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isRoiEnabled}
              onChange={e => setIsRoiEnabled(e.target.checked)}
            />
            <span style={{ color: isRoiEnabled ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>Track ROI</span>
          </label>
        </div>

        {/* Return Capital Checkbox */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={subFieldLabel}>Return Capital</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', height: '36px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isReturnCapital}
              onChange={e => handleReturnCapitalToggle(e.target.checked)}
            />
            <span style={{ color: isReturnCapital ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>12-Mo Notice</span>
          </label>
        </div>
      </div>

      {/* Row 3: Account Toggle & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={investorEnabled}
              onChange={e => handleInvestorToggle(e.target.checked)}
            />
            <span style={{ color: investorEnabled ? '#38bdf8' : 'var(--text-muted)', fontWeight: 600 }}>
              Enable Investor Account Login
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={save} disabled={busy} className="action-btn" style={{ padding: '8px 18px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={15} /> Save
          </button>
          <button onClick={() => { setEditing(false); setError(''); }} className="action-btn" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={15} /> Cancel
          </button>
        </div>
      </div>

      {/* Expanded Investor Credentials & Settings */}
      {investorEnabled && (
        <div style={{ marginTop: '4px', padding: '12px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
          <div>
            <label style={subFieldLabel}>Investor Username</label>
            <input style={fieldStyle} value={investorUsername} onChange={e => setInvestorUsername(e.target.value)} />
          </div>
          <div>
            <label style={subFieldLabel}>Password (leave blank to keep existing)</label>
            <input style={fieldStyle} type="text" placeholder="Type or keep existing" value={investorPassword} onChange={e => setInvestorPassword(e.target.value)} />
          </div>
          <div>
            <label style={subFieldLabel}>Remittance Share % (e.g. 100, 80)</label>
            <input style={fieldStyle} type="number" min="1" max="100" value={remittanceShare} onChange={e => setRemittanceShare(e.target.value)} />
          </div>
          <div>
            <label style={subFieldLabel}>Settlement Cycle</label>
            <select style={fieldStyle} value={settlementCycle} onChange={e => setSettlementCycle(e.target.value)}>
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Daily">Daily</option>
            </select>
          </div>
          {investorUsername && (
            <div>
              <button type="button" onClick={copyCreds} className="action-btn" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

function NewGroupRow({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(0);

  // Smart Remittance & Investment Governance
  const [investorsCapital, setInvestorsCapital] = useState('');
  const [isRoiEnabled, setIsRoiEnabled] = useState(false);
  const [roiPercentage, setRoiPercentage] = useState(15);
  const [remittanceShare, setRemittanceShare] = useState(100);
  const [settlementCycle, setSettlementCycle] = useState('Monthly');

  // Investment Start Date (Annual Reoccurring Anchor)
  const [investmentStartDate, setInvestmentStartDate] = useState('');

  // Exit Governance
  const [isReturnCapital, setIsReturnCapital] = useState(false);

  // Investor Account
  const [investorEnabled, setInvestorEnabled] = useState(false);
  const [investorUsername, setInvestorUsername] = useState('');
  const [investorPassword, setInvestorPassword] = useState('Inv@2026!');
  const [copied, setCopied] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleReturnCapitalToggle = (checked) => {
    setIsReturnCapital(checked);
    if (checked) {
      if (Number(roiPercentage) === 15 || !roiPercentage) {
        setRoiPercentage(10);
      }
    } else {
      if (Number(roiPercentage) === 10) {
        setRoiPercentage(15);
      }
    }
  };

  const handleInvestorToggle = (checked) => {
    setInvestorEnabled(checked);
    if (checked && !investorUsername) {
      const slug = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'portfolio';
      setInvestorUsername(`investor_${slug}`);
    }
  };

  const copyCreds = () => {
    const text = `Username: ${investorUsername}\nPassword: ${investorPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const create = async () => {
    if (!name.trim()) {
      setError('Group Name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/devicegroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isActive: true,
          displayOrder: Number(order),
          investorsCapital: Number(investorsCapital) || 0,
          isRoiEnabled,
          roiPercentage: Number(roiPercentage) || 0,
          remittanceSharePercent: Number(remittanceShare) || 100,
          settlementCycle,
          investmentStartDate: investmentStartDate || null,
          isReturnCapital,
          investorEnabled,
          investorUsername: investorEnabled ? investorUsername : null,
          investorPassword: investorEnabled && investorPassword ? investorPassword : null
        })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(typeof body === 'string' ? body : (body && body.message) || 'Could not create.');
        return;
      }

      onCreated();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '18px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Row 1: Primary Details */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={subFieldLabel}>Group Name</label>
          <input
            style={fieldStyle}
            placeholder="e.g. Commercial Sector 1"
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (investorEnabled && (!investorUsername || investorUsername.startsWith('investor_'))) {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
                setInvestorUsername(`investor_${slug}`);
              }
            }}
          />
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={subFieldLabel}>Description</label>
          <input
            style={fieldStyle}
            placeholder="e.g. Generators serving market plaza"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <div style={{ width: '80px' }}>
          <label style={subFieldLabel}>Order</label>
          <input style={fieldStyle} type="number" value={order} onChange={e => setOrder(e.target.value)} />
        </div>
      </div>

      {/* Row 2: Investment, Date & ROI Governance */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ width: '170px' }}>
          <label style={subFieldLabel}>Investors Capital (₦)</label>
          <input
            style={fieldStyle}
            type="number"
            placeholder="e.g. 5000000"
            value={investorsCapital}
            onChange={e => setInvestorsCapital(e.target.value)}
          />
        </div>

        {/* Unambiguous Day / Month / Year Picker */}
        <DateInputGroup value={investmentStartDate} onChange={setInvestmentStartDate} />

        {/* %ROI Input */}
        <div style={{ width: '85px' }}>
          <label style={subFieldLabel}>%ROI</label>
          <input
            style={fieldStyle}
            type="number"
            step="0.1"
            value={roiPercentage}
            onChange={e => setRoiPercentage(e.target.value)}
          />
        </div>

        {/* %ROI Checkbox */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={subFieldLabel}>%ROI Checkbox</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', height: '36px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isRoiEnabled}
              onChange={e => setIsRoiEnabled(e.target.checked)}
            />
            <span style={{ color: isRoiEnabled ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>Track ROI</span>
          </label>
        </div>

        {/* Return Capital Checkbox */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={subFieldLabel}>Return Capital</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', height: '36px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isReturnCapital}
              onChange={e => handleReturnCapitalToggle(e.target.checked)}
            />
            <span style={{ color: isReturnCapital ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>12-Mo Notice</span>
          </label>
        </div>
      </div>

      {/* Row 3: Account Toggle & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={investorEnabled}
              onChange={e => handleInvestorToggle(e.target.checked)}
            />
            <span style={{ color: investorEnabled ? '#38bdf8' : 'var(--text-muted)', fontWeight: 600 }}>
              Create Investor Account Login
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={create}
            disabled={busy}
            className="action-btn"
            style={{ padding: '8px 18px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> Create
          </button>
          <button onClick={onCancel} className="action-btn" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={15} /> Cancel
          </button>
        </div>
      </div>

      {/* Expanded Investor Credentials */}
      {investorEnabled && (
        <div style={{ marginTop: '4px', padding: '12px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'flex-end' }}>
          <div>
            <label style={subFieldLabel}>Investor Username</label>
            <input style={fieldStyle} placeholder="e.g. investor_commercial" value={investorUsername} onChange={e => setInvestorUsername(e.target.value)} />
          </div>
          <div>
            <label style={subFieldLabel}>Password</label>
            <input style={fieldStyle} placeholder="Password" value={investorPassword} onChange={e => setInvestorPassword(e.target.value)} />
          </div>
          <div>
            <label style={subFieldLabel}>Remittance Share % (default 100%)</label>
            <input style={fieldStyle} type="number" min="1" max="100" value={remittanceShare} onChange={e => setRemittanceShare(e.target.value)} />
          </div>
          <div>
            <label style={subFieldLabel}>Settlement Cycle</label>
            <select style={fieldStyle} value={settlementCycle} onChange={e => setSettlementCycle(e.target.value)}>
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Daily">Daily</option>
            </select>
          </div>
          {investorUsername && (
            <div>
              <button type="button" onClick={copyCreds} className="action-btn" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

export default function DeviceGroupsSection() {
  const [groups, setGroups] = useState([]);
  const [adding, setAdding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/devicegroup?includeInactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data)) setGroups(data);
    } catch {
      // Leaves list as is
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  const changed = () => { setAdding(false); load(); };

  return (
    <div style={{ marginTop: '44px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={22} color="var(--primary-accent)" /> Device Groups & Investment Tabs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Create group tabs to organize equipment on the home page/dashboard. When registering a device, admins can choose which group tab it belongs to.
            All meters assigned to a group reflect in the linked investor's dashboard with automatic ROI remittance tracking.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="action-btn"
            style={{ flexShrink: 0, padding: '10px 16px', flexDirection: 'row', gap: '8px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)', fontWeight: 700 }}
          >
            <Plus size={16} /> Add Group
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {adding && <NewGroupRow onCreated={changed} onCancel={() => setAdding(false)} />}
        {groups.map(g => (
          <GroupRow key={`${g.id}-${g.updatedAt}`} group={g} onChanged={changed} />
        ))}
        {groups.length === 0 && !adding && (
          <p style={{ color: 'var(--text-muted)', padding: '16px' }}>
            {loaded ? 'No device groups created yet — click "Add Group" to create one.' : 'Loading device groups...'}
          </p>
        )}
      </div>
    </div>
  );
}
