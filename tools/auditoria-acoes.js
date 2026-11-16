// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 AUDITORIA DE AÇÕES — log de quem fez o quê, quando e por quê
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'auditoria.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { logs: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarAcao(acao, entidade, entidadeId, detalhes, usuario = 'sistema') {
  const c = carregar();
  const id = 'aud_' + c.proximoId++;
  const log = { id, acao, entidade, entidadeId, detalhes: detalhes || '', usuario, criadoEm: new Date().toISOString() };
  c.logs.push(log);
  salvar();
  return { ok: true, log };
}

function listarLogs(entidade = null, acao = null, limite = 50) {
  const c = carregar();
  let lista = c.logs;
  if (entidade) lista = lista.filter(l => l.entidade === entidade);
  if (acao) lista = lista.filter(l => l.acao === acao);
  return lista.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite);
}

function estatisticasAuditoria() {
  const c = carregar();
  const total = c.logs.length;
  const porAcao = {};
  for (const l of c.logs) { if (!porAcao[l.acao]) porAcao[l.acao] = 0; porAcao[l.acao]++; }
  return { total, porAcao };
}

module.exports = { registrarAcao, listarLogs, estatisticasAuditoria, carregar, salvar, ARQ };