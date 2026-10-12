'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function DefenseAssignment() {
  const path = usePathname(); const { data: session } = useSession(); const id = path.split('/')[2];
  const [process, setProcess] = useState<any>(); const [lawyers, setLawyers] = useState<any[]>([]); const [selected, setSelected] = useState(''); const [open, setOpen] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { if (id) fetch(`/api/processes/${id}`).then((r) => r.ok ? r.json() : null).then(setProcess); }, [id]);
  useEffect(() => { if (open) fetch('/api/lawyers').then((r) => r.ok ? r.json() : []).then(setLawyers); }, [open]);
  if (!id || !process || !session) return null;
  const allowed = session.user.role === 'ADMIN' || (['JUIZ', 'DESEMBARGADOR'].includes(session.user.role) && process.assignedToId === session.user.id);
  if (!allowed) return null;
  async function addLawyer() { const lawyer = lawyers[Number(selected)]; if (!lawyer) { setMessage('Selecione um advogado ativo.'); return; } const response = await fetch(`/api/processes/${id}/defesa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lawyer) }); const data = await response.json(); setMessage(response.ok ? `Advogado vinculado: ${data.lawyer.name}.` : data.error || 'Não foi possível adicionar o advogado.'); }
  return <div className="fixed bottom-5 left-5 z-20">{open ? <div className="panel w-[22rem] p-4 shadow-2xl"><div className="mb-2 flex items-center justify-between"><b>Adicionar advogado de defesa</b><button aria-label="Fechar" className="text-lg" onClick={() => setOpen(false)}>×</button></div><p className="mb-3 text-xs text-slate-400">Selecione um advogado ativo para vincular ao processo.</p><select className="input mb-2" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Selecione o advogado</option>{lawyers.map((lawyer, index) => <option value={index} key={lawyer.numericId}>{lawyer.name} · {lawyer.oab || `ID ${lawyer.numericId}`}</option>)}</select>{message && <p className="mb-2 text-xs text-slate-300">{message}</p>}<button className="btn w-full" onClick={() => void addLawyer()}>Vincular advogado ao processo</button></div> : <button className="btn-outline bg-[#071426] shadow-lg" onClick={() => setOpen(true)}>+ Adicionar advogado</button>}</div>;
}
