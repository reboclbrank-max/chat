// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 BACKUP AUTOMÁTICO AVANÇADO — backup de todas as publicações e dados
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
const BACKUP_DIR = path.join(MARKETING_DIR, 'backups');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'backups.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { backups: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarBackup(tipo, arquivo, tamanho, status) {
  const c = carregar();
  const id = 'bkp_' + c.proximoId++;
  const b = { id, tipo, arquivo, tamanho: tamanho || 0, status: status || 'sucesso', criadoEm: new Date().toISOString() };
  c.backups.push(b);
  salvar();
  return { ok: true, backup: b };
}

function listarBackups(limite = 20) {
  const c = carregar();
  return c.backups.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite);
}

function estatisticasBackups() {
  const c = carregar();
  const total = c.backups.length;
  const sucesso = c.backups.filter(b => b.status === 'sucesso').length;
  const falhas = c.backups.filter(b => b.status === 'falha').length;
  return { total, sucesso, falhas };
}

module.exports = { registrarBackup, listarBackups, estatisticasBackups, carregar, salvar, ARQ, BACKUP_DIR };