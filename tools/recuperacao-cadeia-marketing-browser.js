// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 RECUPERAÇÃO EM CADEIA MARKETING — browser (expondo __rcm_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_recuperacao-cadeia-marketing';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, falhas: [], recuperacoes: [], cadeias: [], proximoId: 1 }; } catch (e) { return { ativo: false, falhas: [], recuperacoes: [], cadeias: [], proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__rcm_ativar = function() { const d = ler(); const id = 'rcm_' + d.proximoId++; d.ativo = true; const rec = { id, ativo: true, executadoEm: new Date().toISOString(), tipo: 'ativacao' }; d.recuperacoes.push(rec); gravar(d); return { ok: true, recuperacao: rec }; };
  window.__rcm_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__rcm_registrarFalha = function(camada, erro, jogo) { const d = ler(); const falha = { id: 'fal_' + d.proximoId++, camada, erro: String(erro).slice(0, 200), jogo: jogo || 'ambos', executadoEm: new Date().toISOString(), recuperada: false }; d.falhas.push(falha); let cadeia = null; if (d.ativo) { cadeia = { id: 'cad_' + d.proximoId++, falha_id: falha.id, acao: 'recuperacao-automatica', status: 'processando', executadoEm: new Date().toISOString() }; d.cadeias.push(cadeia); falha.recuperada = true; } gravar(d); return { ok: true, falha, cadeia }; };
  window.__rcm_listar = function(jogo, naoRecuperadas) { const d = ler(); let l = d.falhas; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (naoRecuperadas) l = l.filter(x => !x.recuperada); return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm)); };
  window.__rcm_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total_falhas: d.falhas.length, total_recuperacoes: d.recuperacoes.length, falhas_nao_recuperadas: d.falhas.filter(x => !x.recuperada).length, cadeias: d.cadeias.length }; };
  window.__rcm_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();