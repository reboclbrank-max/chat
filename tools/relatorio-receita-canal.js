// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 RELATÓRIO DE RECEITA POR CANAL — receita detalhada por canal
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-receita-canal.json');

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

function gerarRelatorioReceitaCanal(canal, jogo, periodo, receita, transacoes, ticketMedio) {
  const c = carregar();
  const id = 'rrc_' + c.proximoId++;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', periodo: periodo || '', receita: Number(receita) || 0, transacoes: Number(transacoes) || 0, ticketMedio: Number(ticketMedio) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosReceitaCanal(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => b.receita - a.receita);
}

function marcarReceitaCanalEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasReceitaCanal() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receita, 0);
  return { total, totalReceita, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioReceitaCanal, listarRelatoriosReceitaCanal, marcarReceitaCanalEnviado, estatisticasReceitaCanal, carregar, salvar, ARQ };