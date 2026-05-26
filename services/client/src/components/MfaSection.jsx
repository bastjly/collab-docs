import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function MfaSection() {
  const { token, user, refreshUser } = useAuth();

  const [setupData, setSetupData] = useState(null); // { secret, qr }
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState('');

  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setSetupError('');
    try {
      const r = await fetch(`${API}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) { setSetupData(await r.json()); setSetupCode(''); }
      else { const d = await r.json(); setSetupError(d.error || 'Erreur lors de la configuration.'); }
    } catch { setSetupError('Impossible de contacter le serveur.'); }
    setLoading(false);
  }

  async function verifySetup() {
    setLoading(true);
    const r = await fetch(`${API}/api/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ totp: setupCode }),
    });
    setLoading(false);
    if (r.ok) { setSetupData(null); setSetupCode(''); refreshUser(); }
    else setSetupError('Code invalide, réessayez.');
  }

  async function disableMfa() {
    setLoading(true);
    const r = await fetch(`${API}/api/auth/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ totp: disableCode }),
    });
    setLoading(false);
    if (r.ok) { setShowDisable(false); setDisableCode(''); setDisableError(''); refreshUser(); }
    else { const d = await r.json(); setDisableError(d.error || 'Code invalide, réessayez.'); }
  }

  if (!user) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Authentification à deux facteurs (MFA)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${user.totpEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
            {user.totpEnabled ? 'MFA activé' : 'MFA désactivé'}
          </span>
        </div>

        {/* Activation */}
        {!user.totpEnabled && !setupData && (
          <div className="space-y-2">
            {setupError && <p className="text-sm text-red-500">{setupError}</p>}
            <Button onClick={startSetup} disabled={loading}>
              {loading ? 'Chargement…' : 'Activer le MFA'}
            </Button>
          </div>
        )}

        {/* Modal setup */}
        {setupData && (
          <div className="space-y-4 border rounded-lg p-4">
            <p className="text-sm">Scannez ce QR code avec votre application authenticator (Google Authenticator, Authy…)</p>
            <img src={setupData.qr} alt="QR Code MFA" className="w-48 h-48" />
            <p className="text-xs text-muted-foreground break-all">Code secret : <span className="font-mono">{setupData.secret}</span></p>
            <div>
              <Label htmlFor="setup-code">Code à 6 chiffres</Label>
              <Input
                id="setup-code"
                value={setupCode}
                onChange={e => setSetupCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
                className="w-40"
              />
            </div>
            {setupError && <p className="text-sm text-red-500">{setupError}</p>}
            <div className="flex gap-2">
              <Button onClick={verifySetup} disabled={loading || setupCode.length !== 6}>Confirmer</Button>
              <Button variant="ghost" onClick={() => setSetupData(null)}>Annuler</Button>
            </div>
          </div>
        )}

        {/* Désactivation */}
        {user.totpEnabled && !showDisable && (
          <Button variant="destructive" onClick={() => { setShowDisable(true); setDisableCode(''); setDisableError(''); }}>
            Désactiver le MFA
          </Button>
        )}

        {user.totpEnabled && showDisable && (
          <div className="space-y-3 border rounded-lg p-4">
            <p className="text-sm">Saisissez votre code TOTP actuel pour confirmer la désactivation.</p>
            <div>
              <Label htmlFor="disable-code">Code TOTP</Label>
              <Input
                id="disable-code"
                value={disableCode}
                onChange={e => setDisableCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
                className="w-40"
              />
            </div>
            {disableError && <p className="text-sm text-red-500">{disableError}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" onClick={disableMfa} disabled={loading || disableCode.length !== 6}>Désactiver</Button>
              <Button variant="ghost" onClick={() => setShowDisable(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
