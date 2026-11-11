// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 ANÁLISE DE DESEMPENHO POR REDE — métricas por rede social
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'desempenho-rede.json');

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

function registrarDesempenhoRede(rede, jogo, impressoes, alcance, engajamento, cliques, conversoes, periodo) {
  const c = carregar();
  const id = 'dr_' + c.proximoId++;
  const d = { id, rede: rede || 'todos', jogo: jogo || 'ambos', impressoes: Number(impressoes) || 0, alcance: Number(alcance) || 0, engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, periodo: periodo || '', taxaEngajamento: Number(impressoes) > 0 ? ((Number(engajamento) / Number(impressoes)) * 100).toFixed(2) : 0, criadoEm: new Date().toISOString() };
  c.desenhos.push(d);
  salvar();
  return { ok: true, desempenho: d };
}

function listarDesempenhoRede(jogo = null, rede = null) {
  const c = carregar();
  let l = c.desenhos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasDesempenhoRede() {
  const c = carregar();
  const total = c.desenhos.length;
  const totalEngajamento = c.desenhos.reduce((s, d) => s + d.engajamento, 0);
  const totalCliques = c.desenhos.reduce((s, d) => s + d.cliques, 0);
  return { total, totalEngajamento, totalCliques, mediaTaxaEngajamento: total > 0 ? (c.desenhos.reduce((s, d) => s + parseFloat(d.taxaEngajamento), 0) / total).toFixed(2) : 0 };
}

module.exports = { registrarDesempenhoRede, listarDesempenhoRede, estatisticasDesempenhoRede, carregar, salvar, ARQ };