'use client';
import { useSession } from 'next-auth/react';
import { Shell } from '@/components/Shell';
import { AdminUserCreate } from '@/components/AdminUserCreate';

export default function Procuradoria() {
  const { data: session } = useSession();
  if (!session) return null;
  if (session.user.role !== 'PROCURADOR_GERAL') return <Shell name={session.user.name} role={session.user.role}><p className="text-red-400">Acesso restrito ao Procurador-Geral.</p></Shell>;
  return <Shell name={session.user.name} role={session.user.role}><h1 className="mb-2 text-2xl font-semibold">Procuradoria-Geral</h1><p className="mb-6 text-slate-400">Cadastre exclusivamente contas de Promotor.</p><AdminUserCreate done={() => undefined} allowedRoles={[['PROMOTOR','Promotor']]} title="Cadastrar Promotor" description="O Procurador-Geral pode criar somente contas de Promotor." /></Shell>;
}
