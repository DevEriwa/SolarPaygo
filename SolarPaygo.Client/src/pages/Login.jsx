import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, User, ArrowLeft } from 'lucide-react';
import { BASE_URL } from '../config';

export default function Login({ setAuthToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setAuthToken(data.token);
      } else {
        let msg = 'Invalid credentials.';
        try {
          const txt = await response.text();
          if (txt && txt.length < 150) msg = txt;
        } catch (_) {}
        setError(msg);
      }
    } catch (err) {
      setError('Connection failed. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-panel">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Link to="/" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
        

        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'inline-block', background: '#ffffff', padding: '6px 14px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <img src="/idiasco-logo.png" alt="IDIASCO Integrated Service" style={{ height: '52px', width: 'auto', display: 'block' }} />
          </div>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: 'white' }}>Idiasco SolarPaygo Portal</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px', fontSize: '0.9rem' }}>
          Admins: Use your admin username and password.<br/>
          Customers: Use your Email and Hardware ID.
        </p>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
              <User size={16} /> Username
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1rem' }} 
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
              <Lock size={16} /> Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1rem' }} 
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

