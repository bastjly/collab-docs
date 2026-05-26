import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import prisma from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password, totp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isBlocked) return res.status(401).json({ error: 'Identifiants invalides' });
    if (!await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: 'Identifiants invalides' });

    if (user.totpEnabled) {
      if (!totp || !authenticator.verify({ token: totp, secret: user.totpSecret })) {
        return res.status(401).json({ error: 'Code 2FA invalide', requires2FA: true });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/2fa/setup', requireAuth, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, 'CollabDocs', secret);
  const qr = await qrcode.toDataURL(otpauth);
  await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: secret } });
  res.json({ secret, qr });
});

router.post('/2fa/verify', requireAuth, async (req, res) => {
  const { totp } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!authenticator.verify({ token: totp, secret: user.totpSecret })) {
    return res.status(400).json({ error: 'Code invalide' });
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { totpEnabled: true } });
  res.json({ success: true });
});

router.post('/2fa/disable', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { totpEnabled: false, totpSecret: null } });
  res.json({ success: true });
});

export default router;
