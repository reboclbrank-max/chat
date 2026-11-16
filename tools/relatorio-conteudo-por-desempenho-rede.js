// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📶 RELATÓRIO DE CONTEÚDO POR DESEMPENHO REDE — conteúdo por desempenho de rede
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-desempenho-rede.json');

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

function gerarRelatorioConteudoPorDesempenhoRede(rede, jogo, seguidores, engajamento, alcancado) {
  const c = carregar();
  const id = 'rdes_' + c.proximoId++;
  const r = { id, rede: rede || '', jogo: jogo || 'ambos', seguidores: Number(seguidores) || 0, engajamento: Number(engajamento) || 0, alcancado: Number(alcancado) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorDesempenhoRede(jogo = null, rede = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede);
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function marcarConteudoPorDesempenhoRedeEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorDesempenhoRede() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalSeguidores = c.relatorios.reduce((s, r) => s + r.seguidores, 0);
  return { total, totalSeguidores, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorDesempenhoRede, listarRelatoriosConteudoPorDesempenhoRede, marcarConteudoPorDesempenhoRedeEnviado, estatisticasConteudoPorDesempenhoRede, carregar, salvar, ARQ };