// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 AUTO-ESCALADA MARKETING — browser (expondo __aem_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_auto-escalada-marketing';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, escalas: [], limites: { min: 5, max: 1440 }, proximoId: 1 }; } catch (e) { return { ativo: false, escalas: [], limites: { min: 5, max: 1440 }, proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__aem_ativar = function(camada, intervaloMinutos, jogo) { const d = ler(); const id = 'aem_' + d.proximoId++; d.ativo = true; const esc = { id, camada, intervaloMinutos: Math.max(d.limites.min, Math.min(d.limites.max, Number(intervaloMinutos) || 60)), jogo: jogo || 'ambos', ativo: true, criadoEm: new Date().toISOString(), ajustes: 0 }; d.escalas.push(esc); gravar(d); return { ok: true, escala: esc }; };
  window.__aem_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__aem_ajustar = function(camada, novoIntervalo, jogo) { const d = ler(); const esc = d.escalas.find(x => x.camada === camada && (x.jogo === jogo || x.jogo === 'ambos')); if (!esc) return { ok: false, erro: 'Escala não encontrada' }; esc.intervaloMinutos = Math.max(d.limites.min, Math.min(d.limites.max, Number(novoIntervalo) || esc.intervaloMinutos)); esc.ajustes++; gravar(d); return { ok: true, escala: esc }; };
  window.__aem_listar = function(jogo) { const d = ler(); let l = d.escalas; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => a.intervaloMinutos - b.intervaloMinutos); };
  window.__aem_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total_escalas: d.escalas.length, total_ajustes: d.escalas.reduce((s, x) => s + x.ajustes, 0), limites: d.limites }; };
  window.__aem_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();