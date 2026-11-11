// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 AUTORESPONDER AVANÇADO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_autoresponder_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { regras: [], respostas: [], proximoId: 1 }; } catch (e) { return { regras: [], respostas: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ar_criarRegra = function (tipo, palavrasChave, resposta, jogo) {
    const d = c(); const id = 'ar_' + d.proximoId++;
    const r = { id, tipo, palavrasChave: palavrasChave || [], resposta: resposta || '', jogo: jogo || 'ambos', ativa: true, criadoEm: new Date().toISOString(), usos: 0 };
    d.regras.push(r); s(d); return { ok: true, regra: r };
  };
  window.__ar_processarPergunta = function (pergunta, jogo) {
    const d = c(); const p = pergunta.toLowerCase();
    for (const r of d.regras) { if (!r.ativa) continue; if (r.jogo !== 'ambos' && r.jogo !== jogo) continue; for (const kw of r.palavrasChave) { if (p.includes(kw.toLowerCase())) { r.usados = (r.usados || 0) + 1; s(d); return { ok: true, resposta: r.resposta, regra: r.id }; } } }
    return { ok: false, resposta: null };
  };
  window.__ar_listarRegras = function (ativa, jogo) { const d = c(); let l = d.regras; if (ativa !== null) l = l.filter(x => x.ativa === ativa); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l; };
  window.__ar_estatisticasAutoresponder = function () { const d = c(); const total = d.regras.length; const ativas = d.regras.filter(x => x.ativa).length; const usos = d.regras.reduce((s, r) => s + (r.usados || 0), 0); return { total, ativas, totalUsos: usos }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);