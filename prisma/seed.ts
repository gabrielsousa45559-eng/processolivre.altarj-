import bcrypt from 'bcryptjs';
import { Role } from '../lib/constants';
import { prisma } from '../lib/prisma';
async function main() {
  const numericId = process.env.ADMIN_ID || '1';
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = (process.env.ADMIN_EMAIL || 'admin@juridico.local').toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  const data = { numericId, name, email, passwordHash, role: Role.ADMIN, active: true };

  // Mantém a conta definida nas variáveis do Render como administrador,
  // inclusive quando a senha ou o ID forem alterados depois do primeiro deploy.
  const existing = await prisma.user.findFirst({ where: { OR: [{ numericId }, { email }] } });
  if (existing) await prisma.user.update({ where: { id: existing.id }, data });
  else await prisma.user.create({ data });
}
main().finally(() => prisma.$disconnect());
