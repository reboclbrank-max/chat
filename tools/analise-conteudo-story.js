// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📱 ANÁLISE DE CONTEÚDO DE STORY — desempenho de stories
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-story.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { stories: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarStory(titulo, rede, jogo, visualizacoes, alcance, respostas, saidas, data) {
  const c = carregar();
  const id = 'st_' + c.proximoId++;
  const s = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', visualizacoes: Number(visualizacoes) || 0, alcance: Number(alcance) || 0, respostas: Number(respostas) || 0, saidas: Number(saidas) || 0, data: data || new Date().toISOString(), taxaResposta: Number(visualizacoes) > 0 ? ((Number(respostas) / Number(visualizacoes)) * 100).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.stories.push(s);
  salvar();
  return { ok: true, story: s };
}

function listarStories(jogo = null, rede = null) {
  const c = carregar();
  let l = c.stories;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function estatisticasConteudoStory() {
  const c = carregar();
  const total = c.stories.length;
  const totalVisualizacoes = c.stories.reduce((acc, item) => acc + item.visualizacoes, 0);
  const totalRespostas = c.stories.reduce((acc, item) => acc + item.respostas, 0);
  return { total, totalVisualizacoes, totalRespostas, ativos: c.stories.filter(x => x.ativo).length };
}

module.exports = { registrarStory, listarStories, estatisticasConteudoStory, carregar, salvar, ARQ };