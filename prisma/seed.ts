import bcrypt from 'bcryptjs';
import { Role } from '../lib/constants';
import { prisma } from '../lib/prisma';
async function main() { const hash=await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12); await prisma.user.upsert({ where:{ numericId:process.env.ADMIN_ID || '1' }, update:{}, create:{ numericId:process.env.ADMIN_ID || '1', name:process.env.ADMIN_NAME || 'Administrador', email:process.env.ADMIN_EMAIL || 'admin@juridico.local', passwordHash:hash, role:Role.ADMIN } }); }
main().finally(() => prisma.$disconnect());
