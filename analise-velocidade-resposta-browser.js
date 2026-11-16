// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚡ ANÁLISE DE VELOCIDADE DE RESPOSTA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_velocidade_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { respostas: [], proximoId: 1 }; } catch (e) { return { respostas: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__vel_registrarResposta = function (rede, jogo, tempoSegundos, tipo, autor) {
    const d = c(); const id = 'vel_' + d.proximoId++;
    const r = { id, rede: rede || 'todos', jogo: jogo || 'ambos', tempoSegundos: Number(tempoSegundos) || 0, tipo: tipo || 'comentario', autor: autor || '', criadoEm: new Date().toISOString() };
    d.respostas.push(r); s(d); return { ok: true, resposta: r };
  };
  window.__vel_listarRespostas = function (rede, jogo) { const d = c(); let l = d.respostas; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__vel_estatisticasVelocidade = function (rede, jogo) { const d = c(); let l = d.respostas; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); const total = l.length; const medio = total > 0 ? (l.reduce((s, r) => s + r.tempoSegundos, 0) / total).toFixed(2) : 0; return { total, tempoMedio: medio, minimo: total > 0 ? Math.min(...l.map(r => r.tempoSegundos)) : 0, maximo: total > 0 ? Math.max(...l.map(r => r.tempoSegundos)) : 0 }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);