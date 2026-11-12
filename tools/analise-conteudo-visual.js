// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 ANÁLISE DE CONTEÚDO VISUAL — desempenho de conteúdos visuais
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-visual.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { conteudos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarConteudoVisual(titulo, rede, jogo, tipo, visualizacoes, engajamento, cliques, assetId) {
  const c = carregar();
  const id = 'cv_' + c.proximoId++;
  const cv = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', tipo: tipo || 'imagem', visualizacoes: Number(visualizacoes) || 0, engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, assetId: assetId || '', ativo: true, criadoEm: new Date().toISOString() };
  c.conteudos.push(cv);
  salvar();
  return { ok: true, conteudo: cv };
}

function listarConteudosVisuais(jogo = null, rede = null, tipo = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasConteudoVisual() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalVisualizacoes = c.conteudos.reduce((s, c) => s + c.visualizacoes, 0);
  const totalEngajamento = c.conteudos.reduce((s, c) => s + c.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, ativos: c.conteudos.filter(x => x.ativo).length };
}

module.exports = { registrarConteudoVisual, listarConteudosVisuais, estatisticasConteudoVisual, carregar, salvar, ARQ };