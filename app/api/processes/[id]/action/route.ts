import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { ActionType, Instance, ProcessStatus, Role } from '@/lib/constants';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAct } from '@/lib/access';

async function uploadedPdf(document: any) {
  if (!document?.path?.startsWith('/uploads/') || document.mimeType !== 'application/pdf') throw new Error('Anexe um documento PDF para esta etapa.');
  const filename = path.basename(document.path);
  if (document.path !== `/uploads/${filename}`) throw new Error('Caminho do documento inválido.');
  try { return await readFile(path.join(process.cwd(), 'public', 'uploads', filename)); }
  catch { throw new Error('O arquivo enviado não foi encontrado. Envie o PDF novamente.'); }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await req.json();
  const process = await prisma.process.findUnique({ where: { id: params.id }, include: { participants: true } });
  if (!process) return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 });

  if (body.action === 'assumir') {
    const valid = (session.user.role === Role.JUIZ && process.instance === Instance.PRIMEIRA) || (session.user.role === Role.DESEMBARGADOR && process.instance === Instance.SEGUNDA) || session.user.role === Role.ADMIN;
    if (!valid) return NextResponse.json({ error: 'Seu cargo não pode assumir esta instância.' }, { status: 403 });
    const claimed = await prisma.process.updateMany({ where: { id: process.id, assignedToId: null, status: { in: [ProcessStatus.AGUARDANDO_JUIZ, ProcessStatus.AGUARDANDO_DESEMBARGADOR] } }, data: { assignedToId: session.user.id, status: ProcessStatus.EM_ANALISE } });
    if (!claimed.count) return NextResponse.json({ error: 'Este processo já foi assumido.' }, { status: 409 });
    await prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.ASSUMIDO, note: 'Processo assumido para análise. Aguardando documento de instrução.' } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'assumir_oficial') {
    if (session.user.role !== Role.OFICIAL_JUSTICA) return NextResponse.json({ error: 'Somente Oficial de Justiça pode assumir a intimação.' }, { status: 403 });
    const claimed = await prisma.process.updateMany({ where: { id: process.id, officerId: null, status: ProcessStatus.AGUARDANDO_INTIMACAO }, data: { officerId: session.user.id, officerDueAt: new Date(Date.now() + 3 * 86400000), status: ProcessStatus.EM_INTIMACAO } });
    if (!claimed.count) return NextResponse.json({ error: 'Esta intimação já foi assumida.' }, { status: 409 });
    await prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.ASSUMIDO, note: 'Oficial de Justiça assumiu a intimação. Prazo de entrega: 3 dias.' } });
    return NextResponse.json({ ok: true });
  }

  const defenseCanAct = session.user.role === Role.ADVOGADO && process.participants.some((item) => item.userId === session.user.id && item.role === Role.ADVOGADO);
  if (body.action === 'defesa') {
    if (!defenseCanAct || process.status !== ProcessStatus.AGUARDANDO_DEFESA) return NextResponse.json({ error: 'A defesa não pode se manifestar nesta fase.' }, { status: 403 });
    try {
      const content = await uploadedPdf(body.document);
      await prisma.$transaction([
        prisma.process.update({ where: { id: process.id }, data: { status: ProcessStatus.DEFESA_APRESENTADA } }),
        prisma.attachment.create({ data: { processId: process.id, name: body.document.name || 'Documento de defesa.pdf', stage: 'DEFESA', path: body.document.path, mimeType: 'application/pdf', content } }),
        prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.DEFESA_APRESENTADA, note: body.note?.trim() || 'Defesa apresentada com documento anexado.' } }),
      ]);
      return NextResponse.json({ ok: true });
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  }

  if (body.action === 'solicitar_segunda') {
    const allowed = defenseCanAct || ([Role.PROMOTOR, Role.PROCURADOR_GERAL].some((role) => role === session.user.role) && process.creatorId === session.user.id);
    if (!allowed) return NextResponse.json({ error: 'Somente a promotoria ou defesa vinculada pode solicitar a 2ª instância.' }, { status: 403 });
    if (![ProcessStatus.AUTORIZADO, ProcessStatus.NEGADO].includes(process.status as any)) return NextResponse.json({ error: 'A 2ª instância só pode ser solicitada depois da decisão judicial.' }, { status: 400 });
    try { const content = await uploadedPdf(body.document); await prisma.$transaction([prisma.process.update({ where: { id: process.id }, data: { status: ProcessStatus.AGUARDANDO_DESEMBARGADOR, instance: Instance.SEGUNDA, assignedToId: null } }), prisma.attachment.create({ data: { processId: process.id, name: body.document.name || 'Provas novas para recurso.pdf', stage: 'RECURSO', path: body.document.path, mimeType: 'application/pdf', content } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.ENVIADO_SEGUNDA_INSTANCIA, note: body.note?.trim() || '2ª instância solicitada com documento de provas novas.' } })]); return NextResponse.json({ ok: true }); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  }

  if (body.action === 'solicitar_remarcacao') {
    if (!defenseCanAct || process.status !== ProcessStatus.DEFESA_APRESENTADA || !process.hearingAt) return NextResponse.json({ error: 'A defesa só pode solicitar nova data após a audiência ser marcada.' }, { status: 403 });
    const date = new Date(body.hearingAt); if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Informe uma nova data válida.' }, { status: 400 });
    await prisma.$transaction([prisma.hearingRequest.create({ data: { processId: process.id, requesterId: session.user.id, proposedAt: date, note: String(body.note || '').trim() || null } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.COMENTARIO, note: `Defesa solicitou nova data de audiência: ${date.toLocaleString('pt-BR')}.` } })]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'pausar' || body.action === 'retomar') {
    if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Somente a administração pode pausar ou retomar processos.' }, { status: 403 });
    const pause = body.action === 'pausar';
    if ((pause && process.status === ProcessStatus.PAUSADO) || (!pause && process.status !== ProcessStatus.PAUSADO)) return NextResponse.json({ error: 'Esta ação não é permitida no estado atual.' }, { status: 400 });
    await prisma.$transaction([prisma.process.update({ where: { id: process.id }, data: pause ? { pausedStatus: process.status, status: ProcessStatus.PAUSADO } : { status: process.pausedStatus || ProcessStatus.EM_ANALISE, pausedStatus: null } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: pause ? ActionType.PAUSADO : ActionType.RETOMADO, note: body.note?.trim() || (pause ? 'Processo pausado pela administração.' : 'Processo retomado pela administração.') } })]);
    return NextResponse.json({ ok: true });
  }

  if (!canAct(process, session)) return NextResponse.json({ error: 'Somente o magistrado que assumiu o processo pode realizar esta ação.' }, { status: 403 });

  if (body.action === 'instrucao') {
    if (process.status !== ProcessStatus.EM_ANALISE) return NextResponse.json({ error: 'A instrução só pode ser enviada logo após assumir o processo.' }, { status: 400 });
    try {
      const content = await uploadedPdf(body.document);
      await prisma.$transaction([
        prisma.process.update({ where: { id: process.id }, data: { status: ProcessStatus.AGUARDANDO_INTIMACAO, defenseDueAt: null } }),
        prisma.attachment.create({ data: { processId: process.id, name: body.document.name || 'Documento de instrução.pdf', stage: 'INSTRUCAO', path: body.document.path, mimeType: 'application/pdf', content } }),
        prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.INSTRUCAO, note: 'Instrução anexada e encaminhada para intimação pelo Oficial de Justiça.' } }),
      ]);
      return NextResponse.json({ ok: true });
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  }

  if (body.action === 'prorrogar') {
    if (process.status !== ProcessStatus.AGUARDANDO_DEFESA || process.defenseExtensionDays >= 2) return NextResponse.json({ error: 'A prorrogação só pode totalizar até 2 dias durante a defesa.' }, { status: 400 });
    const extra = Math.min(2 - process.defenseExtensionDays, Math.max(1, Number(body.days) || 1));
    await prisma.$transaction([prisma.process.update({ where: { id: process.id }, data: { defenseExtensionDays: { increment: extra }, defenseDueAt: new Date((process.defenseDueAt || new Date()).getTime() + extra * 86400000) } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.PRAZO_PRORROGADO, note: `Prazo da defesa prorrogado por ${extra} dia(s).` } })]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'audiencia') {
    if (process.status !== ProcessStatus.DEFESA_APRESENTADA) return NextResponse.json({ error: 'A audiência só pode ser marcada após a defesa ser apresentada.' }, { status: 400 });
    const date = new Date(body.hearingAt);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Informe uma data válida.' }, { status: 400 });
    await prisma.$transaction([prisma.process.update({ where: { id: process.id }, data: { hearingAt: date } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.AUDIENCIA_AGENDADA, note: `Audiência agendada para ${date.toLocaleString('pt-BR')}.` } })]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'adiar_audiencia') {
    if (process.status !== ProcessStatus.DEFESA_APRESENTADA || !process.hearingAt) return NextResponse.json({ error: 'Não há audiência marcada para adiar.' }, { status: 400 });
    const date = new Date(body.hearingAt); if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Informe uma nova data válida.' }, { status: 400 });
    await prisma.$transaction([prisma.process.update({ where: { id: process.id }, data: { hearingAt: date } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.AUDIENCIA_AGENDADA, note: `Audiência adiada para ${date.toLocaleString('pt-BR')}.` } })]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'decidir_remarcacao') {
    const request = await prisma.hearingRequest.findFirst({ where: { id: String(body.requestId || ''), processId: process.id, status: 'PENDENTE' } });
    if (!request) return NextResponse.json({ error: 'Pedido de remarcação não encontrado ou já decidido.' }, { status: 404 });
    const accept = Boolean(body.accept);
    await prisma.$transaction([prisma.hearingRequest.update({ where: { id: request.id }, data: { status: accept ? 'ACEITO' : 'NEGADO', decidedAt: new Date(), decisionNote: String(body.note || '').trim() || null } }), ...(accept ? [prisma.process.update({ where: { id: process.id }, data: { hearingAt: request.proposedAt } })] : []), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.COMENTARIO, note: accept ? `Pedido de nova data aceito. Audiência remarcada para ${request.proposedAt.toLocaleString('pt-BR')}.` : 'Pedido de nova data de audiência negado.' } })]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'encaminhar_decisao') {
    if (process.status !== ProcessStatus.DEFESA_APRESENTADA || !process.hearingAt) return NextResponse.json({ error: 'A decisão só é liberada após a audiência ser agendada e concluída.' }, { status: 400 });
    await prisma.$transaction([prisma.process.update({ where: { id: process.id }, data: { status: ProcessStatus.DECISAO } }), prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: ActionType.COMENTARIO, note: 'Audiência concluída. Processo encaminhado para decisão.' } })]);
    return NextResponse.json({ ok: true });
  }

  const map: Record<string, [string, string]> = { autorizar: [ProcessStatus.AUTORIZADO, ActionType.AUTORIZADO], devolver: [ProcessStatus.DEVOLVIDO, ActionType.DEVOLVIDO], negar: [ProcessStatus.NEGADO, ActionType.NEGADO], decidir: [ProcessStatus.FINALIZADO, ActionType.AUTORIZADO] };
  const found = map[body.action];
  if (!found) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  if (process.status !== ProcessStatus.DECISAO) return NextResponse.json({ error: 'A decisão só pode ser enviada na fase de decisão.' }, { status: 400 });
  const name = String(body.actorName || '').trim(); const identifier = String(body.actorId || '').trim(); const note = String(body.note || '').trim();
  if (!name || !identifier) return NextResponse.json({ error: 'Informe seu nome e ID para registrar a decisão.' }, { status: 400 });
  if (body.action === 'devolver' && !note) return NextResponse.json({ error: 'Informe o motivo do ajuste solicitado.' }, { status: 400 });
  try {
    const content = await uploadedPdf(body.document);
    await prisma.$transaction([
      prisma.process.update({ where: { id: process.id }, data: { status: found[0], decisionAt: new Date() } }),
      prisma.attachment.create({ data: { processId: process.id, name: body.document.name || 'Documento da decisão.pdf', stage: 'DECISAO', path: body.document.path, mimeType: 'application/pdf', content } }),
      prisma.processAction.create({ data: { processId: process.id, userId: session.user.id, type: found[1], note: `Decisão registrada por ${name} (ID ${identifier}).${note ? ` ${note}` : ''}` } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }
}
