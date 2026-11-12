// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎞️ ANÁLISE DE CONTEÚDO DE REEL — desempenho de reels
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-reel.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { reels: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarReel(titulo, rede, jogo, visualizacoes, alcance, curtidas, comentarios, compartilhamentos, salvamentos) {
  const c = carregar();
  const id = 'rl_' + c.proximoId++;
  const eng = Number(curtidas) + Number(comentarios) + Number(compartilhamentos) + Number(salvamentos);
  const rl = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', visualizacoes: Number(visualizacoes) || 0, alcance: Number(alcance) || 0, curtidas: Number(curtidas) || 0, comentarios: Number(comentarios) || 0, compartilhamentos: Number(compartilhamentos) || 0, salvamentos: Number(salvamentos) || 0, engajamento: eng, taxaEngajamento: Number(visualizacoes) > 0 ? ((eng / Number(visualizacoes)) * 100).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.reels.push(rl);
  salvar();
  return { ok: true, reel: rl };
}

function listarReels(jogo = null, rede = null) {
  const c = carregar();
  let l = c.reels;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function estatisticasConteudoReel() {
  const c = carregar();
  const total = c.reels.length;
  const totalVisualizacoes = c.reels.reduce((s, r) => s + r.visualizacoes, 0);
  const totalEngajamento = c.reels.reduce((s, r) => s + r.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, ativos: c.reels.filter(x => x.ativo).length };
}

module.exports = { registrarReel, listarReels, estatisticasConteudoReel, carregar, salvar, ARQ };