// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤝 GERENCIAMENTO DE PARCERIAS — controle de parcerias de marketing
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'parcerias.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { parcerias: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarParceria(nome, parceiro, tipo, jogo, valor, status) {
  const c = carregar();
  const id = 'parc_' + c.proximoId++;
  const p = { id, nome: nome || '', parceiro: parceiro || '', tipo: tipo || 'marketing', jogo: jogo || 'ambos', valor: Number(valor) || 0, status: status || 'ativa', criadoEm: new Date().toISOString(), resultados: 0 };
  c.parcerias.push(p);
  salvar();
  return { ok: true, parceria: p };
}

function adicionarResultadoParceria(id, resultado, jogo) {
  const c = carregar();
  const p = c.parcerias.find(x => x.id === id);
  if (!p) return { ok: false, erro: 'Parceria não encontrada' };
  p.resultados++;
  salvar();
  return { ok: true, parceria: p };
}

function listarParcerias(jogo = null, status = null) {
  const c = carregar();
  let l = c.parcerias;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => b.resultados - a.resultados);
}

function estatisticasParcerias() {
  const c = carregar();
  const total = c.parcerias.length;
  const ativas = c.parcerias.filter(x => x.status === 'ativa').length;
  const totalValor = c.parcerias.reduce((s, p) => s + (p.valor || 0), 0);
  return { total, ativas, totalValor, totalResultados: c.parcerias.reduce((s, p) => s + p.resultados, 0) };
}

module.exports = { criarParceria, adicionarResultadoParceria, listarParcerias, estatisticasParcerias, carregar, salvar, ARQ };