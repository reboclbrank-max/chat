// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🐙 INTEGRAÇÃO GITHUB ISSUES — criar issues para alertas de queda e métricas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'github-issues.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { issues: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarIssue(titulo, corpo, repositorio, estado, numero) {
  const c = carregar();
  const id = 'ghiss_' + c.proximoId++;
  const iss = { id, titulo, corpo: corpo || '', repositorio: repositorio || 'reboclbrank-max/chat', estado: estado || 'open', numero: numero || null, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  c.issues.push(iss);
  salvar();
  return { ok: true, issue: iss };
}

function listarIssues(estado = null) {
  const c = carregar();
  if (estado) return c.issues.filter(i => i.estado === estado);
  return c.issues;
}

function estatisticasIssues() {
  const c = carregar();
  const total = c.issues.length;
  const abertas = c.issues.filter(i => i.estado === 'open').length;
  const fechadas = c.issues.filter(i => i.estado === 'closed').length;
  return { total, abertas, fechadas };
}

module.exports = { registrarIssue, listarIssues, estatisticasIssues, carregar, salvar, ARQ };