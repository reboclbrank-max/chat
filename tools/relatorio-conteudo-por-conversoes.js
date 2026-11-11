// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RELATÓRIO DE CONTEÚDO POR CONVERSÕES — conteúdo por nível de conversões
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-conversoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { relatorios: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function gerarRelatorioConteudoPorConversoes(nivelConversoes, jogo, quantidade, totalConversoes, mediaConversoes) {
  const c = carregar();
  const id = 'rcv_' + c.proximoId++;
  const r = { id, nivelConversoes: nivelConversoes || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, totalConversoes: Number(totalConversoes) || 0, mediaConversoes: Number(mediaConversoes) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorConversoes(jogo = null, nivelConversoes = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelConversoes) l = l.filter(x => x.nivelConversoes === nivelConversoes);
  return l.sort((a, b) => b.totalConversoes - a.totalConversoes);
}

function marcarConteudoPorConversoesEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorConversoes() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalConversoes = c.relatorios.reduce((s, r) => s + r.totalConversoes, 0);
  return { total, totalConversoes, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorConversoes, listarRelatoriosConteudoPorConversoes, marcarConteudoPorConversoesEnviado, estatisticasConteudoPorConversoes, carregar, salvar, ARQ };