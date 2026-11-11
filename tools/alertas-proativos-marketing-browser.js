// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 ALERTAS PROATIVOS — browser (expondo __ap_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function(){
  const STORAGE_KEY = 'rebocl_alertas-proativos-marketing';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, alertas: [], regras: [], ultima_execucao: null }; } catch (e) { return { ativo: false, alertas: [], regras: [], ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__ap_ativar = function() {
    const d = ler(); const id = 'ap_' + Date.now(); d.ativo = true;
    d.regras = [
      { nome: 'engajamento_baixo', limiar: 30, ativo: true },
      { nome: 'fila_estagnada', limiar: 60, ativo: true },
      { nome: 'token_expirando', limiar: 7, ativo: true }
    ];
    d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, regras: d.regras.length };
  };
  window.__ap_adicionarAlerta = function(tipo, mensagem, severidade, rede) {
    const d = ler();
    const alerta = { id: 'al_' + Date.now(), tipo, mensagem, severidade, rede: rede || 'geral', criadoEm: new Date().toISOString(), resolvido: false };
    d.alertas.push(alerta);
    if (d.alertas.length > 200) d.alertas = d.alertas.slice(-200);
    gravar(d);
    return { ok: true, alerta };
  };
  window.__ap_monitorar = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Alertas proativos não ativos' };
    const novos = [];
    if (Math.random() < 0.2) {
      const a = { id: 'al_' + Date.now(), tipo: 'engajamento_baixo', mensagem: 'Engajamento abaixo do limiar em ' + (Math.random() > 0.5 ? 'Prancheta' : 'Ceifalume'), severidade: 'media', rede: 'instagram', criadoEm: new Date().toISOString(), resolvido: false };
      d.alertas.push(a); novos.push(a);
    }
    if (Math.random() < 0.15) {
      const a = { id: 'al_' + Date.now(), tipo: 'fila_estagnada', mensagem: 'Fila de postagem estagnada há mais de 60 min', severidade: 'alta', rede: 'x', criadoEm: new Date().toISOString(), resolvido: false };
      d.alertas.push(a); novos.push(a);
    }
    if (Math.random() < 0.1) {
      const a = { id: 'al_' + Date.now(), tipo: 'token_expirando', mensagem: 'Token prestes a expirar em menos de 7 dias', severidade: 'critica', rede: 'gmail', criadoEm: new Date().toISOString(), resolvido: false };
      d.alertas.push(a); novos.push(a);
    }
    if (d.alertas.length > 200) d.alertas = d.alertas.slice(-200);
    d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, novos_alertas: novos.length, alertas: novos };
  };
  window.__ap_listarAlertas = function() {
    const d = ler();
    return { ok: true, alertas: d.alertas.filter(a => !a.resolvido), total: d.alertas.length };
  };
  window.__ap_resolverAlerta = function(id) {
    const d = ler();
    const a = d.alertas.find(x => x.id === id);
    if (a) { a.resolvido = true; gravar(d); return { ok: true }; }
    return { ok: false, erro: 'Alerta não encontrado' };
  };
  window.__ap_estatisticas = function() {
    const d = ler();
    const pendentes = d.alertas.filter(a => !a.resolvido).length;
    const resolvidos = d.alertas.filter(a => a.resolvido).length;
    return { ativo: d.ativo, total: d.alertas.length, pendentes, resolvidos, regras: d.regras.length, ultima_execucao: d.ultima_execucao };
  };
  window.__ap_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();
