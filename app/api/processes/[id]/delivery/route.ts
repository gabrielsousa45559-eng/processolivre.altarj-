import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProcessStatus, Role } from '@/lib/constants';
import { defenseDeadline } from '@/lib/deadlines';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== Role.OFICIAL_JUSTICA) return NextResponse.json({ error: 'Somente Oficial de Justiça pode registrar a intimação.' }, { status: 403 });
  const body = await req.json();
  const item = await prisma.process.findUnique({ where: { id: params.id } });
  if (!item || item.officerId !== session.user.id || item.status !== ProcessStatus.EM_INTIMACAO) return NextResponse.json({ error: 'Você precisa assumir esta intimação antes de registrar a entrega.' }, { status: 403 });
  if (!body.document?.path?.startsWith('/uploads/') || body.document.mimeType !== 'application/pdf') return NextResponse.json({ error: 'Anexe o PDF da intimação.' }, { status: 400 });
  const filename = path.basename(body.document.path);
  if (body.document.path !== `/uploads/${filename}`) return NextResponse.json({ error: 'Caminho do documento inválido.' }, { status: 400 });
  let content: Buffer;
  try { content = await readFile(path.join(process.cwd(), 'public', 'uploads', filename)); }
  catch { return NextResponse.json({ error: 'O arquivo enviado não foi encontrado. Envie o PDF novamente.' }, { status: 400 }); }
  const delivery = await prisma.$transaction(async (tx) => {
    const created = await tx.delivery.create({ data: { processId: item.id, userId: session.user.id, documentPath: body.document.path, note: body.note?.trim() || null } });
    await tx.attachment.create({ data: { processId: item.id, name: body.document.name || 'Documento de intimação.pdf', stage: 'INTIMACAO', path: body.document.path, mimeType: 'application/pdf', content } });
    await tx.process.update({ where: { id: item.id }, data: { status: ProcessStatus.AGUARDANDO_DEFESA, defenseDueAt: defenseDeadline() } });
    await tx.processAction.create({ data: { processId: item.id, userId: session.user.id, type: 'INTIMADO', note: 'Intimação entregue com documento anexado. Prazo de defesa iniciado: 5 dias.' } });
    return created;
  });
  return NextResponse.json(delivery, { status: 201 });
}
