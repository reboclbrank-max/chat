// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📆 RELATÓRIO DE CONTEÚDO POR CALENDÁRIO LANÇAMENTOS — conteúdo por calendário de lançamentos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-calendario-lancamentos.json');

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

function gerarRelatorioConteudoPorCalendarioLancamentos(lancamento, jogo, data, status, produtos) {
  const c = carregar();
  const id = 'rclan_' + c.proximoId++;
  const r = { id, lancamento: lancamento || '', jogo: jogo || 'ambos', data: data || '', status: status || '', produtos: Number(produtos) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCalendarioLancamentos(jogo = null, status = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.data) - new Date(a.data));
}

function marcarConteudoPorCalendarioLancamentosEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCalendarioLancamentos() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalProdutos = c.relatorios.reduce((s, r) => s + r.produtos, 0);
  return { total, totalProdutos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCalendarioLancamentos, listarRelatoriosConteudoPorCalendarioLancamentos, marcarConteudoPorCalendarioLancamentosEnviado, estatisticasConteudoPorCalendarioLancamentos, carregar, salvar, ARQ };