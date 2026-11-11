// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💵 ANÁLISE DE CONCORRÊNCIA POR PREÇO AVANÇADO — rastreamento de preços
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'concorrencia-preco-avancado.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { produtos: [], historicoPrecos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarProdutoAvancado(nome, concorrente, preco, moeda, jogo, categoria, url) {
  const c = carregar();
  const id = 'cpa_' + c.proximoId++;
  const p = { id, nome: nome || '', concorrente: concorrente || '', preco: Number(preco) || 0, moeda: moeda || 'BRL', jogo: jogo || 'ambos', categoria: categoria || '', url: url || '', ativo: true, criadoEm: new Date().toISOString() };
  c.produtos.push(p);
  salvar();
  return { ok: true, produto: p };
}

function adicionarHistoricoPreco(produtoId, preco, data) {
  const c = carregar();
  const prod = c.produtos.find(x => x.id === produtoId);
  if (!prod) return { ok: false, erro: 'Produto não encontrado' };
  const id = 'hp_' + c.proximoId++;
  const h = { id, produtoId, preco: Number(preco) || 0, data: data || new Date().toISOString(), jogo: prod.jogo };
  c.historicoPrecos.push(h);
  salvar();
  return { ok: true, historico: h };
}

function listarProdutosAvancados(jogo = null, categoria = null) {
  const c = carregar();
  let l = c.produtos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (categoria) l = l.filter(x => x.categoria === categoria);
  return l.sort((a, b) => a.preco - b.preco);
}

function estatisticasConcorrenciaPrecoAvancado() {
  const c = carregar();
  const total = c.produtos.length;
  const totalHistorico = c.historicoPrecos.length;
  return { total, totalHistorico, ativos: c.produtos.filter(x => x.ativo).length };
}

module.exports = { cadastrarProdutoAvancado, adicionarHistoricoPreco, listarProdutosAvancados, estatisticasConcorrenciaPrecoAvancado, carregar, salvar, ARQ };