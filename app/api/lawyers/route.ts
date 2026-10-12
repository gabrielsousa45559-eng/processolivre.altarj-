import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/constants';

export async function GET() {
  const session = await getAuth();
  if (!session || ![Role.JUIZ, Role.DESEMBARGADOR, Role.ADMIN].some((role) => role === session.user.role)) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  const lawyers = await prisma.user.findMany({ where: { role: Role.ADVOGADO, active: true }, select: { name: true, numericId: true, oab: true }, orderBy: { name: 'asc' } });
  return NextResponse.json(lawyers);
}
