// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 AUTO-OTIMIZADOR AVANÇADO — browser (expondo __ao_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function() {
  const STORAGE_KEY = 'rebocl_auto-otimizador-avancado';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, fluxo_acesso: {}, metricas_engajamento: {}, otimizacoes: [], proximoId: 1 }; } catch (e) { return { ativo: false, fluxo_acesso: {}, metricas_engajamento: {}, otimizacoes: [], proximoId: 1 }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  const JOGOS = ['ceifalume', 'prancheta'];
  const REDES = ['instagram', 'x', 'nostr', 'gmail', 'threads', 'bluesky', 'youtube'];

  window.__aoa_ativar = function() {
    const d = ler(); const id = 'ao_' + d.proximoId++; d.ativo = true; gravar(d);
    return { ok: true, id };
  };

  window.__ao_desativar = function() {
    const d = ler(); d.ativo = false; gravar(d);
    return { ok: true };
  };

  window.__ao_registrarAcesso = function(rede, jogo, hora, quantidade) {
    const d = ler();
    if (!JOGOS.includes(jogo)) return { ok: false, erro: 'Jogo inválido: ' + jogo };
    if (!REDES.includes(rede)) return { ok: false, erro: 'Rede inválida: ' + rede };
    if (!d.fluxo_acesso[rede]) d.fluxo_acesso[rede] = {};
    if (!d.fluxo_acesso[rede][jogo]) d.fluxo_acesso[rede][jogo] = {};
    const chaveHora = String(hora);
    d.fluxo_acesso[rede][jogo][chaveHora] = (d.fluxo_acesso[rede][jogo][chaveHora] || 0) + Number(quantidade || 1);
    gravar(d);
    return { ok: true, rede, jogo, hora, total: d.fluxo_acesso[rede][jogo][chaveHora] };
  };

  window.__ao_registrarEngajamento = function(rede, jogo, metrica, valor) {
    const d = ler();
    if (!JOGOS.includes(jogo)) jogo = 'ambos';
    if (!d.metricas_engajamento[rede]) d.metricas_engajamento[rede] = {};
    if (!d.metricas_engajamento[rede][jogo]) d.metricas_engajamento[rede][jogo] = {};
    d.metricas_engajamento[rede][jogo][metrica] = Number(valor) || 0;
    gravar(d);
    return { ok: true, rede, jogo, metrica, valor };
  };

  window.__ao_melhorHorario = function(rede, jogo) {
    const d = ler();
    const dados = d.fluxo_acesso[rede] && d.fluxo_acesso[rede][jogo];
    if (!dados) return { ok: false, erro: 'Sem dados de acesso para ' + rede + '/' + jogo };
    let melhorHora = null; let melhorValor = -1;
    for (const [h, v] of Object.entries(dados)) { if (v > melhorValor) { melhorValor = v; melhorHora = h; } }
    return { ok: true, rede, jogo, melhor_horario: melhorHora, acessos: melhorValor };
  };

  window.__ao_calcularCadencia = function(rede, jogo) {
    const d = ler();
    const fluxo = d.fluxo_acesso[rede] && d.fluxo_acesso[rede][jogo];
    const eng = d.metricas_engajamento[rede] && d.metricas_engajamento[rede][jogo];
    if (!fluxo) return { ok: false, erro: 'Sem dados de fluxo para ' + rede + '/' + jogo };
    const totalAcessos = Object.values(fluxo).reduce((s, v) => s + v, 0);
    let intervaloMinutos = 120;
    if (totalAcessos > 1000) intervaloMinutos = 60;
    else if (totalAcessos > 500) intervaloMinutos = 90;
    else if (totalAcessos < 100) intervaloMinutos = 240;
    if (eng) {
      const engajamentoTotal = Object.values(eng).reduce((s, v) => s + v, 0);
      if (engajamentoTotal > 500) intervaloMinutos = Math.max(30, intervaloMinutos - 30);
      else if (engajamentoTotal < 50) intervaloMinutos = Math.min(480, intervaloMinutos + 60);
    }
    return { ok: true, rede, jogo, intervalo_minutos: intervaloMinutos, total_acessos: totalAcessos };
  };

  window.__ao_executarOtimizacao = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Auto-otimizador não ativo' };
    const resultados = [];
    for (const rede of REDES) {
      for (const jogo of JOGOS) {
        const cad = window.__ao_calcularCadencia(rede, jogo);
        const mh = window.__ao_melhorHorario(rede, jogo);
        if (cad.ok) {
          const otim = { id: 'opt_' + d.proximoId++, rede, jogo, intervalo_minutos: cad.intervalo_minutos, melhor_horario: mh.ok ? mh.melhor_horario : null, total_acessos: cad.total_acessos, executadoEm: new Date().toISOString() };
          d.otimizacoes.push(otim);
          if (d.otimizacoes.length > 500) d.otimizacoes = d.otimizacoes.slice(-500);
          resultados.push(otim);
        }
      }
    }
    gravar(d);
    return { ok: true, total: resultados.length, otimizacoes: resultados };
  };

  window.__ao_listarOtimizacoes = function(rede = null, jogo = null) {
    const d = ler();
    let l = d.otimizacoes;
    if (rede) l = l.filter(x => x.rede === rede);
    if (jogo) l = l.filter(x => x.jogo === jogo);
    return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
  };

  window.__ao_estatisticas = function() {
    const d = ler();
    let totalFluxo = 0;
    for (const r of Object.values(d.fluxo_acesso || {})) {
      for (const j of Object.values(r || {})) {
        for (const v of Object.values(j || {})) totalFluxo += v;
      }
    }
    return { ativo: d.ativo, total_otimizacoes: d.otimizacoes.length, total_pontos_acesso: totalFluxo, redes_monitoradas: Object.keys(d.fluxo_acesso || {}).length, jogos: JOGOS };
  };
})();
