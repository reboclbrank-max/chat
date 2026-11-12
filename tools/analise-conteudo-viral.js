// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🦠 ANÁLISE DE CONTEÚDO VIRAL — identifica conteúdos com alto potencial viral
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-viral.json');

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

function registrarConteudoViral(titulo, rede, jogo, visualizacoes, compartilhamentos, curtidas, comentarios) {
  const c = carregar();
  const id = 'vir_' + c.proximoId++;
  const engajamento = Number(compartilhamentos) + Number(curtidas) + Number(comentarios);
  const potencial = visualizacoes > 0 ? ((engajamento / visualizacoes) * 100).toFixed(2) : 0;
  const cont = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', visualizacoes: Number(visualizacoes) || 0, compartilhamentos: Number(compartilhamentos) || 0, curtidas: Number(curtidas) || 0, comentarios: Number(comentarios) || 0, engajamento, potencialViral: potencial, criadoEm: new Date().toISOString() };
  c.conteudos.push(cont);
  salvar();
  return { ok: true, conteudo: cont };
}

function listarConteudosVirais(jogo = null, rede = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.potencialViral - a.potencialViral);
}

function estatisticasConteudoViral() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalVisualizacoes = c.conteudos.reduce((s, c) => s + c.visualizacoes, 0);
  const totalEngajamento = c.conteudos.reduce((s, c) => s + c.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, mediaPotencial: total > 0 ? (totalEngajamento / total).toFixed(2) : 0 };
}

module.exports = { registrarConteudoViral, listarConteudosVirais, estatisticasConteudoViral, carregar, salvar, ARQ };