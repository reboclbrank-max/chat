// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎫 RELATÓRIO DE CONTEÚDO POR CUPOM INDICAÇÃO — conteúdo por cupom de indicação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-cupom-indicacao.json');

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

function gerarRelatorioConteudoPorCupomIndicacao(codigo, jogo, usos, indicados, receita) {
  const c = carregar();
  const id = 'rcpi_' + c.proximoId++;
  const r = { id, codigo: codigo || '', jogo: jogo || 'ambos', usos: Number(usos) || 0, indicados: Number(indicados) || 0, receita: Number(receita) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCupomIndicacao(jogo = null, codigo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (codigo) l = l.filter(x => x.codigo === codigo);
  return l.sort((a, b) => b.usos - a.usos);
}

function marcarConteudoPorCupomIndicacaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCupomIndicacao() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalUsos = c.relatorios.reduce((s, r) => s + r.usos, 0);
  return { total, totalUsos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCupomIndicacao, listarRelatoriosConteudoPorCupomIndicacao, marcarConteudoPorCupomIndicacaoEnviado, estatisticasConteudoPorCupomIndicacao, carregar, salvar, ARQ };