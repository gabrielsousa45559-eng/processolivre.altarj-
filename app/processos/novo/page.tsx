'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shell } from '@/components/Shell';

type Attachment = { name: string; path: string; mimeType: string };

export default function NewProcess() {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [facts, setFacts] = useState('');
  const [reviewing, setReviewing] = useState(false);

  async function submit(form: FormData, send: boolean) {
    setError('');
    let attachments: Attachment[] = [];
    if (file) {
      const upload = new FormData();
      upload.append('file', file);
      const result = await fetch('/api/upload', { method: 'POST', body: upload });
      const uploaded = await result.json();
      if (!result.ok) return setError(uploaded.error);
      attachments = [uploaded as Attachment];
    }
    const response = await fetch('/api/processes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.get('title'), facts, crimes: form.get('crimes'), send, attachments }) });
    const process = await response.json();
    if (!response.ok) return setError(process.error);
    router.push(`/processos/${process.id}`);
  }
  async function formalize(){setReviewing(true);setError('');const r=await fetch('/api/facts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({facts})});const d=await r.json();setReviewing(false);if(!r.ok)return setError(d.error);setFacts(d.text);}

  if (!session) return null;
  return <Shell name={session.user.name} role={session.user.role}>
    <h1 className="mb-1 text-2xl font-semibold">Processos</h1><p className="mb-6 text-slate-400">O número é gerado automaticamente ao abrir o processo.</p>
    <form className="panel max-w-3xl p-6" onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget), true); }}>
      <label className="mb-4 block">Nome do processo / operação<input className="input mt-1" name="title" required placeholder="Ex.: Operação Cidade Segura" /></label>
      <div className="mb-4"><div className="mb-1 flex items-center justify-between gap-3"><label>Dos Fatos</label><button type="button" className="btn-outline text-xs" disabled={reviewing||!facts.trim()} onClick={()=>void formalize()}>{reviewing?'Revisando…':'✨ Formalizar Dos Fatos'}</button></div><textarea className="input min-h-48" value={facts} onChange={e=>setFacts(e.target.value)} required placeholder="Narre somente os fatos conhecidos, envolvidos e datas."/><p className="mt-1 text-xs text-slate-500">A IA apenas formaliza e corrige a escrita. Revise o texto antes de enviar.</p></div>
      <label className="mb-4 block">Dos Crimes (opcional)<textarea className="input mt-1 min-h-28" name="crimes" placeholder="Informe os crimes ou a classificação já definida." /></label>
      <label className="mb-5 block text-sm">PDF do processo (até 10 MB)<input className="mt-2 block text-sm" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="flex gap-3"><button className="btn">Enviar para análise</button><button type="button" className="btn-outline" onClick={(event) => void submit(new FormData(event.currentTarget.form!), false)}>Salvar rascunho</button></div>
    </form>
  </Shell>;
}
