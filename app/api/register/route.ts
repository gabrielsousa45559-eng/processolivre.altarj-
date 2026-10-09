import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { Role, type Role as RoleValue } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

const allowedRoles = [Role.PROMOTOR, Role.JUIZ, Role.DESEMBARGADOR, Role.ADVOGADO, Role.VITIMA] as const;

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  const numericId = String(body.numericId ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = body.role as RoleValue;

  if (name.length < 3 || !numericId || !email.includes('@') || password.length < 8 || !allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    return NextResponse.json({ error: 'Preencha nome, ID, e-mail, cargo e uma senha de pelo menos 8 caracteres.' }, { status: 400 });
  }

  try {
    await prisma.user.create({
      data: { numericId, name, email, passwordHash: await bcrypt.hash(password, 12), role }
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este ID ou e-mail já possui cadastro.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Não foi possível concluir o cadastro.' }, { status: 500 });
  }
}
