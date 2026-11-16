// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📉 CHURN PREDITIVO — identifica usuários em risco de abandono
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'churn-preditivo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { usuarios: [], predicoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarUsuario(idUsuario, jogo, ultimoAcesso, totalAcessos, diasInativo) {
  const c = carregar();
  const id = 'usr_' + c.proximoId++;
  const risco = diasInativo > 30 ? 'alto' : diasInativo > 14 ? 'medio' : 'baixo';
  const u = { id, idUsuario, jogo: jogo || 'ambos', ultimoAcesso, totalAcessos: Number(totalAcessos), diasInativo: Number(diasInativo), risco, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  c.usuarios.push(u);
  salvar();
  return { ok: true, usuario: u };
}

function listarUsuariosRisco(risco = 'alto', jogo = null) {
  const c = carregar();
  let lista = c.usuarios.filter(u => u.risco === risco);
  if (jogo) lista = lista.filter(u => u.jogo === jogo || u.jogo === 'ambos');
  return lista;
}

function atualizarUsuario(idUsuario, dados) {
  const c = carregar();
  const u = c.usuarios.find(u => u.idUsuario === idUsuario);
  if (!u) return { ok: false, erro: 'Usuário não encontrado' };
  if (dados.diasInativo !== undefined) u.diasInativo = Number(dados.diasInativo);
  if (dados.totalAcessos !== undefined) u.totalAcessos = Number(dados.totalAcessos);
  if (dados.ultimoAcesso !== undefined) u.ultimoAcesso = dados.ultimoAcesso;
  u.risco = u.diasInativo > 30 ? 'alto' : u.diasInativo > 14 ? 'medio' : 'baixo';
  u.atualizadoEm = new Date().toISOString();
  salvar();
  return { ok: true, usuario: u };
}

function estatisticasChurn() {
  const c = carregar();
  const total = c.usuarios.length;
  const altoRisco = c.usuarios.filter(u => u.risco === 'alto').length;
  const medioRisco = c.usuarios.filter(u => u.risco === 'medio').length;
  const baixoRisco = c.usuarios.filter(u => u.risco === 'baixo').length;
  return { total, altoRisco, medioRisco, baixoRisco };
}

module.exports = { registrarUsuario, listarUsuariosRisco, atualizarUsuario, estatisticasChurn, carregar, salvar, ARQ };