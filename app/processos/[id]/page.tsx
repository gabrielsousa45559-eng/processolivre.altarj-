'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shell } from '@/components/Shell';
import { Status } from '@/components/Status';
import { WorkflowPanel } from '@/components/WorkflowPanel';

export default function Detail() {
  const { data: session } = useSession();
  const { id } = useParams<{ id: string }>();
  const [process, setProcess] = useState<any>();
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [mode, setMode] = useState('autorizar');
  const [actorName, setActorName] = useState('');
  const [actorId, setActorId] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [partyRole, setPartyRole] = useState('VITIMA');
  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch(`/api/processes/${id}`);
    setProcess(response.ok ? await response.json() : null);
  }

  useEffect(() => { void load(); }, [id]);
  if (!session || !process) return <main className="p-10">Carregando processo…</main>;

  const documents = (process.attachments || []).filter((item: any) => item.mimeType === 'application/pdf');
  const activeDocument = documents.find((item: any) => item.id === selectedDocumentId) || documents.at(-1);
  const canDecide = process.status === 'DECISAO' && ['JUIZ', 'DESEMBARGADOR', 'ADMIN'].includes(session.user.role) && (process.assignedToId === session.user.id || session.user.role === 'ADMIN');
  const canAddVictim = ['PROMOTOR', 'JUIZ', 'ADMIN'].includes(session.user.role);
  const canAddDefendant = ['OFICIAL_JUSTICA', 'JUIZ', 'ADMIN'].includes(session.user.role);

  async function uploadDocument(document: File) {
    const form = new FormData();
    form.append('file', document);
    const response = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o arquivo.');
    return data;
  }

  async function sendDecision() {
    setError('');
    if (!actorName.trim() || !actorId.trim() || !file) {
      setError('Nome, ID e arquivo PDF são obrigatórios.');
      return;
    }
    if (mode === 'devolver' && !note.trim()) {
      setError('O motivo do ajuste é obrigatório.');
      return;
    }
    setBusy(true);
    try {
      const document = await uploadDocument(file);
      const response = await fetch(`/api/processes/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, actorName, actorId, note, document }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível registrar a decisão.');
      setFile(null); setNote(''); await load();
    } catch (reason: any) {
      setError(reason.message || 'Não foi possível registrar a decisão.');
    } finally { setBusy(false); }
  }

  async function replaceDocument(replacement: File) {
    setError('');
    try {
      const document = await uploadDocument(replacement);
      const response = await fetch(`/api/processes/${id}/replace-document`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o arquivo.');
      await load();
    } catch (reason: any) { setError(reason.message || 'Não foi possível atualizar o arquivo.'); }
  }

  async function addParty() {
    setError('');
    if (!partyName.trim()) { setError('Informe o nome da parte.'); return; }
    const response = await fetch(`/api/processes/${id}/parties`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: partyRole, name: partyName, identifier: partyId }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Não foi possível adicionar a parte.'); return; }
    setPartyName(''); setPartyId(''); await load();
  }

  return <Shell name={session.user.name} role={session.user.role}>
    <div className="mb-5 flex justify-between gap-4">
      <div><p className="text-blue-300">{process.number}</p><h1 className="text-2xl">{process.title}</h1></div>
      <Status status={process.status} />
    </div>
    {error && <p className="mb-4 rounded border border-red-800 bg-red-950/40 p-3 text-red-200">{error}</p>}
    <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
      <section className="space-y-5">
        <WorkflowPanel process={process} user={session.user} onUpdated={load} />
        <div className="panel overflow-hidden">
          <div className="border-b border-line p-3">
            <b>Documentos do processo</b>
            <p className="mt-1 text-xs text-slate-400">Selecione um documento para visualizar ou baixar. Todos os documentos liberados ao seu perfil aparecem aqui.</p>
          </div>
          {documents.length ? <>
            <div className="flex gap-1 overflow-x-auto border-b border-line bg-[#071426] p-2">
              {documents.map((item: any) => <button key={item.id} onClick={() => setSelectedDocumentId(item.id)} className={activeDocument?.id === item.id ? 'shrink-0 rounded bg-blue-900/70 px-3 py-2 text-xs text-blue-100' : 'shrink-0 rounded px-3 py-2 text-xs text-slate-400 hover:bg-[#10223a]'}>
                {({ DENUNCIA: 'Denúncia', INSTRUCAO: 'Instrução', INTIMACAO: 'Intimação', DEFESA: 'Defesa', DECISAO: 'Decisão', RECURSO: 'Recurso / provas novas' } as Record<string, string>)[item.stage] || item.name}
              </button>)}
            </div>
            <div className="flex flex-wrap justify-between gap-3 border-b border-line p-3">
              <b className="text-sm">{activeDocument?.name}</b>
              <span><a className="mr-3 text-sm text-blue-300" href={activeDocument?.path} target="_blank">Abrir</a><a className="text-sm text-blue-300" href={activeDocument?.path} download>Baixar PDF</a></span>
            </div>
            <iframe key={activeDocument?.id} title="Documento do processo" className="h-[70vh] w-full bg-white" src={activeDocument?.path} />
          </> : <p className="p-8">Documento não encontrado.</p>}
        </div>

        {process.creatorId === session.user.id && !process.assignedToId && <div className="panel p-4">
          <b>Atualizar documento da denúncia</b>
          <p className="mb-3 mt-1 text-sm text-slate-400">Disponível somente antes de o processo ser assumido pelo magistrado.</p>
          <input className="block text-sm" type="file" accept="application/pdf" onChange={(event) => event.target.files?.[0] && void replaceDocument(event.target.files[0])} />
        </div>}

        {(canAddVictim || canAddDefendant) && <div className="panel p-4">
          <h2 className="mb-1 font-semibold">Adicionar parte envolvida</h2>
          <p className="mb-3 text-sm text-slate-400">Cadastre vítimas ou réus vinculados a este processo.</p>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto]">
            <select className="input" value={partyRole} onChange={(event) => setPartyRole(event.target.value)}>
              {canAddVictim && <option value="VITIMA">Vítima</option>}{canAddDefendant && <option value="REU">Réu</option>}
            </select>
            <input className="input" value={partyName} onChange={(event) => setPartyName(event.target.value)} placeholder="Nome *" />
            <input className="input" value={partyId} onChange={(event) => setPartyId(event.target.value)} placeholder="ID / passaporte" />
            <button className="btn" onClick={() => void addParty()}>+ Adicionar</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{['VITIMA', 'REU'].map((role) => <div key={role}><b className="text-sm">{role === 'VITIMA' ? 'Vítimas' : 'Réus'}</b><div className="mt-1 text-sm text-slate-300">{process.parties?.filter((item: any) => item.role === role).map((item: any) => <p key={item.id}>{item.name}{item.identifier ? ` · ${item.identifier}` : ''}</p>)}{!process.parties?.some((item: any) => item.role === role) && <span className="text-slate-500">Nenhum cadastrado.</span>}</div></div>)}</div>
        </div>}

        {canDecide && <div className="panel p-4">
          <h2 className="mb-3 font-semibold">Decisão</h2>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">{[['autorizar', 'Autorizar'], ['devolver', 'Devolver p/ ajuste'], ['negar', 'Negar']].map(([value, label]) => <button type="button" onClick={() => setMode(value)} className={mode === value ? 'btn' : 'btn-outline'} key={value}>{label}</button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2"><input className="input" value={actorName} onChange={(event) => setActorName(event.target.value)} placeholder="Seu nome *" /><input className="input" value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="Seu ID / passaporte *" /></div>
          <textarea className="input mt-3 min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder={mode === 'devolver' ? 'Motivo do ajuste *' : 'Observação (opcional)'} />
          <label className="mt-3 block rounded border border-dashed border-blue-500/60 p-4 text-sm">Documento da decisão (PDF obrigatório)<input className="mt-2 block" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
          <button disabled={busy} className="btn mt-3 w-full disabled:opacity-50" onClick={() => void sendDecision()}>{busy ? 'Enviando…' : 'Confirmar decisão'}</button>
        </div>}
      </section>
      <aside className="panel p-4"><h2 className="mb-4 font-semibold">Histórico</h2>{process.actions?.map((action: any) => <div className="mb-4 border-l border-blue-400 pl-3 text-sm" key={action.id}><b>{action.user.name}</b><p>{action.note || action.type}</p><small>{new Date(action.createdAt).toLocaleString('pt-BR')}</small></div>)}</aside>
    </div>
  </Shell>;
}
