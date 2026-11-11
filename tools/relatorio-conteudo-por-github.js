// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🐙 RELATÓRIO DE CONTEÚDO POR GITHUB — conteúdo por issue do GitHub
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-github.json');

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

function gerarRelatorioConteudoPorGitHub(issueId, jogo, titulo, estado, labels, comentarios) {
  const c = carregar();
  const id = 'rgth_' + c.proximoId++;
  const r = { id, issueId: issueId || '', jogo: jogo || 'ambos', titulo: titulo || '', estado: estado || 'aberto', labels: labels || [], comentarios: Number(comentarios) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorGitHub(jogo = null, estado = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (estado) l = l.filter(x => x.estado === estado);
  return l.sort((a, b) => b.comentarios - a.comentarios);
}

function marcarConteudoPorGitHubEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorGitHub() {
  const c = carregar();
  const total = c.relatorios.length;
  const abertos = c.relatorios.filter(x => x.estado === 'aberto').length;
  return { total, abertos, fechados: total - abertos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorGitHub, listarRelatoriosConteudoPorGitHub, marcarConteudoPorGitHubEnviado, estatisticasConteudoPorGitHub, carregar, salvar, ARQ };