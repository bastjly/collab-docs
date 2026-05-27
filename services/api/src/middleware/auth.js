import jwt from 'jsonwebtoken';
import prisma from '../db.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, isBlocked: true }
    });
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
    if (user.isBlocked) return res.status(403).json({ error: 'Votre compte a été suspendu. Contactez un administrateur.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  });
}

export function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  });
}
