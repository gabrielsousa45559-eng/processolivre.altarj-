'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function ProcessQuickActions() {
  const path = usePathname();
  const { data: session } = useSession();
  const [process, setProcess] = useState<any>();
  const [busy, setBusy] = useState(false);
  const id = path.split('/')[2];

  useEffect(() => {
    if (id) fetch(`/api/processes/${id}`).then((r) => r.ok ? r.json() : null).then(setProcess);
  }, [id]);

  if (!id || !process || !session) return null;

  const role = session.user.role;
  const isResponsibleJudge = process.assignedToId === session.user.id && ['JUIZ', 'DESEMBARGADOR', 'ADMIN'].includes(role);
  const canAssume = !process.assignedToId && (
    role === 'ADMIN' ||
    (role === 'JUIZ' && process.instance === 'PRIMEIRA') ||
    (role === 'DESEMBARGADOR' && process.instance === 'SEGUNDA')
  ) && ['AGUARDANDO_JUIZ', 'AGUARDANDO_DESEMBARGADOR'].includes(process.status);
  const canAssumeDelivery = role === 'OFICIAL_JUSTICA' && process.status === 'AGUARDANDO_INTIMACAO' && !process.officerId;
  const canExtendDefense = isResponsibleJudge && process.status === 'AGUARDANDO_DEFESA' && Number(process.defenseExtensionDays || 0) < 2;

  async function action(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const response = await fetch(`/api/processes/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
      location.reload();
    } catch (error: any) {
      alert(error.message || 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  }

  const nothingToShow = !canAssume && !canAssumeDelivery && !(isResponsibleJudge && process.status === 'EM_ANALISE') && !canExtendDefense;
  if (nothingToShow) return null;

  return <div className="fixed bottom-5 right-5 z-20 flex max-w-md flex-wrap justify-end gap-2">
    {canAssume && <button disabled={busy} className="btn shadow-lg" onClick={() => void action('assumir')}>Assumir processo</button>}
    {canAssumeDelivery && <button disabled={busy} className="btn shadow-lg" onClick={() => void action('assumir_oficial')}>Assumir intimação · 3 dias</button>}
    {isResponsibleJudge && process.status === 'EM_ANALISE' && <button disabled={busy} className="btn shadow-lg" onClick={() => void action('instrucao')}>Iniciar instrução e intimação</button>}
    {canExtendDefense && <div className="flex items-center gap-1 rounded border border-gold/40 bg-[#071426] p-1 shadow-lg">
      <span className="px-2 text-xs text-gold">Defesa: +{process.defenseExtensionDays || 0}/2 dias</span>
      <button disabled={busy} className="btn-outline px-2 py-1 text-xs" onClick={() => void action('prorrogar', { days: 1 })}>+1 dia</button>
      {Number(process.defenseExtensionDays || 0) === 0 && <button disabled={busy} className="btn-outline px-2 py-1 text-xs" onClick={() => void action('prorrogar', { days: 2 })}>+2 dias</button>}
    </div>}
  </div>;
}
