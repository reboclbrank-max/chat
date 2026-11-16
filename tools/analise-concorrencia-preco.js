// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💵 ANÁLISE DE CONCORRÊNCIA POR PREÇO — comparação de preços e ofertas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'concorrencia-preco.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { produtos: [], comparativos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarProdutoConcorrente(nome, concorrente, preco, jogo, moeda, url) {
  const c = carregar();
  const id = 'prc_' + c.proximoId++;
  const p = { id, nome: nome || '', concorrente: concorrente || '', preco: Number(preco) || 0, jogo: jogo || 'ambos', moeda: moeda || 'BRL', url: url || '', ativo: true, criadoEm: new Date().toISOString() };
  c.produtos.push(p);
  salvar();
  return { ok: true, produto: p };
}

function adicionarComparativoPreço(produtoId, nossoPreco, diferenca, vencedor) {
  const c = carregar();
  const prod = c.produtos.find(x => x.id === produtoId);
  if (!prod) return { ok: false, erro: 'Produto não encontrado' };
  const id = 'cmp_' + c.proximoId++;
  const comp = { id, produtoId, nossoPreco: Number(nossoPreco) || 0, precoConcorrente: prod.preco, diferenca: Number(diferenca) || 0, vencedor: vencedor || 'empate', jogo: prod.jogo, criadoEm: new Date().toISOString() };
  c.comparativos.push(comp);
  salvar();
  return { ok: true, comparativo: comp };
}

function listarProdutosConcorrentes(jogo = null, concorrente = null) {
  const c = carregar();
  let l = c.produtos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (concorrente) l = l.filter(x => x.concorrente === concorrente);
  return l.sort((a, b) => a.preco - b.preco);
}

function estatisticasConcorrenciaPreco() {
  const c = carregar();
  const total = c.produtos.length;
  const totalComparativos = c.comparativos.length;
  return { total, totalComparativos, ativos: c.produtos.filter(x => x.ativo).length };
}

module.exports = { cadastrarProdutoConcorrente, adicionarComparativoPreço, listarProdutosConcorrentes, estatisticasConcorrenciaPreco, carregar, salvar, ARQ };