// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ☁️ BACKUP EM NUVEM — registro de backups para armazenamento externo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'backup-nuvem.json');

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

function registrarBackup(tipo, jogo, tamanho, status, destino) {
  const c = carregar();
  const id = 'bkp_' + c.proximoId++;
  const b = { id, tipo: tipo || 'completo', jogo: jogo || 'ambos', tamanho: tamanho || '0 MB', status: status || 'sucesso', destino: destino || 'nuvem', criadoEm: new Date().toISOString() };
  c.backups.push(b);
  salvar();
  return { ok: true, backup: b };
}

function listarBackups(jogo = null, status = null) {
  const c = carregar();
  let l = c.backups;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasBackupNuvem() {
  const c = carregar();
  const total = c.backups.length;
  const sucessos = c.backups.filter(x => x.status === 'sucesso').length;
  return { total, sucessos, falhas: total - sucessos };
}

module.exports = { registrarBackup, listarBackups, estatisticasBackupNuvem, carregar, salvar, ARQ };