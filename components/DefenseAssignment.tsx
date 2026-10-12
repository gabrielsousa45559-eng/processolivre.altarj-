'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function DefenseAssignment() {
  const path = usePathname();
  const { data: session } = useSession();
  const [process, setProcess] = useState<any>();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [numericId, setNumericId] = useState('');
  const [message, setMessage] = useState('');
  const id = path.split('/')[2];

  useEffect(() => {
    if (id) fetch(`/api/processes/${id}`).then((r) => r.ok ? r.json() : null).then(setProcess);
  }, [id]);

  if (!id || !process || !session) return null;
  const allowed = session.user.role === 'ADMIN' || (
    ['JUIZ', 'DESEMBARGADOR'].includes(session.user.role) && process.assignedToId === session.user.id
  );
  if (!allowed) return null;

  async function addLawyer() {
    setMessage('');
    const response = await fetch(`/api/processes/${id}/defesa`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, numericId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Não foi possível adicionar o advogado.');
      return;
    }
    setMessage(`Advogado vinculado: ${data.lawyer.name}.`);
    setName('');
    setNumericId('');
  }

  return <div className="fixed bottom-5 left-5 z-20">
    {open ? <div className="panel w-[22rem] p-4 shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <b>Adicionar advogado de defesa</b>
        <button aria-label="Fechar" className="text-lg text-slate-300" onClick={() => setOpen(false)}>×</button>
      </div>
      <p className="mb-3 text-xs text-slate-400">Informe exatamente o nome completo e o ID/passaporte cadastrados do advogado.</p>
      <input className="input mb-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo do advogado" />
      <input className="input mb-2" value={numericId} onChange={(event) => setNumericId(event.target.value)} placeholder="ID / passaporte" />
      {message && <p className="mb-2 text-xs text-slate-300">{message}</p>}
      <button className="btn w-full" onClick={() => void addLawyer()}>Vincular advogado ao processo</button>
    </div> : <button className="btn-outline bg-[#071426] shadow-lg" onClick={() => setOpen(true)}>+ Adicionar advogado</button>}
  </div>;
}
