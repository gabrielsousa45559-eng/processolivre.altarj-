import { labels } from '@/lib/access';
import type { ProcessStatus } from '@/lib/constants';

const color: Record<string, string> = {
  AGUARDANDO_JUIZ: 'border-gold/50 text-gold',
  DEVOLVIDO: 'border-electric/50 text-electric',
  AUTORIZADO: 'border-success/50 text-success',
  NEGADO: 'border-danger/50 text-danger',
  EM_ANALISE: 'border-purple-400/50 text-purple-300',
  AGUARDANDO_DESEMBARGADOR: 'border-gold/50 text-gold',
  AGUARDANDO_DEFESA: 'border-gold/50 text-gold',
  DECISAO: 'border-purple-400/50 text-purple-300',
  FINALIZADO: 'border-success/50 text-success'
};

export function Status({ status }: { status: string }) {
  const key = status as ProcessStatus;
  return <span className={`badge ${color[status] || 'border-slate-500 text-slate-300'}`}>{labels[key] || status.replaceAll('_', ' ')}</span>;
}
