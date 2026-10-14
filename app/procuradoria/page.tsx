'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Shell } from '@/components/Shell';
import { AdminUserCreate } from '@/components/AdminUserCreate';

type Promoter = { id: string; name: string; numericId: string; active: boolean };
export default function Procuradoria() {
  const { data: session } = useSession(); const [users, setUsers] = useState<Promoter[]>([]); const [message, setMessage] = useState('');
  const load = useCallback(async () => { const response = await fetch('/api/users'); if (response.ok) setUsers(await response.json()); }, []);
  useEffect(() => { void load(); }, [load]);
  if (!session) return null;
  if (session.user.role !== 'PROCURADOR_GERAL') return <Shell name={session.user.name} role={session.user.role}><p className="text-red-400">Acesso restrito ao Procurador-Geral.</p></Shell>;
  async function update(id: string, action: string) { setMessage(''); const response = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }); const data = await response.json(); setMessage(response.ok ? 'Cadastro atualizado e registrado na auditoria.' : data.error || 'Não foi possível atualizar a conta.'); if (response.ok) void load(); }
  return <Shell name={session.user.name} role={session.user.role}>
    <h1 className="mb-2 text-2xl font-semibold">Procuradoria-Geral</h1><p className="mb-6 text-slate-400">Gestão exclusiva de Promotores. Todas as alterações ficam registradas.</p>
    <AdminUserCreate done={load} allowedRoles={[["PROMOTOR", "Promotor"]]} title="Cadastrar Promotor" description="O Procurador-Geral pode criar e gerir somente contas de Promotor." />
    <section className="panel p-5"><div className="mb-4"><h2 className="text-lg font-semibold">Promotores cadastrados</h2><p className="text-sm text-slate-400">Suspender ou desativar bloqueia o acesso. Remover cargo também desativa a conta.</p></div>{message && <p className="mb-3 text-sm text-blue-200">{message}</p>}<div className="space-y-2">{users.map(user => <div className="rounded border border-line p-3 sm:flex sm:items-center sm:justify-between" key={user.id}><div><b>{user.name}</b><p className="text-xs text-slate-400">ID {user.numericId} · {user.active ? 'Ativo' : 'Suspenso/desativado'}</p></div><div className="mt-3 flex flex-wrap gap-2 sm:mt-0">{user.active ? <button className="btn-outline px-3 py-1 text-xs" onClick={() => void update(user.id, 'suspender')}>Suspender</button> : <button className="btn px-3 py-1 text-xs" onClick={() => void update(user.id, 'ativar')}>Ativar</button>}<button className="btn-outline px-3 py-1 text-xs text-red-200" onClick={() => void update(user.id, 'remover_cargo')}>Remover cargo</button></div></div>)}{!users.length && <p className="text-sm text-slate-400">Nenhum promotor cadastrado.</p>}</div></section>
  </Shell>;
}
