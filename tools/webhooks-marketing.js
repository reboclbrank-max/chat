// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🪝 WEBHOOKS DE MARKETING — gatilhos para integrações externas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'webhooks.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { webhooks: [], disparos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarWebhook(nome, url, evento, jogo) {
  const c = carregar();
  const id = 'wh_' + c.proximoId++;
  const w = { id, nome, url: url || '', evento: evento || '', jogo: jogo || 'ambos', ativo: true, disparos: 0, criadoEm: new Date().toISOString() };
  c.webhooks.push(w);
  salvar();
  return { ok: true, webhook: w };
}

function dispararWebhook(evento, dados, jogo) {
  const c = carregar();
  const alvos = c.webhooks.filter(w => w.evento === evento && w.ativo && (w.jogo === 'ambos' || w.jogo === jogo));
  const resultados = [];
  for (const w of alvos) {
    w.disparos++;
    resultados.push({ webhookId: w.id, url: w.url, evento, disparadoEm: new Date().toISOString() });
    c.disparos.push({ webhookId: w.id, evento, dados, jogo, criadoEm: new Date().toISOString() });
  }
  salvar();
  return { ok: true, disparos: resultados.length, resultados };
}

function listarWebhooks(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.webhooks;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l;
}

function estatisticasWebhooks() {
  const c = carregar();
  const total = c.webhooks.length;
  const totalDisparos = c.webhooks.reduce((s, w) => s + (w.disparos || 0), 0);
  return { total, totalDisparos, totalRegistros: c.disparos.length };
}

module.exports = { cadastrarWebhook, dispararWebhook, listarWebhooks, estatisticasWebhooks, carregar, salvar, ARQ };