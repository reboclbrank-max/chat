// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎠 ANÁLISE DE CONTEÚDO DE CARROSSEL — desempenho de carrosséis
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-carrossel.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { carrosseis: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarCarrossel(titulo, rede, jogo, visualizacoes, engajamento, cliques, conversoes, slides) {
  const c = carregar();
  const id = 'car_' + c.proximoId++;
  const car = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', visualizacoes: Number(visualizacoes) || 0, engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, slides: Number(slides) || 0, ativo: true, criadoEm: new Date().toISOString() };
  c.carrosseis.push(car);
  salvar();
  return { ok: true, carrossel: car };
}

function listarCarrosseis(jogo = null, rede = null) {
  const c = carregar();
  let l = c.carrosseis;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasConteudoCarrossel() {
  const c = carregar();
  const total = c.carrosseis.length;
  const totalVisualizacoes = c.carrosseis.reduce((s, c) => s + c.visualizacoes, 0);
  const totalEngajamento = c.carrosseis.reduce((s, c) => s + c.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, ativos: c.carrosseis.filter(x => x.ativo).length };
}

module.exports = { registrarCarrossel, listarCarrosseis, estatisticasConteudoCarrossel, carregar, salvar, ARQ };