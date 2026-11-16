// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📢 RELATÓRIO DE CONTEÚDO POR MONITORAMENTO MENÇÕES — conteúdo por monitoramento de menções
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-monitoramento-mencoes.json');

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

function gerarRelatorioConteudoPorMonitoramentoMencoes(fonte, jogo, quantidade, sentimento, alcancado) {
  const c = carregar();
  const id = 'rmn_' + c.proximoId++;
  const r = { id, fonte: fonte || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, sentimento: sentimento || 'neutro', alcancado: Number(alcancado) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorMonitoramentoMencoes(jogo = null, fonte = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (fonte) l = l.filter(x => x.fonte === fonte);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorMonitoramentoMencoesEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorMonitoramentoMencoes() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalMencoes = c.relatorios.reduce((s, r) => s + r.quantidade, 0);
  return { total, totalMencoes, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorMonitoramentoMencoes, listarRelatoriosConteudoPorMonitoramentoMencoes, marcarConteudoPorMonitoramentoMencoesEnviado, estatisticasConteudoPorMonitoramentoMencoes, carregar, salvar, ARQ };