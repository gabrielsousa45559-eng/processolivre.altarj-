import { type ProcessStatus } from '@/lib/constants'; import { labels } from '@/lib/access';
const color:Partial<Record<ProcessStatus,string>>={AGUARDANDO_JUIZ:'border-gold/50 text-gold',DEVOLVIDO:'border-electric/50 text-electric',AUTORIZADO:'border-success/50 text-success',NEGADO:'border-danger/50 text-danger',EM_ANALISE:'border-purple-400/50 text-purple-300',AGUARDANDO_DESEMBARGADOR:'border-gold/50 text-gold'};
export function Status({status}:{status:ProcessStatus}){return <span className={`badge ${color[status]||'border-slate-500 text-slate-300'}`}>{labels[status]}</span>}
