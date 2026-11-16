// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RELATÓRIO DE CONTEÚDO POR CICLO VIDA CLIENTE — conteúdo por ciclo de vida do cliente
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-ciclo-vida-cliente.json');

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

function gerarRelatorioConteudoPorCicloVidaCliente(etapa, jogo, quantidade, transicoes, tempoMedio) {
  const c = carregar();
  const id = 'rcvc_' + c.proximoId++;
  const r = { id, etapa: etapa || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, transicoes: Number(transicoes) || 0, tempoMedio: Number(tempoMedio) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCicloVidaCliente(jogo = null, etapa = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (etapa) l = l.filter(x => x.etapa === etapa);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorCicloVidaClienteEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCicloVidaCliente() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalQtd = c.relatorios.reduce((s, r) => s + r.quantidade, 0);
  return { total, totalQuantidade: totalQtd, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCicloVidaCliente, listarRelatoriosConteudoPorCicloVidaCliente, marcarConteudoPorCicloVidaClienteEnviado, estatisticasConteudoPorCicloVidaCliente, carregar, salvar, ARQ };