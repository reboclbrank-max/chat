// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 AUTO-ESCALADA MARKETING — escala automaticamente a frequência de execução
// baseado em carga e desempenho de cada camada. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'auto-escalada-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, escalas: [], limites: { min: 5, max: 1440 }, proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarAutoEscalada(camada, intervaloMinutos, jogo) {
  const c = carregar();
  const id = 'aem_' + c.proximoId++;
  c.ativo = true;
  const esc = { id, camada, intervaloMinutos: Math.max(c.limites.min, Math.min(c.limites.max, Number(intervaloMinutos) || 60)), jogo: jogo || 'ambos', ativo: true, criadoEm: new Date().toISOString(), ajustes: 0 };
  c.escalas.push(esc);
  salvar();
  return { ok: true, escala: esc };
}

function desativarAutoEscalada() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function ajustarEscala(camada, novoIntervalo, jogo) {
  const c = carregar();
  const esc = c.escalas.find(x => x.camada === camada && (x.jogo === jogo || x.jogo === 'ambos'));
  if (!esc) return { ok: false, erro: 'Escala não encontrada' };
  esc.intervaloMinutos = Math.max(c.limites.min, Math.min(c.limites.max, Number(novoIntervalo) || esc.intervaloMinutos));
  esc.ajustes++;
  salvar();
  return { ok: true, escala: esc };
}

function listarEscalas(jogo = null) {
  const c = carregar();
  let l = c.escalas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => a.intervaloMinutos - b.intervaloMinutos);
}

function estatisticasAutoEscalada() {
  const c = carregar();
  return { ativo: c.ativo, total_escalas: c.escalas.length, total_ajustes: c.escalas.reduce((s, x) => s + x.ajustes, 0), limites: c.limites };
}

module.exports = { ativarAutoEscalada, desativarAutoEscalada, ajustarEscala, listarEscalas, estatisticasAutoEscalada, carregar, salvar, ARQ };