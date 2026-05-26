import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL || 'admin@collab-docs.fr';
const password = process.env.ADMIN_PASSWORD || 'admin123';

const passwordHash = await bcrypt.hash(password, 10);
await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email, name: 'Admin', passwordHash, role: 'SUPERADMIN' }
});
console.log(`Superadmin créé : ${email} / ${password}`);
await prisma.$disconnect();
