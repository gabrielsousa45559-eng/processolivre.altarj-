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
    const response = await fetch('/api/processes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.get('title'), description: form.get('description'), send, attachments }) });
    const process = await response.json();
    if (!response.ok) return setError(process.error);
    router.push(`/processos/${process.id}`);
  }

  if (!session) return null;
  return <Shell name={session.user.name} role={session.user.role}>
    <h1 className="mb-6 text-2xl font-semibold">Abrir processo</h1>
    <form className="panel max-w-3xl p-6" onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget), true); }}>
      <label className="mb-4 block">Título / operação<input className="input mt-1" name="title" required placeholder="Ex.: Operação Cidade Segura" /></label>
      <label className="mb-4 block">Descrição e fundamentos<textarea className="input mt-1 min-h-48" name="description" required placeholder="Descreva os fatos, envolvidos e o pedido." /></label>
      <label className="mb-5 block text-sm">PDF do processo (até 10 MB)<input className="mt-2 block text-sm" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="flex gap-3"><button className="btn">Enviar para análise</button><button type="button" className="btn-outline" onClick={(event) => void submit(new FormData(event.currentTarget.form!), false)}>Salvar rascunho</button></div>
    </form>
  </Shell>;
}
