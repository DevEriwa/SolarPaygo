import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Pencil, Layers } from 'lucide-react';
import { BASE_URL } from '../config';

const fieldStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '0.9rem' };
const subFieldLabel = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' };

function GroupRow({ group, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [isActive, setIsActive] = useState(group.isActive);
  const [order, setOrder] = useState(group.displayOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/devicegroup/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description, isActive, displayOrder: Number(order) })
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', opacity: group.isActive ? 1 : 0.55, flexWrap: 'wrap' }}>
        <div style={{ minWidth: '140px', fontWeight: 700, color: 'var(--primary-accent)' }}>{group.name}</div>
        <div style={{ flex: 1, minWidth: '160px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{group.description || 'No description'}</div>
        <div style={{ minWidth: '66px', textAlign: 'center', fontSize: '0.74rem', color: group.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
          {group.isActive ? 'Active' : 'Retired'}
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
        <div style={{ minWidth: '160px', flex: 1 }}>
          <label style={subFieldLabel}>Group Name</label>
          <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ flex: 2, minWidth: '200px' }}>
          <label style={subFieldLabel}>Description</label>
          <input style={fieldStyle} value={description} onChange={e => setDescription(e.target.value)} />
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
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '6px' }}>{error}</p>}
    </div>
  );
}

function NewGroupRow({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/devicegroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description, isActive: true, displayOrder: Number(order) })
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
        <div style={{ minWidth: '160px', flex: 1 }}>
          <label style={subFieldLabel}>Group Name</label>
          <input style={fieldStyle} placeholder="e.g. Commercial Sector 1" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ flex: 2, minWidth: '200px' }}>
          <label style={subFieldLabel}>Description</label>
          <input style={fieldStyle} placeholder="e.g. Generators serving market plaza" value={description} onChange={e => setDescription(e.target.value)} />
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
      // Leaves the list as it was
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
            <Layers size={22} color="var(--primary-accent)" /> Device Groups & Tabs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Create group tabs to organize equipment on the home page/dashboard. When registering a device, admins can choose which group tab it belongs to.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="action-btn"
            style={{ flexShrink: 0, padding: '10px 16px', flexDirection: 'row', gap: '8px', background: 'var(--primary-accent)', color: 'var(--bg-dark)', borderColor: 'var(--primary-accent)' }}
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
