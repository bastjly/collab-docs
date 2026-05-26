import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); };
  if (!token) return <Login onLogin={setToken} />;
  return <Dashboard onLogout={handleLogout} />;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(totp && { totp }) }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.requires2FA) { setRequires2FA(true); return; }
    if (!res.ok) { setError(data.error); return; }
    localStorage.setItem('token', data.token);
    onLogin(data.token);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Collab Docs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {requires2FA && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totp">Code 2FA</Label>
                <Input id="totp" placeholder="000000" maxLength={6} value={totp} onChange={e => setTotp(e.target.value)} />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard({ onLogout }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Collab Docs</h1>
        <Button variant="outline" onClick={onLogout}>Déconnexion</Button>
      </header>
      <main className="p-6">
        <p className="text-muted-foreground">L'application est en cours de développement.</p>
      </main>
    </div>
  );
}
