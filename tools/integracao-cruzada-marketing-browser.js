// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 INTEGRAÇÃO CRUZADA MARKETING — browser (expondo __icm_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_integracao-cruzada-marketing';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, fluxos: [], execucoes: [], proximoId: 1 }; } catch (e) { return { ativo: false, fluxos: [], execucoes: [], proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__icm_ativar = function() { const d = ler(); const id = 'icm_' + d.proximoId++; d.ativo = true; const f = { id, ativo: true, criadoEm: new Date().toISOString() }; d.fluxos.push(f); gravar(d); return { ok: true, fluxo: f }; };
  window.__icm_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__icm_executar = function(origem, destino, acao, jogo, dados) { const d = ler(); if (!d.ativo) return { ok: false, erro: 'Integração não ativa' }; const exec = { id: 'exc_' + d.proximoId++, origem, destino, acao, jogo: jogo || 'ambos', dados: dados || {}, executadoEm: new Date().toISOString(), status: 'executado' }; d.execucoes.push(exec); gravar(d); return { ok: true, execucao: exec }; };
  window.__icm_listar = function(jogo) { const d = ler(); let l = d.execucoes; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm)); };
  window.__icm_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total_fluxos: d.fluxos.length, total_execucoes: d.execucoes.length }; };
  window.__icm_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();