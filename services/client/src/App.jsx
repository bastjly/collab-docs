import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!token) return <Login onLogin={setToken} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(totp && { totp }) }),
    });
    const data = await res.json();
    if (data.requires2FA) { setRequires2FA(true); return; }
    if (!res.ok) { setError(data.error); return; }
    localStorage.setItem('token', data.token);
    onLogin(data.token);
  }

  return (
    <div style={{ maxWidth: 380, margin: '100px auto', padding: 24 }}>
      <h1>Collab Docs</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required />
        {requires2FA && <input placeholder="Code 2FA" value={totp} onChange={e => setTotp(e.target.value)} maxLength={6} />}
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <button type="submit">Connexion</button>
      </form>
    </div>
  );
}

function Dashboard({ token, onLogout }) {
  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Collab Docs</h1>
        <button onClick={onLogout}>Déconnexion</button>
      </header>
      <p>Bienvenue ! L'application est en cours de développement.</p>
    </div>
  );
}
