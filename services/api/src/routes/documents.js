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

router.get('/', async (req, res) => {
  const { parent_id } = req.query;
  const docs = await prisma.document.findMany({
    where: { parentId: parent_id ?? null },
    include: { lastModifiedBy: { select: { name: true } } },
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

router.get('/:id', async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  res.json(doc);
});

router.patch('/:id', async (req, res) => {
  const { content, name } = req.body;
  const data = { lastModifiedById: req.user.id };
  if (content !== undefined) data.content = content;
  if (name) data.name = name;
  const doc = await prisma.document.update({ where: { id: req.params.id }, data });
  res.json(doc);
});

router.delete('/:id', async (req, res) => {
  await prisma.document.delete({ where: { id: req.params.id } });
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
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc?.filePath) return res.status(404).json({ error: 'Aucun fichier' });
  res.download(path.join(__dirname, '../../uploads', doc.filePath), doc.fileName);
});

router.post('/:id/invite', async (req, res) => {
  const { user_id } = req.body;
  await prisma.documentPermission.upsert({
    where: { documentId_userId: { documentId: req.params.id, userId: user_id } },
    update: {},
    create: { documentId: req.params.id, userId: user_id }
  });
  res.json({ success: true });
});

export default router;
