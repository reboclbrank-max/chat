// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ DETECÇÃO DE SPAM EM COMENTÁRIOS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_spam_v1';
  const PALAVRAS_SPAM = ['ganhe dinheiro', 'clique aqui', 'ganhe r$', 'grátis', 'promoção imperdível', 'ganhe agora', 'dinheiro fácil', 'renda extra', 'trabalhe em casa', 'bitcoin grátis'];
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { analises: [], palavrasBloqueadas: [...PALAVRAS_SPAM], proximoId: 1 }; } catch (e) { return { analises: [], palavrasBloqueadas: [...PALAVRAS_SPAM], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__sp_analisarComentario = function (texto, rede, jogo, autor) {
    const d = c(); const id = 'spam_' + d.proximoId++;
    const t = texto.toLowerCase(); let pontuacao = 0; const palavrasEncontradas = [];
    for (const p of d.palavrasBloqueadas) { if (t.includes(p)) { pontuacao += 10; palavrasEncontradas.push(p); } }
    const ehSpam = pontuacao >= 20;
    const a = { id, texto, ehSpam, pontuacao, palavrasEncontradas, rede: rede || 'todos', jogo: jogo || 'ambos', autor: autor || '', criadoEm: new Date().toISOString() };
    d.analises.push(a); s(d); return { ok: true, analise: a };
  };
  window.__sp_adicionarPalavraBloqueada = function (palavra) { const d = c(); if (!d.palavrasBloqueadas.includes(palavra)) d.palavrasBloqueadas.push(palavra); s(d); return { ok: true, palavrasBloqueadas: d.palavrasBloqueadas }; };
  window.__sp_listarAnalises = function (ehSpam, jogo) { const d = c(); let l = d.analises; if (ehSpam !== null) l = l.filter(x => x.ehSpam === ehSpam); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__sp_estatisticasSpam = function () { const d = c(); const total = d.analises.length; return { total, spam: d.analises.filter(x => x.ehSpam).length, naoSpam: total - d.analises.filter(x => x.ehSpam).length, palavrasBloqueadas: d.palavrasBloqueadas.length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);