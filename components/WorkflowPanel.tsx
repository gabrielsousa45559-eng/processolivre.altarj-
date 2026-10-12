'use client';

import { useState } from 'react';

const steps = [
  ['DENUNCIA', 'Denúncia', 'Promotor'],
  ['INSTRUCAO', 'Instrução', 'Juiz'],
  ['INTIMACAO', 'Intimação', 'Oficial de Justiça'],
  ['DEFESA', 'Defesa', 'Advogado'],
  ['AUDIENCIA', 'Audiência', 'Juiz'],
  ['DECISAO', 'Decisão', 'Juiz'],
];

export function WorkflowPanel({ process, user, onUpdated }: { process: any; user: any; onUpdated: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [hearingAt, setHearingAt] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isJudge = ['JUIZ', 'DESEMBARGADOR', 'ADMIN'].includes(user.role) && process.assignedToId === user.id;
  const isDefense = user.role === 'ADVOGADO' && process.participants?.some((item: any) => item.userId === user.id && item.role === 'ADVOGADO');
  const isOfficer = user.role === 'OFICIAL_JUSTICA' && process.officerId === user.id;
  const isPromoter = user.role === 'PROMOTOR' && process.creatorId === user.id;
  const appealAvailable = (isDefense || isPromoter) && ['AUTORIZADO', 'NEGADO'].includes(process.status);
  const completed = new Set((process.attachments || []).map((item: any) => item.stage || 'DENUNCIA'));
  if (process.hearingAt) completed.add('AUDIENCIA');

  async function upload() {
    if (!file) throw new Error('Anexe o PDF obrigatório desta etapa.');
    const form = new FormData(); form.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o PDF.');
    return data;
  }

  async function action(action: string, payload: Record<string, unknown> = {}, needsFile = false) {
    setBusy(true); setMessage('');
    try {
      const document = needsFile ? await upload() : undefined;
      const endpoint = action === 'intimacao' ? `/api/processes/${process.id}/delivery` : `/api/processes/${process.id}/action`;
      const body = action === 'intimacao' ? { document, note } : { action, document, note, ...payload };
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível concluir esta etapa.');
      setFile(null); setNote(''); setMessage('Etapa registrada com sucesso.'); await onUpdated();
    } catch (error: any) { setMessage(error.message || 'Não foi possível concluir esta etapa.'); }
    finally { setBusy(false); }
  }

  return <section className="panel p-4">
    <div className="mb-4"><h2 className="font-semibold">Etapas do processo</h2><p className="mt-1 text-sm text-slate-400">Cada fase possui o próprio documento. A próxima só é liberada quando a anterior for concluída.</p></div>
    <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{steps.map(([key, title, owner], index) => <div key={key} className={`rounded border p-3 ${completed.has(key) ? 'border-success/50 bg-green-950/20' : 'border-line bg-[#071426]'}`}><span className="text-xs text-slate-500">{index + 1}. {owner}</span><b className="mt-1 block text-sm">{title}</b><small className={completed.has(key) ? 'text-green-300' : 'text-slate-500'}>{completed.has(key) ? 'Documento anexado' : 'Aguardando'}</small></div>)}</div>

    {isJudge && process.status === 'EM_ANALISE' && <ActionBox title="Fase de instrução" text="Anexe o documento oficial de instrução para encaminhar a intimação." file={file} setFile={setFile} note={note} setNote={setNote} button="Enviar instrução" busy={busy} onClick={() => void action('instrucao', {}, true)} />}
    {isOfficer && process.status === 'EM_INTIMACAO' && <ActionBox title="Registrar intimação" text="Anexe o documento oficial de intimação. Após o envio, inicia o prazo da defesa." file={file} setFile={setFile} note={note} setNote={setNote} button="Enviar documento de intimação" busy={busy} onClick={() => void action('intimacao', {}, true)} />}
    {isDefense && process.status === 'AGUARDANDO_DEFESA' && <ActionBox title="Apresentar defesa" text="Anexe a petição de defesa em PDF. Após protocolar, o juiz poderá agendar audiência." file={file} setFile={setFile} note={note} setNote={setNote} button="Protocolar defesa" busy={busy} onClick={() => void action('defesa', {}, true)} />}
    {isJudge && process.status === 'DEFESA_APRESENTADA' && !process.hearingAt && <div className="rounded border border-line bg-[#071426] p-4"><b>Agendar audiência</b><p className="mb-3 mt-1 text-sm text-slate-400">A defesa foi apresentada. Defina a data da audiência antes da decisão.</p><div className="flex flex-wrap gap-2"><input className="input max-w-xs" type="datetime-local" value={hearingAt} onChange={(event) => setHearingAt(event.target.value)} /><button disabled={busy} className="btn" onClick={() => void action('audiencia', { hearingAt })}>Agendar audiência</button></div></div>}
    {isJudge && process.status === 'DEFESA_APRESENTADA' && process.hearingAt && <div className="rounded border border-line bg-[#071426] p-4"><b>Audiência agendada</b><p className="mb-3 mt-1 text-sm text-slate-400">{new Date(process.hearingAt).toLocaleString('pt-BR')}. Após realizar a audiência, encaminhe o caso para decisão.</p><div className="mb-3 flex flex-wrap gap-2"><input className="input max-w-xs" type="datetime-local" value={hearingAt} onChange={(event) => setHearingAt(event.target.value)} /><button disabled={busy} className="btn-outline" onClick={() => void action('adiar_audiencia', { hearingAt })}>Adiar audiência</button></div>{process.hearingRequests?.filter((request:any)=>request.status==='PENDENTE').map((request:any)=><div className="mb-2 rounded border border-gold/40 p-3 text-sm" key={request.id}><b>{request.requester.name}</b> solicitou {new Date(request.proposedAt).toLocaleString('pt-BR')}{request.note&&<p className="mt-1 text-slate-300">{request.note}</p>}<div className="mt-2 flex gap-2"><button className="btn-outline text-xs" onClick={()=>void action('decidir_remarcacao',{requestId:request.id,accept:true})}>Aceitar nova data</button><button className="btn-outline text-xs" onClick={()=>void action('decidir_remarcacao',{requestId:request.id,accept:false})}>Negar</button></div></div>)}<button disabled={busy} className="btn" onClick={() => void action('encaminhar_decisao')}>Concluir audiência e liberar decisão</button></div>}
    {isDefense && process.status === 'DEFESA_APRESENTADA' && process.hearingAt && <div className="rounded border border-line bg-[#071426] p-4"><b>Solicitar nova data de audiência</b><p className="mb-3 mt-1 text-sm text-slate-400">O pedido será enviado para decisão do juiz.</p><div className="flex flex-wrap gap-2"><input className="input max-w-xs" type="datetime-local" value={hearingAt} onChange={(event) => setHearingAt(event.target.value)} /><button disabled={busy} className="btn-outline" onClick={()=>void action('solicitar_remarcacao',{hearingAt})}>Solicitar nova data</button></div></div>}
    {appealAvailable && <ActionBox title="Solicitar segunda instância" text="Anexe um PDF com provas novas para encaminhar o recurso ao Desembargador." file={file} setFile={setFile} note={note} setNote={setNote} button="Solicitar 2ª instância" busy={busy} onClick={() => void action('solicitar_segunda', {}, true)} />}
    {message && <p className="mt-3 text-sm text-blue-200">{message}</p>}
  </section>;
}

function ActionBox({ title, text, file, setFile, note, setNote, button, busy, onClick }: any) {
  return <div className="rounded border border-blue-700/50 bg-[#071426] p-4"><b>{title}</b><p className="mb-3 mt-1 text-sm text-slate-400">{text}</p><input className="mb-2 block text-sm" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /><textarea className="input mb-2 min-h-20" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observação (opcional)" /><button disabled={busy} className="btn" onClick={onClick}>{busy ? 'Enviando…' : button}</button></div>;
}
