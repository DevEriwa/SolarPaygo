import { useState } from 'react';
import { Lock, User } from 'lucide-react';

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
      const response = await fetch('https://localhost:7030/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setAuthToken(data.token);
      } else {
        setError('Invalid credentials.');
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
        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: 'white' }}>SolarPaygo Login</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem' }}>
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
