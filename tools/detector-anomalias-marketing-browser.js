// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 DETECTOR DE ANOMALIAS MARKETING — browser (expondo __dam_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_detector-anomalias-marketing';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, anomalías: [], corrigidas: [], limite_queda: 20, limite_pico: 50, proximoId: 1 }; } catch (e) { return { ativo: false, anomalías: [], corrigidas: [], limite_queda: 20, limite_pico: 50, proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__dam_ativar = function(limiteQueda, limitePico) {
    const d = ler(); const id = 'dan_' + d.proximoId++; d.ativo = true; d.limite_queda = Number(limiteQueda) || 20; d.limite_pico = Number(limitePico) || 50;
    const det = { id, ativo: true, executadoEm: new Date().toISOString(), limite_queda: d.limite_queda, limite_pico: d.limite_pico };
    d.anomalías.push(det); gravar(d); return { ok: true, detector: det };
  };
  window.__dam_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__dam_detectar = function(metrica, valor, referencia, jogo) {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Detector não ativo' };
    const ref = Number(referencia) || 0; const val = Number(valor) || 0; let tipo = 'normal', gravidade = 'baixa';
    if (ref > 0) { const variacao = ((val - ref) / ref) * 100; if (variacao <= -d.limite_queda) { tipo = 'queda'; gravidade = variacao <= -40 ? 'critica' : 'alta'; } else if (variacao >= d.limite_pico) { tipo = 'pico'; gravidade = variacao >= 100 ? 'critica' : 'alta'; } }
    const anom = { id: 'ano_' + d.proximoId++, metrica, valor, referencia, jogo: jogo || 'ambos', tipo, gravidade, executadoEm: new Date().toISOString(), corrigida: false };
    d.anomalías.push(anom);
    if (tipo !== 'normal') { d.corrigidas.push({ anomalia_id: anom.id, acao: 'auto-correcao-disparada', executadoEm: new Date().toISOString(), status: 'processando' }); anom.corrigida = true; }
    gravar(d); return { ok: true, anomalia: anom };
  };
  window.__dam_listar = function(jogo, tipo) { const d = ler(); let l = d.anomalías; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (tipo) l = l.filter(x => x.tipo === tipo); return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm)); };
  window.__dam_estatisticas = function() { const d = ler(); return { ativo: d.ativo, total: d.anomalías.length, quedas: d.anomalías.filter(x => x.tipo === 'queda').length, picos: d.anomalías.filter(x => x.tipo === 'pico').length, corrigidas: d.corrigidas.length, limite_queda: d.limite_queda, limite_pico: d.limite_pico }; };
  window.__dam_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();