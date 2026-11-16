// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌲 ANÁLISE DE CONTEÚDO EVERGREEN — desempenho de conteúdos atemporais
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-evergreen.json');

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

function registrarConteudoEvergreen(titulo, jogo, rede, formato, visualizacoes, engajamento, dataPublicacao) {
  const c = carregar();
  const id = 'eve_' + c.proximoId++;
  const ev = { id, titulo: titulo || '', jogo: jogo || 'ambos', rede: rede || 'todos', formato: formato || 'post', visualizacoes: Number(visualizacoes) || 0, engajamento: Number(engajamento) || 0, dataPublicacao: dataPublicacao || new Date().toISOString(), ativo: true, criadoEm: new Date().toISOString() };
  c.conteudos.push(ev);
  salvar();
  return { ok: true, conteudo: ev };
}

function listarConteudosEvergreen(jogo = null, rede = null, ativo = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function estatisticasConteudoEvergreen() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalVisualizacoes = c.conteudos.reduce((s, c) => s + c.visualizacoes, 0);
  const totalEngajamento = c.conteudos.reduce((s, c) => s + c.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, ativos: c.conteudos.filter(x => x.ativo).length };
}

module.exports = { registrarConteudoEvergreen, listarConteudosEvergreen, estatisticasConteudoEvergreen, carregar, salvar, ARQ };