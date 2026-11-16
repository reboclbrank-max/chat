// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💡 RECOMENDAÇÃO DE CONTEÚDO — baseado em desempenho histórico
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'recomendacoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { conteudos: [], recomendacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarConteudo(texto, formato, rede, jogo, engajamento, cliques, downloads) {
  const c = carregar();
  const id = 'cont_' + c.proximoId++;
  const con = { id, texto, formato: formato || 'texto', rede: rede || 'todos', jogo: jogo || 'ambos', engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, downloads: Number(downloads) || 0, criadoEm: new Date().toISOString() };
  c.conteudos.push(con);
  salvar();
  return { ok: true, conteudo: con };
}

function gerarRecomendacoes(rede = null, jogo = null) {
  const c = carregar();
  let lista = c.conteudos;
  if (rede) lista = lista.filter(con => con.rede === rede || con.rede === 'todos');
  if (jogo) lista = lista.filter(con => con.jogo === jogo || con.jogo === 'ambos');
  const ordenados = lista.sort((a, b) => b.engajamento - a.engajamento);
  const top = ordenados.slice(0, 5);
  const recs = top.map(con => ({ id: con.id, texto: con.texto.slice(0, 60), formato: con.formato, engajamento: con.engajamento, motivo: 'alto desempenho histórico' }));
  return { ok: true, recomendacoes: recs };
}

function listarConteudos(rede = null, jogo = null, limite = 20) {
  const c = carregar();
  let lista = c.conteudos;
  if (rede) lista = lista.filter(con => con.rede === rede || con.rede === 'todos');
  if (jogo) lista = lista.filter(con => con.jogo === jogo || con.jogo === 'ambos');
  return lista.sort((a, b) => b.engajamento - a.engajamento).slice(0, limite);
}

function estatisticasConteudos() {
  const c = carregar();
  const total = c.conteudos.length;
  const medioEngajamento = total > 0 ? (c.conteudos.reduce((s, c) => s + c.engajamento, 0) / total).toFixed(2) : 0;
  const totalCliques = c.conteudos.reduce((s, c) => s + c.cliques, 0);
  const totalDownloads = c.conteudos.reduce((s, c) => s + c.downloads, 0);
  return { total, medioEngajamento, totalCliques, totalDownloads };
}

module.exports = { registrarConteudo, gerarRecomendacoes, listarConteudos, estatisticasConteudos, carregar, salvar, ARQ };