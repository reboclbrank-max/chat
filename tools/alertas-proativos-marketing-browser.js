// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 ALERTAS PROATIVOS — browser (expondo __ap_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function() {
  const STORAGE_KEY = 'rebocl_alertas-proativos-marketing';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, alertas: [], regras: [ { nome: 'engajamento_baixo', limiar: 30, ativo: true }, { nome: 'fila_estagnada', limiar: 60, ativo: true }, { nome: 'token_expirando', limiar: 7, ativo: true } ], ultima_execucao: null }; } catch (e) { return { ativo: false, alertas: [], regras: [], ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__ap_ativar = function() {
    const d = ler(); const id = 'ap_' + Date.now(); d.ativo = true; d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, regras: d.regras.length };
  };

  window.__ap_desativar = function() {
    const d = ler(); d.ativo = false; gravar(d);
    return { ok: true };
  };

  window.__ap_adicionarAlerta = function(tipo, mensagem, severidade, rede) {
    const d = ler();
    const alerta = { id: 'al_' + Date.now(), tipo, mensagem, severidade: severidade || 'media', rede: rede || 'geral', criadoEm: new Date().toISOString(), resolvido: false };
    d.alertas.push(alerta);
    if (d.alertas.length > 200) d.alertas = d.alertas.slice(-200);
    gravar(d);
    return { ok: true, alerta };
  };

  window.__ap_monitorarMetricas = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Alertas proativos não ativos' };
    const novos = [];
    const agora = new Date();
    // Verifica dados de fluxo de acesso
    const fluxo = (d.fluxo_acesso || {});
    for (const rede of Object.keys(fluxo)) {
      for (const jogo of Object.keys(fluxo[rede] || {})) {
        const horas = fluxo[rede][jogo];
        const ultimaHora = Math.max(...Object.keys(horas).map(Number));
        const horasInativas = (agora.getHours() - ultimaHora + 24) % 24;
        if (horasInativas > 1) {
          const a = window.__ap_adicionarAlerta('fila_estagnada', 'Fila estagnada em ' + rede + ' para ' + jogo + ' há ' + horasInativas + 'h', 'alta', rede);
          novos.push(a);
        }
      }
    }
    d.ultima_execucao = agora.toISOString();
    gravar(d);
    return { ok: true, novos_alertas: novos.length, alertas: novos };
  };

  window.__ap_listarAlertas = function(resolvido = null) {
    const d = ler();
    let l = d.alertas;
    if (resolvido !== null) l = l.filter(x => x.resolvido === resolvido);
    return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
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
    return { ativo: d.ativo, total: d.alertas.length, pendentes, resolvidos, regras: (d.regras || []).length, ultima_execucao: d.ultima_execucao };
  };
})();
