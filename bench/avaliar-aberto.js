// Rubrica compartilhada pela régua aberta e pelo verificador de itens.
// Avalia forma e termos, NÃO confirma que as afirmações são verdadeiras ou boa literatura.
'use strict';

function avaliar(texto, it) {
  const t = String(texto || '');
  const falhas = [];
  const palavras = t.split(/\s+/).filter(Boolean).length;
  const paragrafos = t.split(/\n+/).filter((p) => p.trim().length > 0).length;
  const itens = (t.match(/^\s*(?:[-*•]|\d+[.)])\s+\S/gm) || []).length;
  if (!t.trim()) return { ok: false, falhas: ['vazio'], palavras: 0, paragrafos: 0, itens: 0 };
  if (it.minPalavras && palavras < it.minPalavras) falhas.push('curto (' + palavras + '<' + it.minPalavras + ')');
  if (it.maxPalavras && palavras > it.maxPalavras) falhas.push('longo (' + palavras + '>' + it.maxPalavras + ')');
  if (it.paragrafos && paragrafos < it.paragrafos) falhas.push('parágrafos (' + paragrafos + '<' + it.paragrafos + ')');
  if (it.itens && itens < it.itens) falhas.push('itens (' + itens + '<' + it.itens + ')');
  (it.contem || []).forEach((padrao, i) => {
    if (!new RegExp(padrao, 'i').test(t)) falhas.push('falta fato #' + (i + 1) + ' (' + padrao.split('|')[0] + ')');
  });
  if (/como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar|desculpe, mas/i.test(t)) falhas.push('meta-resposta');
  if (/^\s*(claro|certamente|com certeza|aqui est[áa]|segue)/i.test(t)) falhas.push('preâmbulo');
  if (!/[.!?…"”)]\s*$/.test(t.trim())) falhas.push('não terminou a frase (provável corte por limite de tokens)');
  return { ok: falhas.length === 0, falhas, palavras, paragrafos, itens };
}

module.exports = { avaliar };
