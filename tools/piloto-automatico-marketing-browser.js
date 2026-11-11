// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 PILOTO AUTOMÁTICO MARKETING — versão browser (expondo __pilam_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_piloto-automatico-marketing';
  
  function ler() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      return b ? JSON.parse(b) : { ativo: false, modos: {}, ultima_execucao: null, historico: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    } catch (e) { return { ativo: false, modos: {}, ultima_execucao: null, historico: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; }
  }
  function gravar(d) {
    try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  window.__pilam_listar = function() { return ler(); };

  window.__pilam_ativar = function(jogo, modo, intervaloMinutos) {
    const d = ler();
    const id = 'pil_' + d.proximoId++;
    d.ativo = true;
    d.modos[jogo] = d.modos[jogo] || {};
    d.modos[jogo][modo] = { id, ativo: true, intervaloMinutos: Number(intervaloMinutos) || 60, ultimaExecucao: null, proximaExecucao: new Date(Date.now() + (Number(intervaloMinutos) || 60) * 60000).toISOString(), criadoEm: new Date().toISOString() };
    gravar(d);
    return { ok: true, piloto: d.modos[jogo][modo] };
  };

  window.__pilam_desativar = function(jogo, modo) {
    const d = ler();
    if (d.modos[jogo] && d.modos[jogo][modo]) {
      d.modos[jogo][modo].ativo = false;
      gravar(d);
      return { ok: true };
    }
    return { ok: false, erro: 'Piloto não encontrado' };
  };

  window.__pilam_executar = function(jogo, modo) {
    const d = ler();
    const piloto = d.modos[jogo] && d.modos[jogo][modo];
    if (!piloto || !piloto.ativo) return { ok: false, erro: 'Piloto não ativo' };
    const entrada = { jogo, modo, executadoEm: new Date().toISOString(), id: piloto.id };
    d.historico.push(entrada);
    if (d.historico.length > 200) d.historico = d.historico.slice(-200);
    piloto.ultimaExecucao = entrada.executadoEm;
    piloto.proximaExecucao = new Date(Date.now() + (piloto.intervaloMinutos || 60) * 60000).toISOString();
    d.ultima_execucao = entrada.executadoEm;
    gravar(d);
    return { ok: true, piloto: entrada };
  };

  window.__pilam_estatisticas = function() {
    const d = ler();
    let total = 0, ativos = 0;
    for (const j of Object.keys(d.modos || {})) {
      for (const m of Object.keys(d.modos[j] || {})) {
        total++;
        if (d.modos[j][m].ativo) ativos++;
      }
    }
    return { ativo: d.ativo, totalPilotos: total, ativos, ultima_execucao: d.ultima_execucao, total_execucoes: (d.historico || []).length };
  };

  window.__pilam_limpar = function() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  };
})();