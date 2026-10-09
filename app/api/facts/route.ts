import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const facts = String((await req.json()).facts ?? '').trim();
  if (!facts) return NextResponse.json({ error: 'Informe os fatos para revisão.' }, { status: 400 });
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'A IA não está configurada.' }, { status: 503 });
  const prompt = `Reescreva apenas o texto em “Dos Fatos” abaixo em português jurídico formal. Preserve integralmente pessoas, datas, locais, acontecimentos, incertezas e sequência narrada. Não invente, não remova, não conclua crimes, não dê aconselhamento nem acrescente fundamentos legais. Corrija somente gramática, pontuação e a forma de datas já presentes. Retorne somente o texto revisado.\n\nDOS FATOS:\n${facts}`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: prompt }] }) });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'Falha ao revisar os fatos.' }, { status: 502 });
  return NextResponse.json({ text: data.choices?.[0]?.message?.content || facts });
}
