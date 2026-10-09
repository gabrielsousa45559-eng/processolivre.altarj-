import { type Process } from '@prisma/client';
import { ProcessStatus, Role } from './constants';
import type { Session } from 'next-auth';
export const labels: Record<ProcessStatus, string> = { RASCUNHO:'Rascunho', AGUARDANDO_JUIZ:'Aguardando juiz', EM_ANALISE:'Em análise', INSTRUCAO:'Instrução', AGUARDANDO_DEFESA:'Aguardando defesa', DEFESA_APRESENTADA:'Defesa apresentada', DECISAO:'Em decisão', DEVOLVIDO:'Devolvido p/ ajuste', AUTORIZADO:'Autorizado', NEGADO:'Negado', SEGUNDA_INSTANCIA:'2ª instância', AGUARDANDO_DESEMBARGADOR:'Aguardando desembargador', PAUSADO:'Pausado', FINALIZADO:'Finalizado' };
export function canRead(p: Process & { participants?: { userId: string }[] }, s: Session) { const u=s.user; return u.role===Role.ADMIN || u.role===Role.OFICIAL_JUSTICA || p.creatorId===u.id || p.assignedToId===u.id || !!p.participants?.some(x=>x.userId===u.id) || (u.role===Role.JUIZ && p.instance==='PRIMEIRA') || (u.role===Role.DESEMBARGADOR && p.instance==='SEGUNDA'); }
export function canAct(p: Process, s: Session) { return s.user.role===Role.ADMIN || p.assignedToId===s.user.id; }
