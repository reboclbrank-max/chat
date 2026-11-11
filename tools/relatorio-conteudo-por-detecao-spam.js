// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ RELATÓRIO DE CONTEÚDO POR DETECÇÃO SPAM — conteúdo por detecção de spam
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-detecao-spam.json');

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

function gerarRelatorioConteudoPorDetecaoSpam(tipo, jogo, quantidade, bloqueados, permitidos) {
  const c = carregar();
  const id = 'rdsp_' + c.proximoId++;
  const r = { id, tipo: tipo || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, bloqueados: Number(bloqueados) || 0, permitidos: Number(permitidos) || 0, taxaBloqueio: Number(quantidade) > 0 ? ((Number(bloqueados) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorDetecaoSpam(jogo = null, tipo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.bloqueados - a.bloqueados);
}

function marcarConteudoPorDetecaoSpamEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorDetecaoSpam() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalBloqueados = c.relatorios.reduce((s, r) => s + r.bloqueados, 0);
  return { total, totalBloqueados, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorDetecaoSpam, listarRelatoriosConteudoPorDetecaoSpam, marcarConteudoPorDetecaoSpamEnviado, estatisticasConteudoPorDetecaoSpam, carregar, salvar, ARQ };