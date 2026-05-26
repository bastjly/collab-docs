import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, totpEnabled: true, createdAt: true }
  });
  res.json(user);
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, password } = req.body;
  const data = {};
  if (name) data.name = name;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Rien à mettre à jour' });
  await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ success: true });
});

router.get('/', requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isBlocked: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

router.post('/', requireAdmin, async (req, res) => {
  const { email, name, password, role = 'USER' } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, name, passwordHash: await bcrypt.hash(password, 10), role },
      select: { id: true, email: true, name: true, role: true }
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:id/block', requireAdmin, async (req, res) => {
  const { blocked } = req.body;
  await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: blocked } });
  res.json({ success: true });
});

export default router;
