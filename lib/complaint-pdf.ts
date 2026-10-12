import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type DocumentData = { number: string; date: string; prosecutor: string; prosecutorId: string; defendants: string; victims: string; facts: string; crimes: string; proofs: string; requests: string; signature?: string };
const blue = rgb(0.05, 0.23, 0.49); const line = rgb(0.63, 0.72, 0.84); const margin = 58;

function wrap(text: string, max = 90) {
  const words = text.replace(/\s+/g, ' ').trim().split(' '); const rows: string[] = []; let current = '';
  for (const word of words) { if (`${current} ${word}`.trim().length > max) { if (current) rows.push(current); current = word; } else current = `${current} ${word}`.trim(); }
  if (current) rows.push(current); return rows;
}

export async function complaintPdf(data: DocumentData) {
  const pdf = await PDFDocument.create(); const times = await pdf.embedFont(StandardFonts.TimesRoman); const bold = await pdf.embedFont(StandardFonts.TimesRomanBold); const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  let page = pdf.addPage([595.28, 841.89]); let y = 790; let pageNumber = 1;
  const footer = () => page.drawText(`Página ${pageNumber}`, { x: 490, y: 27, size: 7, font: times, color: blue });
  const header = () => { page.drawText('PODER JUDICIÁRIO DO ESTADO DO RIO DE JANEIRO', { x: 154, y: 790, size: 9, font: bold, color: blue }); page.drawText('Comarca de Cidade Alta - RJ', { x: 231, y: 774, size: 7, font: italic, color: blue }); page.drawText('Vara de Execuções Criminais e Medidas de Segurança', { x: 178, y: 762, size: 6.5, font: italic, color: blue }); page.drawLine({ start: { x: 58, y: 748 }, end: { x: 537, y: 748 }, thickness: .8, color: blue }); y = 724; };
  const next = () => { footer(); page = pdf.addPage([595.28, 841.89]); pageNumber++; header(); };
  const body = (value: string, size = 9, indent = 0) => { for (const paragraph of value.split(/\n+/).filter(Boolean)) { for (const row of wrap(paragraph, Math.max(48, 98 - Math.floor(indent / 4)))) { if (y < 62) next(); page.drawText(row, { x: margin + indent, y, size, font: times }); y -= size + 4; } y -= 3; } };
  const section = (value: string) => { if (y < 100) next(); page.drawText(value, { x: margin, y, size: 10, font: bold, color: blue }); y -= 10; page.drawLine({ start: { x: margin, y }, end: { x: 537, y }, thickness: .45, color: line }); y -= 13; };
  header();
  page.drawRectangle({ x: 58, y: 656, width: 479, height: 70, borderColor: line, borderWidth: .6, color: rgb(.96, .98, 1) });
  const rows = [['PROCESSO Nº:', data.number], ['DENUNCIANTE:', `${data.prosecutor} - Promotor de Justiça (ID ${data.prosecutorId})`], ['RÉUS:', data.defendants || 'Não informado'], ['ASSUNTO:', 'Denúncia criminal, requisição civil e requerimentos']];
  let rowY = 712; for (const [label, value] of rows) { page.drawText(label, { x: 68, y: rowY, size: 7, font: bold, color: blue }); page.drawText(value, { x: 160, y: rowY, size: 7, font: times }); rowY -= 16; }
  y = 638;
  section('1. RELATÓRIO'); body(`Trata-se de denúncia apresentada pelo Ministério Público, por intermédio de ${data.prosecutor}, em face dos envolvidos identificados, com fundamento na narrativa dos fatos e nos elementos probatórios anexados.`);
  section('2. DOS FATOS'); body(data.facts, 9, 10);
  section('3. DOS CRIMES'); body(data.crimes || 'Classificação pendente de revisão pelo responsável.', 9, 10);
  section('4. DO DIREITO E DO DANO MORAL'); body('A narrativa apresentada aponta elementos que, em tese, justificam o regular prosseguimento da apuração e a responsabilização cabível, observados o contraditório, a ampla defesa e as regras aplicáveis ao processo.');
  section('5. DO CÁLCULO E DA DISTRIBUIÇÃO'); body(data.requests, 9, 10);
  section('6. DOS PEDIDOS E REQUERIMENTOS'); body('Requer-se o recebimento da presente denúncia, o regular prosseguimento do feito, a apreciação das provas anexadas e a adoção das providências cabíveis pela autoridade competente.', 9, 10);
  section('7. DAS PROVAS UTILIZADAS PARA EMBASAMENTO DA ACUSAÇÃO'); body(data.proofs || 'Não foram informadas provas adicionais.', 9, 10);
  if (data.victims) { section('PARTES VÍTIMAS'); body(data.victims, 9, 10); }
  if (y < 150) next(); y -= 22; page.drawText(`Cidade Alta - RJ, ${data.date}.`, { x: 350, y, size: 8, font: times }); y -= 36; page.drawText(data.signature || data.prosecutor, { x: 220, y, size: 14, font: italic, color: blue }); y -= 14; page.drawText('Promotor de Justiça', { x: 250, y, size: 8, font: bold, color: blue }); footer();
  return Buffer.from(await pdf.save());
}
