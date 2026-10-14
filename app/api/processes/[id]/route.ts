import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canRead } from '@/lib/access';
import { ProcessStatus, Role } from '@/lib/constants';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const process = await prisma.process.findUnique({ where: { id: params.id }, include: { creator: true, assignedTo: true, attachments: { orderBy: { createdAt: 'asc' } }, parties: true, participants: { include: { user: true } }, actions: { include: { user: true }, orderBy: { createdAt: 'asc' } }, messages: { include: { user: true }, orderBy: { createdAt: 'asc' } }, hearingRequests: { include: { requester: true }, orderBy: { createdAt: 'desc' } } } });
  if (!process) return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 });
  const claim = (session.user.role === Role.JUIZ && process.instance === 'PRIMEIRA' && process.status === ProcessStatus.AGUARDANDO_JUIZ && !process.assignedToId) || (session.user.role === Role.DESEMBARGADOR && process.instance === 'SEGUNDA' && process.status === ProcessStatus.AGUARDANDO_DESEMBARGADOR && !process.assignedToId) || (session.user.role === Role.OFICIAL_JUSTICA && process.status === ProcessStatus.AGUARDANDO_INTIMACAO && !process.officerId);
  if (claim) return NextResponse.json({ id: process.id, number: process.number, title: process.title, status: process.status, instance: process.instance, assignedToId: null, officerId: null, claimOnly: true });
  const promoterOversight = session.user.role === Role.PROCURADOR_GERAL && process.creatorId !== session.user.id && [Role.PROMOTOR, Role.PROCURADOR_GERAL].includes(process.creator.role as Role);
  if (!canRead(process, session) && !promoterOversight) return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 });
  if (promoterOversight) {
    await prisma.auditLog.create({ data: { userId: session.user.id, action: 'CONSULTOU_PROCESSO_PROMOTORIA', targetType: 'PROCESSO', targetId: process.id, note: `Consulta somente-leitura: ${process.number}` } });
    return NextResponse.json({ ...process, readOnlyPromotoria: true, attachments: [], parties: [], messages: [], hearingRequests: [], actions: process.actions.map(action => ({ ...action, note: 'Movimentação registrada.', user: { id: action.user.id, name: action.user.name } })) });
  }
  const visibleAttachments = session.user.role === Role.OFICIAL_JUSTICA ? process.attachments.slice(0, 1) : process.attachments;
  return NextResponse.json({ ...process, attachments: visibleAttachments.map(attachment => ({ ...attachment, path: `/api/documentos/${attachment.id}` })) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Somente a administração pode excluir processos.' }, { status: 403 });
  await prisma.process.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
