// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 LOOP DE APRENDIZAGEM AUTOMÁTICO — browser (expondo __laa_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_loop-aprendizado-automatico';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, iteracoes: [], melhorias_aplicadas: [], taxa_aprendizado: 0.1, proximoId: 1 }; } catch (e) { return { ativo: false, iteracoes: [], melhorias_aplicadas: [], taxa_aprendizado: 0.1, proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__laa_ativar = function(taxa) { const d = ler(); const id = 'lap_' + d.proximoId++; d.ativo = true; d.taxa_aprendizado = Number(taxa) || 0.1; const it = { id, ativo: true, executadoEm: new Date().toISOString(), iteracao: d.iteracoes.length + 1 }; d.iteracoes.push(it); gravar(d); return { ok: true, iteracao: it }; };
  window.__laa_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__laa_registrar = function(acao, resultado, jogo, impacto) { const d = ler(); if (!d.ativo) return { ok: false, erro: 'Loop não ativo' }; const reg = { id: 'res_' + d.proximoId++, acao, resultado, jogo: jogo || 'ambos', impacto: Number(impacto) || 0, executadoEm: new Date().toISOString(), aprendizado_aplicado: false }; d.iteracoes.push(reg); if (Math.abs(reg.impacto) > 5) { d.melhorias_aplicadas.push({ acao: reg.acao, impacto: reg.impacto, ajustado: true, executadoEm: new Date().toISOString() }); reg.aprendizado_aplicado = true; } gravar(d); return { ok: true, registro: reg }; };
  window.__laa_listar = function(jogo) { const d = ler(); let l = d.iteracoes; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm)); };
  window.__laa_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total_iteracoes: d.iteracoes.length, melhorias_aplicadas: d.melhorias_aplicadas.length, taxa_aprendizado: d.taxa_aprendizado }; };
  window.__laa_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();