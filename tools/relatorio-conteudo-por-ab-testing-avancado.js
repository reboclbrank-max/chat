// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧪 RELATÓRIO DE CONTEÚDO POR A/B TESTING AVANÇADO — conteúdo por A/B testing
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-ab-testing-avancado.json');

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

function gerarRelatorioConteudoPorABTestingAvancado(testeId, jogo, varianteVencedora, impressoesA, impressoesB, cliquesA, cliquesB, conversoesA, conversoesB) {
  const c = carregar();
  const id = 'raba_' + c.proximoId++;
  const r = { id, testeId: testeId || '', jogo: jogo || 'ambos', varianteVencedora: varianteVencedora || '', impressoesA: Number(impressoesA) || 0, impressoesB: Number(impressoesB) || 0, cliquesA: Number(cliquesA) || 0, cliquesB: Number(cliquesB) || 0, conversoesA: Number(conversoesA) || 0, conversoesB: Number(conversoesB) || 0, ctrA: Number(impressoesA) > 0 ? ((Number(cliquesA) / Number(impressoesA)) * 100).toFixed(2) : 0, ctrB: Number(impressoesB) > 0 ? ((Number(cliquesB) / Number(impressoesB)) * 100).toFixed(2) : 0, taxaConversaoA: Number(cliquesA) > 0 ? ((Number(conversoesA) / Number(cliquesA)) * 100).toFixed(2) : 0, taxaConversaoB: Number(cliquesB) > 0 ? ((Number(conversoesB) / Number(cliquesB)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorABTestingAvancado(jogo = null, testeId = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (testeId) l = l.filter(x => x.testeId === testeId);
  return l.sort((a, b) => parseFloat(b.taxaConversaoB) - parseFloat(a.taxaConversaoB));
}

function marcarConteudoPorABTestingAvancadoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorABTestingAvancado() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalCliques = c.relatorios.reduce((s, r) => s + r.cliquesA + r.cliquesB, 0);
  return { total, totalCliques, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorABTestingAvancado, listarRelatoriosConteudoPorABTestingAvancado, marcarConteudoPorABTestingAvancadoEnviado, estatisticasConteudoPorABTestingAvancado, carregar, salvar, ARQ };