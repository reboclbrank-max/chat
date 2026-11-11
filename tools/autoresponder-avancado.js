// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 AUTORESPONDER AVANÇADO — respostas automáticas por tipo de pergunta
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'autoresponder.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { regras: [], respostas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarRegra(tipo, palavrasChave, resposta, jogo) {
  const c = carregar();
  const id = 'ar_' + c.proximoId++;
  const r = { id, tipo, palavrasChave: palavrasChave || [], resposta: resposta || '', jogo: jogo || 'ambos', ativa: true, criadoEm: new Date().toISOString(), usos: 0 };
  c.regras.push(r);
  salvar();
  return { ok: true, regra: r };
}

function processarPergunta(pergunta, jogo) {
  const c = carregar();
  const p = pergunta.toLowerCase();
  for (const r of c.regras) {
    if (!r.ativa) continue;
    if (r.jogo !== 'ambos' && r.jogo !== jogo) continue;
    for (const kw of r.palavrasChave) {
      if (p.includes(kw.toLowerCase())) {
        r.usados = (r.usados || 0) + 1;
        salvar();
        return { ok: true, resposta: r.resposta, regra: r.id };
      }
    }
  }
  return { ok: false, resposta: null };
}

function listarRegras(ativa = null, jogo = null) {
  const c = carregar();
  let l = c.regras;
  if (ativa !== null) l = l.filter(r => r.ativa === ativa);
  if (jogo) l = l.filter(r => r.jogo === jogo || r.jogo === 'ambos');
  return l;
}

function estatisticasAutoresponder() {
  const c = carregar();
  const total = c.regras.length;
  const ativas = c.regras.filter(r => r.ativa).length;
  const totalUsos = c.regras.reduce((s, r) => s + (r.usados || 0), 0);
  return { total, ativas, totalUsos };
}

module.exports = { criarRegra, processarPergunta, listarRegras, estatisticasAutoresponder, carregar, salvar, ARQ };