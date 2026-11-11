// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧪 A/B TESTING AVANÇADO — testes de variantes com vencedor automático
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'ab-testing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { testes: [], variantes: [], resultados: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarTeste(nome, descricao, jogo, metricaVencedor) {
  const c = carregar();
  const id = 'ab_' + c.proximoId++;
  const t = { id, nome, descricao: descricao || '', jogo: jogo || 'ambos', metricaVencedor: metricaVencedor || 'cliques', status: 'ativo', criadoEm: new Date().toISOString(), vencedor: null };
  c.testes.push(t);
  salvar();
  return { ok: true, teste: t };
}

function adicionarVariante(testeId, nome, conteudo, rede) {
  const c = carregar();
  const id = 'var_' + c.proximoId++;
  const v = { id, testeId, nome: nome || '', conteudo: conteudo || '', rede: rede || 'todos', cliques: 0, conversoes: 0, impressoes: 0, criadoEm: new Date().toISOString() };
  c.variantes.push(v);
  salvar();
  return { ok: true, variante: v };
}

function registrarResultadoVariante(varianteId, cliques, conversoes, impressoes) {
  const c = carregar();
  const v = c.variantes.find(x => x.id === varianteId);
  if (!v) return { ok: false, erro: 'Variante não encontrada' };
  v.cliques = Number(cliques) || 0;
  v.conversoes = Number(conversoes) || 0;
  v.impressoes = Number(impressoes) || 0;
  salvar();
  return { ok: true, variante: v };
}

function declararVencedor(testeId) {
  const c = carregar();
  const t = c.testes.find(x => x.id === testeId);
  if (!t) return { ok: false, erro: 'Teste não encontrado' };
  const variantes = c.variantes.filter(v => v.testeId === testeId);
  if (!variantes.length) return { ok: false, erro: 'Sem variantes' };
  const vencedor = variantes.reduce((a, b) => {
    const scoreA = (a.cliques || 0) + (a.conversoes || 0) * 10;
    const scoreB = (b.cliques || 0) + (b.conversoes || 0) * 10;
    return scoreB > scoreA ? b : a;
  });
  t.vencedor = vencedor.id;
  t.status = 'concluido';
  salvar();
  return { ok: true, vencedor: vencedor, teste: t };
}

function listarTestes(jogo = null) {
  const c = carregar();
  if (jogo) return c.testes.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return c.testes;
}

function estatisticasAB() {
  const c = carregar();
  const total = c.testes.length;
  const concluidos = c.testes.filter(x => x.status === 'concluido').length;
  const ativos = c.testes.filter(x => x.status === 'ativo').length;
  return { total, concluidos, ativos };
}

module.exports = { criarTeste, adicionarVariante, registrarResultadoVariante, declararVencedor, listarTestes, estatisticasAB, carregar, salvar, ARQ };