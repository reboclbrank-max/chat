// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 😊 ANÁLISE DE SENTIMENTO DE COMENTÁRIOS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_sentimento_v1';
  const POS = ['gosto','adorei','excelente','incrível','show','top','legal','bom','ótimo','maravilhoso','fantástico','perfeito','amei','recomendo'];
  const NEG = ['odeio','péssimo','ruim','horrível','detesto','lento','bug','erro','falha','decepção','triste','raiva','pior','não gosto','odiei'];
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { analises: [], proximoId: 1 }; } catch (e) { return { analises: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__sent_analisarSentimento = function (texto, rede, jogo, autor) {
    const d = c(); const t = texto.toLowerCase();
    let pos = 0, neg = 0;
    for (const p of POS) if (t.includes(p)) pos++;
    for (const n of NEG) if (t.includes(n)) neg++;
    let sentimento = 'neutro'; if (pos > neg) sentimento = 'positivo'; else if (neg > pos) sentimento = 'negativo';
    const id = 'sent_' + d.proximoId++;
    const a = { id, texto, sentimento, pos, neg, rede: rede || 'todos', jogo: jogo || 'ambos', autor: autor || '', criadoEm: new Date().toISOString() };
    d.analises.push(a); s(d); return { ok: true, analise: a };
  };
  window.__sent_listarAnalises = function (sentimento, jogo) { const d = c(); let l = d.analises; if (sentimento) l = l.filter(x => x.sentimento === sentimento); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l; };
  window.__sent_estatisticasSentimento = function () { const d = c(); const total = d.analises.length; return { total, positivo: d.analises.filter(x => x.sentimento === 'positivo').length, negativo: d.analises.filter(x => x.sentimento === 'negativo').length, neutro: d.analises.filter(x => x.sentimento === 'neutro').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);