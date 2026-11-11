// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 DASHBOARD LIMITE MARKETING — browser (expondo __dlm_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_dashboard-limite-marketing';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, widgets: [], alertas: [], ultima_atualizacao: null, proximoId: 1 }; } catch (e) { return { ativo: false, widgets: [], alertas: [], ultima_atualizacao: null, proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__dlm_ativar = function() { const d = ler(); const id = 'dlm_' + d.proximoId++; d.ativo = true; d.ultima_atualizacao = new Date().toISOString(); const w = { id, tipo: 'resumo', criadoEm: new Date().toISOString() }; d.widgets.push(w); gravar(d); return { ok: true, dashboard: d, widget: w }; };
  window.__dlm_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__dlm_adicionarWidget = function(tipo, jogo, dados) { const d = ler(); const id = 'dw_' + d.proximoId++; const w = { id, tipo, jogo: jogo || 'ambos', dados: dados || {}, criadoEm: new Date().toISOString() }; d.widgets.push(w); d.ultima_atualizacao = new Date().toISOString(); gravar(d); return { ok: true, widget: w }; };
  window.__dlm_adicionarAlerta = function(mensagem, severidade, jogo) { const d = ler(); const id = 'da_' + d.proximoId++; const a = { id, mensagem, severidade: severidade || 'info', jogo: jogo || 'ambos', criadoEm: new Date().toISOString(), lido: false }; d.alertas.push(a); if (d.alertas.length > 100) d.alertas = d.alertas.slice(-100); gravar(d); return { ok: true, alerta: a }; };
  window.__dlm_listarAlertas = function(jogo, naoLidos) { const d = ler(); let l = d.alertas; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (naoLidos) l = l.filter(x => !x.lido); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__dlm_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total_widgets: d.widgets.length, total_alertas: d.alertas.length, alertas_nao_lidos: d.alertas.filter(x => !x.lido).length, ultima_atualizacao: d.ultima_atualizacao }; };
  window.__dlm_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();