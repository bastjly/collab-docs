import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MfaSection } from '@/components/MfaSection';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ROLE_LABEL = { USER: 'Utilisateur', ADMIN: 'Administrateur', SUPERADMIN: 'Super Administrateur' };

export function ProfilePage() {
  const { token, user, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [nameMsg, setNameMsg] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMsg(null);
    const r = await fetch(`${API}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim() }),
    });
    setNameSaving(false);
    if (r.ok) { setNameMsg({ ok: true, text: 'Nom mis à jour.' }); setName(''); refreshUser(); }
    else { const d = await r.json(); setNameMsg({ ok: false, text: d.error || 'Erreur' }); }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd.length < 8) return setPwdMsg({ ok: false, text: 'Le mot de passe doit faire au moins 8 caractères.' });
    if (newPwd !== confirmPwd) return setPwdMsg({ ok: false, text: 'Les mots de passe ne correspondent pas.' });
    if (newPwd === currentPwd) return setPwdMsg({ ok: false, text: 'Le nouveau mot de passe doit être différent.' });
    setPwdSaving(true);
    const r = await fetch(`${API}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    setPwdSaving(false);
    if (r.ok) { setPwdMsg({ ok: true, text: 'Mot de passe mis à jour.' }); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }
    else { const d = await r.json(); setPwdMsg({ ok: false, text: d.error || 'Erreur' }); }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Mon profil</h1>

        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-muted-foreground w-20">Email</span><span>{user.email}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-20">Rôle</span><span>{ROLE_LABEL[user.role] ?? user.role}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Modifier le nom</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Nom actuel : <span className="font-medium text-foreground">{user.name}</span></p>
            <form onSubmit={saveName} className="space-y-3">
              <div>
                <Label htmlFor="name">Nouveau nom</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
              </div>
              {nameMsg && <p className={`text-sm ${nameMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{nameMsg.text}</p>}
              <Button type="submit" disabled={nameSaving || !name.trim()}>
                {nameSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Changer le mot de passe</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-3">
              <div>
                <Label htmlFor="current-pwd">Mot de passe actuel</Label>
                <Input id="current-pwd" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
                <Input id="new-pwd" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="confirm-pwd">Confirmer le nouveau mot de passe</Label>
                <Input id="confirm-pwd" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              </div>
              {pwdMsg && <p className={`text-sm ${pwdMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{pwdMsg.text}</p>}
              <Button type="submit" disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}>
                {pwdSaving ? 'Enregistrement…' : 'Changer le mot de passe'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* MFA */}
        <MfaSection />
      </main>
    </div>
  );
}
