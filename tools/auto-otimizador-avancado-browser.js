// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 AUTO-OTIMIZADOR AVANÇADO — browser (expondo __aoa_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function(){
  const STORAGE_KEY = 'rebocl_auto-otimizador-avancado';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, redes: {}, ajustes: [], ultima_execucao: null }; } catch (e) { return { ativo: false, redes: {}, ajustes: [], ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  const REDES = ['instagram', 'x', 'nostr', 'gmail'];
  const JOGOS = ['ambos', 'prancheta', 'ceifalume'];

  window.__aoa_ativar = function() {
    const d = ler(); const id = 'aoa_' + Date.now(); d.ativo = true;
    REDES.forEach(rede => {
      if (!d.redes[rede]) d.redes[rede] = {};
      JOGOS.forEach(jogo => {
        if (!d.redes[rede][jogo]) {
          d.redes[rede][jogo] = { horarios: [], media_acesso: 0, ultimo_ajuste: null, total_registros: 0 };
        }
      });
    });
    d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, redes: REDES.length, jogos: JOGOS.length };
  };
  window.__aoa_registrarAcesso = function(rede, jogo, horario, sucesso) {
    const d = ler();
    if (!d.redes[rede]) d.redes[rede] = {};
    if (!d.redes[rede][jogo]) d.redes[rede][jogo] = { horarios: [], media_acesso: 0, ultimo_ajuste: null, total_registros: 0 };
    const r = d.redes[rede][jogo];
    r.horarios.push({ horario, sucesso: !!sucesso, registradoEm: new Date().toISOString() });
    if (r.horarios.length > 200) r.horarios = r.horarios.slice(-200);
    r.total_registros++;
    const media = r.horarios.filter(h => h.sucesso).length / r.horarios.length * 100;
    r.media_acesso = Math.round(media * 100) / 100;
    gravar(d);
    return { ok: true, media_acesso: r.media_acesso };
  };
  window.__aoa_otimizar = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Auto-otimizador não ativo' };
    const ajustes = [];
    REDES.forEach(rede => {
      JOGOS.forEach(jogo => {
        const r = d.redes[rede] && d.redes[rede][jogo];
        if (r && r.horarios.length > 0) {
          const melhores = r.horarios.filter(h => h.sucesso).map(h => h.horario);
          if (melhores.length > 0) {
            const ajuste = { rede, jogo, horario_recomendado: melhores[Math.floor(Math.random() * melhores.length)], confianca: Math.round(r.media_acesso * 100), total_registros: r.total_registros };
            ajustes.push(ajuste);
            r.ultimo_ajuste = new Date().toISOString();
          }
        }
      });
    });
    d.ajustes = ajustes;
    d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, ajustes };
  };
  window.__aoa_estatisticas = function() {
    const d = ler();
    return { ativo: d.ativo, redes_configuradas: Object.keys(d.redes).length, total_ajustes: d.ajustes.length, ultima_execucao: d.ultima_execucao };
  };
  window.__aoa_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();
