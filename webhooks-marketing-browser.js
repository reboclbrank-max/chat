// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🪝 WEBHOOKS DE MARKETING — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_webhooks_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { webhooks: [], disparos: [], proximoId: 1 }; } catch (e) { return { webhooks: [], disparos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__wh_cadastrarWebhook = function (nome, url, evento, jogo) {
    const d = c(); const id = 'wh_' + d.proximoId++;
    const w = { id, nome, url: url || '', evento: evento || '', jogo: jogo || 'ambos', ativo: true, disparos: 0, criadoEm: new Date().toISOString() };
    d.webhooks.push(w); s(d); return { ok: true, webhook: w };
  };
  window.__wh_dispararWebhook = function (evento, dados, jogo) {
    const d = c(); const alvos = d.webhooks.filter(w => w.evento === evento && w.ativo && (w.jogo === 'ambos' || w.jogo === jogo));
    const resultados = [];
    for (const w of alvos) { w.disparos++; resultados.push({ webhookId: w.id, url: w.url, evento, disparadoEm: new Date().toISOString() }); d.disparos.push({ webhookId: w.id, evento, dados, jogo, criadoEm: new Date().toISOString() }); }
    s(d); return { ok: true, disparos: resultados.length, resultados };
  };
  window.__wh_listarWebhooks = function (jogo, ativo) { const d = c(); let l = d.webhooks; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (ativo !== null) l = l.filter(x => x.ativo === ativo); return l; };
  window.__wh_estatisticasWebhooks = function () { const d = c(); const total = d.webhooks.length; return { total, totalDisparos: d.webhooks.reduce((s, w) => s + (w.disparos || 0), 0), totalRegistros: d.disparos.length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);