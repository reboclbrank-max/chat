// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 AUTO-OTIMIZADOR DE HORÁRIOS — browser (expondo __aoh_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_auto-otimizador-horarios';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, otimizacoes: [], redes: {}, proximoId: 1 }; } catch (e) { return { ativo: false, otimizacoes: [], redes: {}, proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__aoh_ativar = function(rede, jogo) { const d = ler(); const id = 'aoh_' + d.proximoId++; d.ativo = true; d.redes[rede] = d.redes[rede] || {}; d.redes[rede][jogo || 'ambos'] = { id, ativo: true, criadoEm: new Date().toISOString(), ajustes: 0 }; gravar(d); return { ok: true, otimizacao: d.redes[rede][jogo || 'ambos'] }; };
  window.__aoh_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__aoh_registrar = function(rede, horario, jogo, quantidade) { const d = ler(); const reg = { id: 'acc_' + d.proximoId++, rede, horario, jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, executadoEm: new Date().toISOString() }; d.otimizacoes.push(reg); if (d.redes[rede] && d.redes[rede][jogo || 'ambos']) d.redes[rede][jogo || 'ambos'].ajustes++; gravar(d); return { ok: true, registro: reg }; };
  window.__aoh_listar = function(rede) { const d = ler(); let l = d.otimizacoes; if (rede) l = l.filter(x => x.rede === rede); return l.sort((a, b) => b.quantidade - a.quantidade); };
  window.__aoh_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total_otimizacoes: d.otimizacoes.length, redes: Object.keys(d.redes).length, total_ajustes: d.otimizacoes.reduce((s, x) => s + x.quantidade, 0) }; };
  window.__aoh_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();