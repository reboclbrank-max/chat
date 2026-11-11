// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏷️ TAGS E CATEGORIZAÇÃO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_tags_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { tags: [], postagens: [], proximoId: 1 }; } catch (e) { return { tags: [], postagens: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__tag_criarTag = function (nome, descricao, cor) {
    const d = c(); const id = 'tag_' + d.proximoId++;
    const tag = { id, nome, descricao: descricao || '', cor: cor || '#00d4aa', criadoEm: new Date().toISOString(), usos: 0 };
    d.tags.push(tag); s(d); return { ok: true, tag };
  };
  window.__tag_associarTag = function (postId, tagId, rede, jogo) {
    const d = c(); const id = 'pt_' + d.proximoId++;
    const assoc = { id, postId, tagId, rede: rede || 'todos', jogo: jogo || 'ambos', criadoEm: new Date().toISOString(), engajamento: null };
    d.postagens.push(assoc); const t = d.tags.find(x => x.id === tagId); if (t) t.usados = (t.usados || 0) + 1; s(d); return { ok: true, associacao: assoc };
  };
  window.__tag_listarTags = function () { const d = c(); return d.tags.sort((a, b) => (b.usados || 0) - (a.usados || 0)); };
  window.__tag_atualizarEngajamentoTag = function (postId, engajamento) {
    const d = c(); const a = d.postagens.find(p => p.postId === postId); if (!a) return { ok: false, erro: 'Post não encontrado' };
    a.engajamento = engajamento; s(d); return { ok: true, associacao: a };
  };
  window.__tag_estatisticasTags = function () { const d = c(); return { totalTags: d.tags.length, totalPostagens: d.postagens.length, maisUsada: d.tags[0] || null }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);