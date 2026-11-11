// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 ANÁLISE DE CONCORRÊNCIA — marketing Prancheta + Ceifalume
// Monitora jogos similares, tags, preços, reviews e benchmarking.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'concorrencia.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try {
    if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
  } catch (e) {}
  cache = { concorrentes: [], comparativos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarConcorrente(nome, jogo, url, preco, tags, notas) {
  const c = carregar();
  const id = 'conc_' + c.proximoId++;
  const conc = { id, nome, jogo: jogo || 'ambos', url, preco, tags: tags || [], notas: notas || '', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  c.concorrentes.push(conc);
  salvar();
  return { ok: true, concorrente: conc };
}

function listarConcorrentes(jogo = null) {
  const c = carregar();
  if (jogo) return c.concorrentes.filter(conc => conc.jogo === jogo || conc.jogo === 'ambos');
  return c.concorrentes;
}

function adicionarComparativo(jogo, metrica, nossoValor, valorConcorrente, conclusao) {
  const c = carregar();
  const id = 'comp_' + c.proximoId++;
  const comp = { id, jogo, metrica, nossoValor, valorConcorrente, conclusao, criadoEm: new Date().toISOString() };
  c.comparativos.push(comp);
  salvar();
  return { ok: true, comparativo: comp };
}

function estatisticasConcorrencia() {
  const c = carregar();
  return { totalConcorrentes: c.concorrentes.length, totalComparativos: c.comparativos.length };
}

module.exports = { registrarConcorrente, listarConcorrentes, adicionarComparativo, estatisticasConcorrencia, carregar, salvar, ARQ };