import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

const router = Router();
router.use(requireAuth);

function accessFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') return {};
  return {
    OR: [
      { createdById: user.id },
      { permissions: { some: { userId: user.id } } }
    ]
  };
}

router.get('/', async (req, res) => {
  const { parent_id } = req.query;
  const docs = await prisma.document.findMany({
    where: { parentId: parent_id ?? null, deletedAt: null, ...accessFilter(req.user) },
    include: {
      lastModifiedBy: { select: { name: true } },
      _count: { select: { children: true, permissions: true } }
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const { name, type, parent_id } = req.body;
  const doc = await prisma.document.create({
    data: { name, type, parentId: parent_id ?? null, createdById: req.user.id, lastModifiedById: req.user.id }
  });
  res.status(201).json(doc);
});

router.get('/folders', async (req, res) => {
  const folders = await prisma.document.findMany({
    where: { type: 'FOLDER', deletedAt: null, ...accessFilter(req.user) },
    select: { id: true, name: true, parentId: true },
    orderBy: { name: 'asc' }
  });
  res.json(folders);
});

router.get('/:id', async (req, res) => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, deletedAt: null, ...accessFilter(req.user) } });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  res.json(doc);
});

router.get('/:id/ancestors', async (req, res) => {
  const ancestors = [];
  let currentId = req.params.id;
  for (let depth = 0; depth < 50 && currentId; depth++) {
    const doc = await prisma.document.findFirst({
      where: { id: currentId, deletedAt: null },
      select: { id: true, name: true, parentId: true }
    });
    if (!doc) {
      if (depth === 0) return res.status(404).json({ error: 'Document introuvable' });
      break;
    }
    ancestors.unshift({ id: doc.id, name: doc.name });
    currentId = doc.parentId;
  }
  res.json(ancestors);
});

router.patch('/:id', async (req, res) => {
  const { content, name, parent_id } = req.body;
  const data = { lastModifiedById: req.user.id };
  if (content !== undefined) data.content = content;
  if (name) data.name = name;

  if ('parent_id' in req.body) {
    if (parent_id === req.params.id) {
      return res.status(400).json({ error: 'Déplacement invalide' });
    }
    if (parent_id !== null) {
      let cursor = parent_id;
      for (let depth = 0; depth < 50 && cursor; depth++) {
        if (cursor === req.params.id) {
          return res.status(400).json({ error: 'Déplacement invalide' });
        }
        const parent = await prisma.document.findFirst({
          where: { id: cursor, deletedAt: null },
          select: { parentId: true }
        });
        if (!parent) {
          return res.status(400).json({ error: 'Dossier cible introuvable' });
        }
        cursor = parent.parentId;
      }
    }
    data.parentId = parent_id;
  }

  const doc = await prisma.document.update({ where: { id: req.params.id }, data });
  res.json(doc);
});

router.delete('/:id', async (req, res) => {
  await prisma.document.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() }
  });
  res.json({ success: true });
});

router.post('/:id/restore', async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  await prisma.document.update({
    where: { id: req.params.id },
    data: { deletedAt: null }
  });
  res.json({ success: true });
});

router.post('/:id/upload', upload.single('file'), async (req, res) => {
  const { originalname, filename, mimetype } = req.file;
  await prisma.document.update({
    where: { id: req.params.id },
    data: { filePath: filename, fileName: originalname, mimeType: mimetype, lastModifiedById: req.user.id }
  });
  res.json({ success: true });
});

router.get('/:id/download', async (req, res) => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!doc?.filePath) return res.status(404).json({ error: 'Aucun fichier' });
  res.download(path.join(__dirname, '../../uploads', doc.filePath), doc.fileName);
});

router.get('/:id/collaborators', async (req, res) => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  const perms = await prisma.documentPermission.findMany({
    where: { documentId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  res.json(perms.map(p => p.user));
});

router.post('/:id/invite', async (req, res) => {
  const { user_id } = req.body;
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { createdById: true } });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  const isOwner = doc.createdById === req.user.id;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Accès refusé' });
  await prisma.documentPermission.upsert({
    where: { documentId_userId: { documentId: req.params.id, userId: user_id } },
    update: {},
    create: { documentId: req.params.id, userId: user_id }
  });
  res.json({ success: true });
});

router.delete('/:id/collaborators/:userId', async (req, res) => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { createdById: true } });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  const isOwner = doc.createdById === req.user.id;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Accès refusé' });
  await prisma.documentPermission.deleteMany({
    where: { documentId: req.params.id, userId: req.params.userId }
  });
  res.json({ success: true });
});

export default router;
