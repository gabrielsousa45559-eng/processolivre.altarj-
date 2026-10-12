import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProcessStatus, Role } from '@/lib/constants';
import { judgeDeadline } from '@/lib/deadlines';
import { complaintPdf } from '@/lib/complaint-pdf';
import { crimes as legalCrimes } from '@/lib/crimes';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || (session.user.role !== Role.PROMOTOR && session.user.role !== Role.ADMIN)) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  const body = await req.json();
  if (!body.facts?.trim()) return NextResponse.json({ error: 'Informe os fatos.' }, { status: 400 });
  if (!Array.isArray(body.crimes) || !body.crimes.length) return NextResponse.json({ error: 'Selecione ao menos um crime.' }, { status: 400 });

  const selected = body.crimes.map((key: string) => legalCrimes.find((crime) => `${crime.article} — ${crime.name}` === key)).filter(Boolean);
  if (selected.length !== body.crimes.length) return NextResponse.json({ error: 'Há um crime inválido na seleção.' }, { status: 400 });
  const reasons = body.crimeReasons || {};
  if (body.crimes.some((key: string) => !String(reasons[key] || '').trim())) return NextResponse.json({ error: 'Descreva a conduta imputada para cada crime selecionado.' }, { status: 400 });

  const list = (items: any[], withAssets = false) => items.filter((item) => item?.name?.trim()).map((item) => `${item.name}${item.id ? ` — ID ${item.id}` : ''}${withAssets && item.assets ? ` — Patrimônio: R$ ${Number(item.assets).toLocaleString('pt-BR')}` : ''}`).join('\n');
  const defendants = list(body.defendants || [], true);
  const victims = list(body.victims || []);
  const proofs = (body.proofs || []).filter((item: any) => item?.name || item?.link).map((item: any) => `${item.name || 'Prova'}${item.link ? `: ${item.link}` : ''}`).join('\n');
  const occurrences: Record<number, number> = {};
  const crimes = selected.map((crime: any) => {
    const count = occurrences[crime.level] || 0;
    const percentage = count ? 20 : 100;
    occurrences[crime.level] = count + 1;
    const value = crime.value * (percentage / 100);
    return `${crime.article} - ${crime.name}\nNível ${crime.level} | Valor aplicado: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%).\nConduta imputada: ${String(reasons[`${crime.article} — ${crime.name}`]).trim()}`;
  }).join('\n\n');
  const calculation = body.calculation || {};
  const requests = `${body.requests || ''}\n\nVALOR TOTAL DA INDENIZAÇÃO: R$ ${Number(calculation.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nDivisão: 75% Vítima(s): R$ ${Number(calculation.victims || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | 15% Promotor: R$ ${Number(calculation.promoter || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | 10% Magistrado: R$ ${Number(calculation.magistrate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const count = await prisma.process.count();
  const number = String(body.number || `${String(count + 1).padStart(7, '0')}-${String((count + 1) % 100).padStart(2, '0')}.${new Date().getFullYear()}.8.19.0001`);
  const pdf = await complaintPdf({ number, date: body.date || new Date().toLocaleDateString('pt-BR'), prosecutor: body.prosecutor || session.user.name, prosecutorId: body.prosecutorId || session.user.numericId, defendants, victims, facts: body.facts, crimes, proofs, requests, signature: body.signature || session.user.name });
  const item = await prisma.process.create({
    data: {
      number, title: `Processo ${number}`, description: body.facts, facts: body.facts, crimes, creatorId: session.user.id,
      status: ProcessStatus.AGUARDANDO_JUIZ, judgeDueAt: judgeDeadline(),
      attachments: { create: { name: `Denúncia ${number}.pdf`, path: '', mimeType: 'application/pdf', content: pdf } },
      actions: { create: { type: 'ENVIADO', userId: session.user.id, note: 'Denúncia gerada e encaminhada automaticamente para análise judicial.' } },
    }, include: { attachments: true },
  });
  await prisma.attachment.update({ where: { id: item.attachments[0].id }, data: { path: `/api/documentos/${item.attachments[0].id}` } });
  return NextResponse.json(item, { status: 201 });
}
