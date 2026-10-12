import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { Role, type Role as RoleValue } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

// Cadastro público nunca pode conceder poder institucional.
const allowedRoles = [Role.VITIMA] as const;

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  const numericId = String(body.numericId ?? '').trim();
  const password = String(body.password ?? '');
  const role = body.role as RoleValue;

  if (name.length < 3 || !numericId || password.length < 8 || !allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    return NextResponse.json({ error: 'Informe nome completo, ID/passaporte e senha. Cadastro público disponível somente para Cidadão.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { numericId, name, passwordHash: await bcrypt.hash(password, 12), role }
    });
    const parties = await prisma.processParty.findMany({ where: { identifier: numericId, name: { equals: name, mode: 'insensitive' } }, select: { processId: true, role: true } });
    if (parties.length) await prisma.processParticipant.createMany({ data: parties.map((party) => ({ processId: party.processId, userId: user.id, role: party.role })), skipDuplicates: true });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este ID ou e-mail já possui cadastro.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Não foi possível concluir o cadastro.' }, { status: 500 });
  }
}
