// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🐦 ANÁLISE DE CONTEÚDO DO X — desempenho de conteúdos no X (Twitter)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-x.json');

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

function registrarConteudoX(titulo, jogo, curtidas, retweets, respostas, impressoes) {
  const c = carregar();
  const id = 'x_' + c.proximoId++;
  const eng = Number(curtidas) + Number(retweets) + Number(respostas);
  const x = { id, titulo: titulo || '', jogo: jogo || 'ambos', curtidas: Number(curtidas) || 0, retweets: Number(retweets) || 0, respostas: Number(respostas) || 0, impressoes: Number(impressoes) || 0, engajamento: eng, taxaEngajamento: Number(impressoes) > 0 ? ((eng / Number(impressoes)) * 100).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.conteudos.push(x);
  salvar();
  return { ok: true, conteudo: x };
}

function listarConteudosX(jogo = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasConteudoX() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalEngajamento = c.conteudos.reduce((s, c) => s + c.engajamento, 0);
  return { total, totalEngajamento, ativos: c.conteudos.filter(x => x.ativo).length };
}

module.exports = { registrarConteudoX, listarConteudosX, estatisticasConteudoX, carregar, salvar, ARQ };