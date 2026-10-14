import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { Role } from '@/lib/constants';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const promoterFields = { id: true, numericId: true, name: true, role: true, active: true, createdAt: true } as const;

export async function GET() {
  const session = await getAuth();
  if (!session || ![Role.ADMIN, Role.PROCURADOR_GERAL].includes(session.user.role as Role)) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  const onlyPromoters = session.user.role === Role.PROCURADOR_GERAL;
  return NextResponse.json(await prisma.user.findMany({ where: onlyPromoters ? { role: Role.PROMOTOR } : undefined, select: onlyPromoters ? promoterFields : { ...promoterFields, oab: true }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: Request) {
  const session = await getAuth(); const body = await req.json();
  const admin = session?.user.role === Role.ADMIN, procurador = session?.user.role === Role.PROCURADOR_GERAL;
  if (!session || (!admin && !(procurador && body.role === Role.PROMOTOR))) return NextResponse.json({ error: 'Sem acesso para criar este cargo.' }, { status: 403 });
  if (!body.numericId || !body.name || !body.password || !Object.values(Role).includes(body.role)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  let oab: string | undefined;
  if (body.role === Role.ADVOGADO) { do { oab = `OAB ${Math.floor(100000 + Math.random() * 900000)}/26`; } while (await prisma.user.findUnique({ where: { oab } })); }
  const user = await prisma.user.create({ data: { numericId: String(body.numericId), name: body.name.trim(), passwordHash: await bcrypt.hash(body.password, 12), role: body.role, oab } });
  if (procurador) await prisma.auditLog.create({ data: { userId: session.user.id, action: 'CADASTROU_PROMOTOR', targetType: 'USUARIO', targetId: user.id, note: `Promotor: ${user.name}` } });
  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getAuth();
  if (!session || ![Role.ADMIN, Role.PROCURADOR_GERAL].includes(session.user.role as Role)) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  const { id, action } = await req.json();
  if (!id || !['ativar', 'suspender', 'desativar', 'remover_cargo'].includes(action)) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.id === session.user.id) return NextResponse.json({ error: 'Conta inválida.' }, { status: 400 });
  if (session.user.role === Role.PROCURADOR_GERAL && target.role !== Role.PROMOTOR) return NextResponse.json({ error: 'O Procurador-Geral administra somente contas de Promotor.' }, { status: 403 });
  const data = action === 'ativar' ? { active: true } : action === 'remover_cargo' ? { active: false, role: Role.VITIMA } : { active: false };
  const user = await prisma.user.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { userId: session.user.id, action: action.toUpperCase(), targetType: 'USUARIO', targetId: target.id, note: `Conta: ${target.name}` } });
  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id || id === session.user.id) return NextResponse.json({ error: 'Não é possível excluir a própria conta administrativa.' }, { status: 400 });
  await prisma.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
