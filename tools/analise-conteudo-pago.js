// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 ANÁLISE DE CONTEÚDO PAGO — desempenho de conteúdo patrocinado
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-pago.json');

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

function registrarConteudoPago(titulo, rede, jogo, investimento, visualizacoes, cliques, conversoes, data) {
  const c = carregar();
  const id = 'cp_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const cp = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', investimento: inv, visualizacoes: Number(visualizacoes) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, data: data || new Date().toISOString(), custoPorClique: inv > 0 ? (inv / Math.max(Number(cliques) || 1, 1)).toFixed(2) : 0, custoPorConversao: inv > 0 ? (inv / Math.max(Number(conversoes) || 1, 1)).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.conteudos.push(cp);
  salvar();
  return { ok: true, conteudo: cp };
}

function listarConteudosPagos(jogo = null, rede = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function estatisticasConteudoPago() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalInvestido = c.conteudos.reduce((s, c) => s + c.investimento, 0);
  const totalVisualizacoes = c.conteudos.reduce((s, c) => s + c.visualizacoes, 0);
  return { total, totalInvestido, totalVisualizacoes, ativos: c.conteudos.filter(x => x.ativo).length };
}

module.exports = { registrarConteudoPago, listarConteudosPagos, estatisticasConteudoPago, carregar, salvar, ARQ };