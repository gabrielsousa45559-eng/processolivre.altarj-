'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Shell } from '@/components/Shell';
import { AdminUserCreate } from '@/components/AdminUserCreate';

const roles = [['PROCURADOR_GERAL', 'Procurador-Geral'], ['PROMOTOR', 'Promotor'], ['JUIZ', 'Juiz'], ['DESEMBARGADOR', 'Desembargador'], ['ADVOGADO', 'Advogado de defesa'], ['VITIMA', 'Cidadão'], ['OFICIAL_JUSTICA', 'Oficial de Justiça'], ['ADMIN', 'Administrador']];
export default function Admin() {
  const { data: session } = useSession(); const [users, setUsers] = useState<any[]>([]); const [items, setItems] = useState<any[]>([]); const [error, setError] = useState(''); const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const load = () => { fetch('/api/users').then(response => response.json()).then(setUsers); fetch('/api/processes').then(response => response.json()).then(setItems); };
  useEffect(load, []);
  if (!session) return null;
  if (session.user.role !== 'ADMIN') return <Shell name={session.user.name} role={session.user.role}><p className="text-red-400">Acesso restrito.</p></Shell>;
  async function dropUser(id: string, name: string) { if (!confirm(`Desativar o login de ${name}?`)) return; const response = await fetch(`/api/users?id=${id}`, { method: 'DELETE' }); if (!response.ok) setError((await response.json()).error); load(); }
  async function changeRole(id: string, currentRole: string) { const role = selectedRoles[id] || currentRole; if (role === currentRole) return; const response = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'alterar_cargo', role }) }); const data = await response.json(); if (!response.ok) setError(data.error || 'Não foi possível alterar o cargo.'); else { setError('Cargo atualizado. A conta, senha e histórico foram preservados.'); load(); } }
  async function dropProcess(id: string) { if (!confirm('Excluir este processo e seus anexos?')) return; const response = await fetch(`/api/processes/${id}`, { method: 'DELETE' }); if (!response.ok) setError((await response.json()).error); load(); }
  return <Shell name={session.user.name} role={session.user.role}>
    <h1 className="mb-2 text-2xl font-semibold">Administração</h1><p className="mb-6 text-slate-400">Controle de acessos, cargos e processos.</p>{error && <p className="mb-4 text-blue-200">{error}</p>}
    <AdminUserCreate done={load} />
    <section className="mb-8"><h2 className="mb-3 text-lg font-semibold">Todos os processos</h2><div className="space-y-2">{items.map(process => <div key={process.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4"><div><b className="text-blue-300">{process.number}</b><span className="ml-2">{process.title}</span><p className="text-xs text-slate-400">{process.creator?.name} · {process.status}</p></div><div className="flex gap-2"><Link className="btn-outline text-xs" href={`/processos/${process.id}`}>Abrir</Link><button className="btn-outline text-xs text-red-400" onClick={() => void dropProcess(process.id)}>Excluir</button></div></div>)}</div></section>
    <section><h2 className="mb-3 text-lg font-semibold">Logins cadastrados</h2><div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">ID</th><th>Nome</th><th>Cargo</th><th>Status</th><th className="p-3">Ações</th></tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-t border-line"><td className="p-3">{user.numericId}</td><td>{user.name}</td><td><div className="flex min-w-60 gap-2"><select className="input py-1 text-xs" disabled={user.id === session.user.id} value={selectedRoles[user.id] || user.role} onChange={event => setSelectedRoles({ ...selectedRoles, [user.id]: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{user.id !== session.user.id && <button className="btn-outline px-2 py-1 text-xs" onClick={() => void changeRole(user.id, user.role)}>Salvar</button>}</div></td><td>{user.active ? 'Ativo' : 'Desativado'}</td><td className="p-3">{user.active && user.id !== session.user.id && <button className="text-red-400" onClick={() => void dropUser(user.id, user.name)}>Excluir login</button>}</td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-slate-500">A troca de cargo não exclui a conta, a senha nem o histórico de movimentações.</p></section>
  </Shell>;
}
