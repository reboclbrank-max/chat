// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕸️ RELATÓRIO DE CONTEÚDO POR INDICAÇÕES REDE — conteúdo por indicações de rede
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-indicacoes-rede.json');

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

function gerarRelatorioConteudoPorIndicacoesRede(origem, jogo, quantidade, conversoes, receita) {
  const c = carregar();
  const id = 'rind_' + c.proximoId++;
  const r = { id, origem: origem || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, conversoes: Number(conversoes) || 0, receita: Number(receita) || 0, taxaConversao: Number(quantidade) > 0 ? ((Number(conversoes) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorIndicacoesRede(jogo = null, origem = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (origem) l = l.filter(x => x.origem === origem);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorIndicacoesRedeEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorIndicacoesRede() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalIndicacoes = c.relatorios.reduce((s, r) => s + r.quantidade, 0);
  return { total, totalIndicacoes, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorIndicacoesRede, listarRelatoriosConteudoPorIndicacoesRede, marcarConteudoPorIndicacoesRedeEnviado, estatisticasConteudoPorIndicacoesRede, carregar, salvar, ARQ };