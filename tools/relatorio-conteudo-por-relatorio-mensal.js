// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 RELATÓRIO DE CONTEÚDO POR RELATÓRIO MENSAL — conteúdo por relatório mensal
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-relatorio-mensal.json');

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

function gerarRelatorioConteudoPorRelatorioMensal(mes, jogo, poste, engajamento, conversoes, receita) {
  const c = carregar();
  const id = 'rmns_' + c.proximoId++;
  const r = { id, mes: mes || '', jogo: jogo || 'ambos', poste: Number(poste) || 0, engajamento: Number(engajamento) || 0, conversoes: Number(conversoes) || 0, receita: Number(receita) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorRelatorioMensal(jogo = null, mes = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (mes) l = l.filter(x => x.mes === mes);
  return l.sort((a, b) => b.mes.localeCompare(a.mes));
}

function marcarConteudoPorRelatorioMensalEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorRelatorioMensal() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receita, 0);
  return { total, totalReceita, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorRelatorioMensal, listarRelatoriosConteudoPorRelatorioMensal, marcarConteudoPorRelatorioMensalEnviado, estatisticasConteudoPorRelatorioMensal, carregar, salvar, ARQ };