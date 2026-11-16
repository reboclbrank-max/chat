// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💲 RELATÓRIO DE CONTEÚDO POR ANÁLISE CONCORRÊNCIA PREÇO — conteúdo por análise de concorrência preço
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-analise-concorrencia-preco.json');

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

function gerarRelatorioConteudoPorAnaliseConcorrenciaPreco(produto, concorrente, jogo, precoNosso, precoConcorrente, diferenca) {
  const c = carregar();
  const id = 'rpcp_' + c.proximoId++;
  const r = { id, produto: produto || '', concorrente: concorrente || '', jogo: jogo || 'ambos', precoNosso: Number(precoNosso) || 0, precoConcorrente: Number(precoConcorrente) || 0, diferenca: Number(diferenca) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorAnaliseConcorrenciaPreco(jogo = null, produto = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (produto) l = l.filter(x => x.produto === produto);
  return l.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
}

function marcarConteudoPorAnaliseConcorrenciaPrecoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorAnaliseConcorrenciaPreco() {
  const c = carregar();
  const total = c.relatorios.length;
  const maisBarato = c.relatorios.filter(x => x.diferenca < 0).length;
  return { total, maisBarato, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorAnaliseConcorrenciaPreco, listarRelatoriosConteudoPorAnaliseConcorrenciaPreco, marcarConteudoPorAnaliseConcorrenciaPrecoEnviado, estatisticasConteudoPorAnaliseConcorrenciaPreco, carregar, salvar, ARQ };