import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProcessStatus, Role } from '@/lib/constants';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Shell } from '@/components/Shell';
import { Status } from '@/components/Status';

const config: any = {
  PROMOTOR: { title: 'Painel do Promotor', text: 'Acusação, provas, prazos e acompanhamento dos seus casos.', actions: [['Criar Processo','/processos/novo'],['Processos criados','/processos'],['Processos em andamento','/processos'],['Prazos e notificações','/processos']] },
  PROCURADOR_GERAL: { title: 'Painel do Procurador-Geral', text: 'Processos da promotoria e cadastro restrito de novos Promotores.', actions: [['Criar Processo','/processos/novo'],['Meus processos','/processos'],['Cadastrar Promotores','/procuradoria']] },
  JUIZ: { title: 'Painel do Juiz', text: 'Assuma processos disponíveis e acompanhe apenas os seus casos.', actions: [['Processos disponíveis','/processos'],['Meus Processos','/processos'],['Audiências','/processos'],['Pendências e sentenças','/processos']] },
  OFICIAL_JUSTICA: { title: 'Painel do Oficial de Justiça', text: 'Acesse somente as diligências atribuídas a você.', actions: [['Minhas Diligências','/processos'],['Intimações pendentes','/processos'],['Cumpridas','/processos'],['Não cumpridas','/processos']] },
  ADVOGADO: { title: 'Painel da Defesa', text: 'Acompanhe clientes vinculados, prazos e suas manifestações.', actions: [['Meus Clientes','/processos'],['Processos em andamento','/processos'],['Prazos da Defesa','/processos'],['Protocolar Petição','/processos']] },
  VITIMA: { title: 'Painel do Cidadão', text: 'Acompanhe seus processos e as atualizações permitidas.', actions: [['Meus Processos','/processos'],['Enviar Provas','/processos'],['Minhas Intimações','/processos'],['Acompanhar andamento','/processos']] },
  DESEMBARGADOR: { title: 'Painel do Desembargador', text: 'Recursos de segunda instância e decisões recursais.', actions: [['Recursos disponíveis','/processos'],['Processos assumidos','/processos'],['Decisões de 2ª instância','/processos']] },
  ADMIN: { title: 'Administração', text: 'Controle integral de logins, processos e permissões.', actions: [['Administração','/admin'],['Todos os processos','/processos']] },
};

export default async function Dashboard() {
  const session = await getAuth(); if (!session) redirect('/login');
  const role = session.user.role;
  const where = role === Role.ADMIN ? {} : role === Role.OFICIAL_JUSTICA ? { OR: [{ officerId: session.user.id }, { officerId: null, status: ProcessStatus.AGUARDANDO_INTIMACAO }] } : [Role.PROMOTOR, Role.PROCURADOR_GERAL].some((item) => item === role) ? { creatorId: session.user.id } : role === Role.JUIZ ? { OR: [{ assignedToId: session.user.id }, { assignedToId: null, instance: 'PRIMEIRA', status: ProcessStatus.AGUARDANDO_JUIZ }] } : role === Role.DESEMBARGADOR ? { OR: [{ assignedToId: session.user.id }, { assignedToId: null, instance: 'SEGUNDA', status: ProcessStatus.AGUARDANDO_DESEMBARGADOR }] } : { participants: { some: { userId: session.user.id } } };
  const [items, total] = await Promise.all([prisma.process.findMany({ where, include: { creator: true }, orderBy: { updatedAt: 'desc' }, take: 6 }), prisma.process.count({ where })]);
  const panel = config[role] || config.VITIMA;
  return <Shell name={session.user.name} role={role}><header className="mb-8"><p className="text-sm uppercase tracking-[.18em] text-blue-300">{session.user.numericId}</p><h1 className="mt-1 text-2xl font-semibold">{panel.title}</h1><p className="mt-1 text-slate-400">{panel.text}</p></header><section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{panel.actions.map((action:[string,string])=><Link className="panel p-4 transition hover:-translate-y-1 hover:border-blue-400" href={action[1]} key={action[0]}><span className="text-sm font-semibold">{action[0]}</span><p className="mt-2 text-xs text-slate-400">Abrir área</p></Link>)}</section><section><div className="mb-4 flex justify-between"><h2 className="text-lg font-semibold">Processos disponíveis <span className="text-slate-500">({total})</span></h2><Link className="text-sm text-blue-300" href="/processos">Ver todos</Link></div><div className="space-y-2">{items.map((item)=><Link href={`/processos/${item.id}`} key={item.id} className="panel flex items-center justify-between gap-4 p-4 hover:border-blue-400"><div><b className="text-blue-300">{item.number}</b><span className="ml-2 font-medium">{item.title}</span><p className="mt-1 text-xs text-slate-500">{item.creator.name} · {item.updatedAt.toLocaleString('pt-BR')}</p></div><Status status={item.status}/></Link>)}{!items.length&&<div className="panel p-8 text-center text-slate-400">Nenhum processo nesta área.</div>}</div></section></Shell>;
}
