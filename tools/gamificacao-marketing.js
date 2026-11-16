// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 GAMIFICAÇÃO DE MARKETING — pontos, badges, níveis para engajamento
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'gamificacao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { usuarios: [], badges: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarPontos(idUsuario, pontos, jogo, acao) {
  const c = carregar();
  const id = 'gam_' + c.proximoId++;
  let u = c.usuarios.find(x => x.idUsuario === idUsuario);
  if (!u) {
    u = { id, idUsuario, jogo: jogo || 'ambos', pontos: 0, nivel: 1, badges: [], criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    c.usuarios.push(u);
  }
  u.pontos += Number(pontos) || 0;
  u.nivel = Math.floor(u.pontos / 100) + 1;
  u.atualizadoEm = new Date().toISOString();
  if (acao) u.badges = u.badges || [];
  if (acao && !u.badges.includes(acao)) u.badges.push(acao);
  salvar();
  return { ok: true, usuario: u };
}

function listarUsuarios(jogo = null) {
  const c = carregar();
  if (jogo) return c.usuarios.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return c.usuarios.sort((a, b) => b.pontos - a.pontos);
}

function estatisticasGamificacao() {
  const c = carregar();
  const total = c.usuarios.length;
  const totalPontos = c.usuarios.reduce((s, u) => s + u.pontos, 0);
  return { total, totalPontos, mediaPontos: total > 0 ? (totalPontos / total).toFixed(2) : 0 };
}

module.exports = { adicionarPontos, listarUsuarios, estatisticasGamificacao, carregar, salvar, ARQ };