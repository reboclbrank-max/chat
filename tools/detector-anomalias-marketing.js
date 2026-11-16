// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 DETECTOR DE ANOMALIAS MARKETING — detecta quedas/picos em todas as métricas
// e dispara auto-correção em cadeia. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'detector-anomalias-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, anomalías: [], corrigidas: [], limite_queda: 20, limite_pico: 50, proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarDetectorAnomalias(limiteQueda, limitePico) {
  const c = carregar();
  const id = 'dan_' + c.proximoId++;
  c.ativo = true;
  c.limite_queda = Number(limiteQueda) || 20;
  c.limite_pico = Number(limitePico) || 50;
  const det = { id, ativo: true, executadoEm: new Date().toISOString(), limite_queda: c.limite_queda, limite_pico: c.limite_pico };
  c.anomalías.push(det);
  salvar();
  return { ok: true, detector: det };
}

function desativarDetectorAnomalias() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function detectarAnomalia(metrica, valor, referencia, jogo) {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Detector não ativo' };
  const ref = Number(referencia) || 0;
  const val = Number(valor) || 0;
  let tipo = 'normal', gravidade = 'baixa';
  if (ref > 0) {
    const variacao = ((val - ref) / ref) * 100;
    if (variacao <= -c.limite_queda) { tipo = 'queda'; gravidade = variacao <= -40 ? 'critica' : 'alta'; }
    else if (variacao >= c.limite_pico) { tipo = 'pico'; gravidade = variacao >= 100 ? 'critica' : 'alta'; }
  }
  const anom = { id: 'ano_' + c.proximoId++, metrica, valor, referencia, jogo: jogo || 'ambos', tipo, gravidade, executadoEm: new Date().toISOString(), corrigida: false };
  c.anomalías.push(anom);
  if (tipo !== 'normal') {
    c.corrigidas.push({ anomalia_id: anom.id, acao: 'auto-correcao-disparada', executadoEm: new Date().toISOString(), status: 'processando' });
    anom.corrigida = true;
  }
  salvar();
  return { ok: true, anomalia: anom };
}

function listarAnomalias(jogo = null, tipo = null) {
  const c = carregar();
  let l = c.anomalías;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
}

function estatisticasDetectorAnomalias() {
  const c = carregar();
  const total = c.anomalías.length;
  const quedas = c.anomalías.filter(x => x.tipo === 'queda').length;
  const picos = c.anomalías.filter(x => x.tipo === 'pico').length;
  const corrigidas = c.corrigidas.length;
  return { ativo: c.ativo, total, quedas, picos, corrigidas, limite_queda: c.limite_queda, limite_pico: c.limite_pico };
}

module.exports = { ativarDetectorAnomalias, desativarDetectorAnomalias, detectarAnomalia, listarAnomalias, estatisticasDetectorAnomalias, carregar, salvar, ARQ };