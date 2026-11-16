// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 SISTEMA DE INDICAÇÃO / REFERRAL — rastreamento de convidados
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'indicacoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { indicacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarIndicacao(indicator, indicado, jogo, codigo, recompensa) {
  const c = carregar();
  const id = 'ind_' + c.proximoId++;
  const ind = { id, indicator, indicado, jogo: jogo || 'ambos', codigo: codigo || '', recompensa: recompensa || '', status: 'pendente', criadoEm: new Date().toISOString(), convertidoEm: null };
  c.indicacoes.push(ind);
  salvar();
  return { ok: true, indicacao: ind };
}

function converterIndicacao(id) {
  const c = carregar();
  const ind = c.indicacoes.find(i => i.id === id);
  if (!ind) return { ok: false, erro: 'Indicação não encontrada' };
  ind.status = 'convertido';
  ind.convertidoEm = new Date().toISOString();
  salvar();
  return { ok: true, indicacao: ind };
}

function listarIndicacoes(jogo = null, status = null) {
  const c = carregar();
  let lista = c.indicacoes;
  if (jogo) lista = lista.filter(i => i.jogo === jogo || i.jogo === 'ambos');
  if (status) lista = lista.filter(i => i.status === status);
  return lista;
}

function estatisticasIndicacoes() {
  const c = carregar();
  const total = c.indicacoes.length;
  const convertidos = c.indicacoes.filter(i => i.status === 'convertido').length;
  const pendentes = total - convertidos;
  return { total, convertidos, pendentes, taxaConversao: total > 0 ? ((convertidos / total) * 100).toFixed(2) : 0 };
}

module.exports = { registrarIndicacao, converterIndicacao, listarIndicacoes, estatisticasIndicacoes, carregar, salvar, ARQ };