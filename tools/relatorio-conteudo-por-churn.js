// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📉 RELATÓRIO DE CONTEÚDO POR CHURN — conteúdo por nível de churn
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-churn.json');

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

function gerarRelatorioConteudoPorChurn(nivelChurn, jogo, quantidade, taxaChurn, clientesPerdidos, totalClientes) {
  const c = carregar();
  const id = 'rch_' + c.proximoId++;
  const r = { id, nivelChurn: nivelChurn || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, taxaChurn: Number(taxaChurn) || 0, clientesPerdidos: Number(clientesPerdidos) || 0, totalClientes: Number(totalClientes) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorChurn(jogo = null, nivelChurn = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelChurn) l = l.filter(x => x.nivelChurn === nivelChurn);
  return l.sort((a, b) => b.taxaChurn - a.taxaChurn);
}

function marcarConteudoPorChurnEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorChurn() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalClientesPerdidos = c.relatorios.reduce((s, r) => s + r.clientesPerdidos, 0);
  return { total, totalClientesPerdidos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorChurn, listarRelatoriosConteudoPorChurn, marcarConteudoPorChurnEnviado, estatisticasConteudoPorChurn, carregar, salvar, ARQ };