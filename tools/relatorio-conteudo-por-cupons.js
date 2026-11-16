// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎟️ RELATÓRIO DE CONTEÚDO POR CUPONS — conteúdo por cupons
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-cupons.json');

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

function gerarRelatorioConteudoPorCupons(codigo, jogo, usos, descontoTotal, receitaGerada) {
  const c = carregar();
  const id = 'rcup_' + c.proximoId++;
  const r = { id, codigo: codigo || '', jogo: jogo || 'ambos', usos: Number(usos) || 0, descontoTotal: Number(descontoTotal) || 0, receitaGerada: Number(receitaGerada) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCupons(jogo = null, codigo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (codigo) l = l.filter(x => x.codigo === codigo);
  return l.sort((a, b) => b.usos - a.usos);
}

function marcarConteudoPorCuponsEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCupons() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalUsos = c.relatorios.reduce((s, r) => s + r.usos, 0);
  return { total, totalUsos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCupons, listarRelatoriosConteudoPorCupons, marcarConteudoPorCuponsEnviado, estatisticasConteudoPorCupons, carregar, salvar, ARQ };