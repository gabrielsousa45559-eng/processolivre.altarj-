'use client';
import { useState } from 'react';

const allRoles: [string, string][] = [['PROCURADOR_GERAL', 'Procurador-Geral'], ['PROMOTOR', 'Promotor'], ['JUIZ', 'Juiz'], ['DESEMBARGADOR', 'Desembargador'], ['ADVOGADO', 'Advogado de defesa'], ['VITIMA', 'Cidadão'], ['OFICIAL_JUSTICA', 'Oficial de Justiça'], ['ADMIN', 'Administrador']];
export function AdminUserCreate({ done, allowedRoles = allRoles, title = 'Cadastrar login institucional', description = 'Somente a Administração cria contas e define o cargo.' }: { done: () => void; allowedRoles?: [string, string][]; title?: string; description?: string }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true); setMsg(''); const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)), signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setMsg(data.error || 'Não foi possível criar o login.'); return; }
      setMsg(data.oab ? `Login criado. OAB gerada: ${data.oab}` : 'Login criado com sucesso.');
      (document.getElementById('create-login') as HTMLFormElement)?.reset(); done();
    } catch (error: any) {
      setMsg(error?.name === 'AbortError' ? 'O servidor demorou para responder. Tente novamente em instantes.' : 'Falha de conexão ao criar o login. Tente novamente.');
    } finally { window.clearTimeout(timeout); setBusy(false); }
  }
  return <section className="panel mb-8 p-5"><h2 className="text-lg font-semibold">{title}</h2><p className="mb-4 mt-1 text-sm text-slate-400">{description}</p><form id="create-login" className="grid gap-3 md:grid-cols-2" onSubmit={event => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }}><input className="input" name="name" required placeholder="Nome completo" /><input className="input" name="numericId" required placeholder="ID / passaporte" /><select className="input" name="role" defaultValue={allowedRoles[0]?.[0]}>{allowedRoles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input className="input" name="password" required minLength={8} type="password" placeholder="Senha inicial (mínimo 8 caracteres)" />{msg && <p className="text-sm text-blue-200 md:col-span-2">{msg}</p>}<button className="btn md:col-span-2" disabled={busy}>{busy ? 'Criando login…' : 'Criar login'}</button></form></section>;
}
