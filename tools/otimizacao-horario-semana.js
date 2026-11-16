// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 OTIMIZAÇÃO DE HORÁRIO POR DIA DA SEMANA — melhor horário por rede e dia
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'horario-semana.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { desempenhos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarDesempenho(rede, diaSemana, hora, engajamento, jogo) {
  const c = carregar();
  const id = 'hor_' + c.proximoId++;
  const d = { id, rede: rede || 'todos', diaSemana, hora: Number(hora), engajamento: Number(engajamento), jogo: jogo || 'ambos', criadoEm: new Date().toISOString() };
  c.desempenhos.push(d);
  salvar();
  return { ok: true, desempenho: d };
}

function melhorHorarioPorDiaESemana(rede, jogo = null) {
  const c = carregar();
  let lista = c.desempenhos.filter(d => d.rede === rede);
  if (jogo) lista = lista.filter(d => d.jogo === jogo || d.jogo === 'ambos');
  const porDia = {};
  for (const d of lista) {
    if (!porDia[d.diaSemana]) porDia[d.diaSemana] = [];
    porDia[d.diaSemana].push(d);
  }
  const resultado = {};
  for (const [dia, itens] of Object.entries(porDia)) {
    const melhor = itens.reduce((a, b) => (b.engajamento > a.engajamento ? b : a));
    resultado[dia] = { hora: melhor.hora, engajamento: melhor.engajamento };
  }
  return resultado;
}

function listarDesempenhos(rede = null) {
  const c = carregar();
  if (rede) return c.desempenhos.filter(d => d.rede === rede);
  return c.desempenhos;
}

function estatisticasHorario() {
  const c = carregar();
  return { totalRegistros: c.desempenhos.length, redes: [...new Set(c.desempenhos.map(d => d.rede))] };
}

module.exports = { registrarDesempenho, melhorHorarioPorDiaESemana, listarDesempenhos, estatisticasHorario, carregar, salvar, ARQ };