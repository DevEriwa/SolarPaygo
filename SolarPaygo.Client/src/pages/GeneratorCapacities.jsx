import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Pencil } from 'lucide-react';
import { BASE_URL } from '../config';

// The sizes offered on the registration form. These used to be a fixed list written
// into the markup, so adding one meant a release.

const fieldStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '0.9rem' };
const subFieldLabel = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' };

function CapacityRow({ capacity, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(capacity.code);
  const [name, setName] = useState(capacity.name);
  const [watts, setWatts] = useState(capacity.watts);
  const [isActive, setIsActive] = useState(capacity.isActive);
  const [order, setOrder] = useState(capacity.displayOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/generatorcapacity/${capacity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, name, watts: Number(watts), isActive, displayOrder: Number(order) })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(typeof body === 'string' ? body : (body && body.message) || 'Could not save.');
        return;
      }

      // Renaming a size in use moves those customers with it. An admin renaming "3KV"
      // should know the change reached live customers rather than find out later.
      if (body && body.affectedCustomers > 0) window.alert(body.message);

      setEditing(false);
      onChanged();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${capacity.code}"?`)) return;
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/generatorcapacity/${capacity.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        // A size assigned to customers cannot be deleted; the server says how many.
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', opacity: capacity.isActive ? 1 : 0.55, flexWrap: 'wrap' }}>
        <div style={{ minWidth: '70px', fontWeight: 700 }}>{capacity.code}</div>
        <div style={{ flex: 1, minWidth: '160px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{capacity.name}</div>
        <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.88rem' }}>{capacity.watts.toLocaleString()}W</div>
        <div style={{ minWidth: '66px', textAlign: 'center', fontSize: '0.74rem', color: capacity.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
          {capacity.isActive ? 'Active' : 'Retired'}
        </div>
        <button onClick={() => setEditing(true)} className="action-btn" style={{ padding: '6px 10px' }} title="Edit"><Pencil size={14} /></button>
        <button onClick={remove} disabled={busy} className="action-btn" style={{ padding: '6px 10px' }} title="Delete"><Trash2 size={14} /></button>
        {error && <span style={{ color: 'var(--danger)', fontSize: '0.74rem', flexBasis: '100%' }}>{error}</span>}
      </div>
    );
  }

  return (
    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,.02)' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ width: '90px' }}>
          <label style={subFieldLabel}>Code</label>
          <input style={fieldStyle} value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={subFieldLabel}>Name</label>
          <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ width: '110px' }}>
          <label style={subFieldLabel}>Watts</label>
          <input style={fieldStyle} type="number" value={watts} onChange={e => setWatts(e.target.value)} />
        </div>
        <div style={{ width: '80px' }}>
          <label style={subFieldLabel}>Order</label>
          <input style={fieldStyle} type="number" value={order} onChange={e => setOrder(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', paddingBottom: '8px' }}>
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Active
        </label>
        <button onClick={save} disabled={busy} className="action-btn" style={{ padding: '8px 12px' }}><Save size={14} /> Save</button>
        <button onClick={() => { setEditing(false); setError(''); }} className="action-btn" style={{ padding: '8px 12px' }}><X size={14} /></button>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
        Watts is the load ceiling the relay trips at. A retired size disappears from the
        registration form but keeps working for customers already on it.
      </p>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '6px' }}>{error}</p>}
    </div>
  );
}

function NewCapacityRow({ onCreated, onCancel }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [watts, setWatts] = useState('');
  const [order, setOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/generatorcapacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, name, watts: Number(watts), isActive: true, displayOrder: Number(order) })
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
    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,.04)' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ width: '90px' }}>
          <label style={subFieldLabel}>Code</label>
          <input style={fieldStyle} placeholder="4KV" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={subFieldLabel}>Name</label>
          <input style={fieldStyle} placeholder="Large (Workshop)" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ width: '110px' }}>
          <label style={subFieldLabel}>Watts</label>
          <input style={fieldStyle} type="number" placeholder="4000" value={watts} onChange={e => setWatts(e.target.value)} />
        </div>
        <div style={{ width: '80px' }}>
          <label style={subFieldLabel}>Order</label>
          <input style={fieldStyle} type="number" value={order} onChange={e => setOrder(e.target.value)} />
        </div>
        <button onClick={create} disabled={busy} className="action-btn" style={{ padding: '8px 12px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)' }}>
          <Save size={14} /> Create
        </button>
        <button onClick={onCancel} className="action-btn" style={{ padding: '8px 12px' }}><X size={14} /></button>
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '6px' }}>{error}</p>}
    </div>
  );
}

export default function GeneratorCapacitiesSection() {
  const [capacities, setCapacities] = useState([]);
  const [adding, setAdding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      // includeInactive so retired sizes stay visible here and can be brought back.
      const response = await fetch(`${BASE_URL}/generatorcapacity?includeInactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data)) setCapacities(data);
    } catch {
      // Leaves the list as it was. Price plans above this section are unaffected.
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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Generator Capacities</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            The sizes offered when registering a generator. Watts is the load ceiling the relay
            trips at. A size assigned to customers cannot be deleted — retire it instead and it
            disappears from the registration form while those customers keep working.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="action-btn"
            style={{ flexShrink: 0, padding: '10px 16px', flexDirection: 'row', gap: '8px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)' }}
          >
            <Plus size={16} /> Add Capacity
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {adding && <NewCapacityRow onCreated={changed} onCancel={() => setAdding(false)} />}
        {capacities.map(c => (
          <CapacityRow key={`${c.id}-${c.updatedAt}`} capacity={c} onChanged={changed} />
        ))}
        {capacities.length === 0 && !adding && (
          <p style={{ color: 'var(--text-muted)', padding: '16px' }}>
            {loaded ? 'No capacities yet — click "Add Capacity" to create one.' : 'Loading capacities...'}
          </p>
        )}
      </div>
    </div>
  );
}
