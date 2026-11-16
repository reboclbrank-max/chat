// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️ ALERTAS DE ENGAJAMENTO — notifica quando métricas caem abaixo do esperado
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'alertas-engajamento.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { alertas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarAlerta(metrica, valorAtual, valorEsperado, severidade, jogo, rede) {
  const c = carregar();
  const id = 'ale_' + c.proximoId++;
  const a = { id, metrica: metrica || '', valorAtual: Number(valorAtual) || 0, valorEsperado: Number(valorEsperado) || 0, severidade: severidade || 'media', jogo: jogo || 'ambos', rede: rede || 'todos', resolvido: false, criadoEm: new Date().toISOString() };
  c.alertas.push(a);
  salvar();
  return { ok: true, alerta: a };
}

function listarAlertas(resolvido = null, jogo = null, severidade = null) {
  const c = carregar();
  let l = c.alertas;
  if (resolvido !== null) l = l.filter(x => x.resolvido === resolvido);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (severidade) l = l.filter(x => x.severidade === severidade);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function resolverAlerta(id) {
  const c = carregar();
  const a = c.alertas.find(x => x.id === id);
  if (!a) return { ok: false, erro: 'Alerta não encontrado' };
  a.resolvido = true;
  salvar();
  return { ok: true, alerta: a };
}

function estatisticasAlertas() {
  const c = carregar();
  const total = c.alertas.length;
  const resolvidos = c.alertas.filter(x => x.resolvido).length;
  return { total, resolvidos, pendentes: total - resolvidos };
}

module.exports = { criarAlerta, listarAlertas, resolverAlerta, estatisticasAlertas, carregar, salvar, ARQ };