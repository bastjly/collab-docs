import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { requireInternalSecret } from '../middleware/internalAuth.js';

const router = Router();

router.post('/validate-token', requireInternalSecret, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, role: true, isBlocked: true },
  });

  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (user.isBlocked) return res.status(403).json({ error: 'Compte suspendu' });

  res.json(user);
});

export default router;
