// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛑 LIMITES DE POSTAGEM — controle de gasto, taxa e falhas consecutivas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'limites.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { limitePostsDia: 10, limiteHorasSemana: 40, limiteFalhasConsecutivas: 3, postsPorDia: {}, horasPorSemana: {}, falhasConsecutivas: 0, ultimoResetDia: new Date().toISOString().slice(0, 10), proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarPost(rede, jogo) {
  const c = carregar();
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.ultimoResetDia !== hoje) {
    c.postsPorDia = {};
    c.ultimoResetDia = hoje;
  }
  const chave = `${rede}|${jogo}`;
  c.postsPorDia[chave] = (c.postsPorDia[chave] || 0) + 1;
  const totalHoje = Object.values(c.postsPorDia).reduce((a, b) => a + b, 0);
  const excedeu = totalHoje > c.limitePostsDia;
  salvar();
  return { ok: !excedeu, totalHoje, limite: c.limitePostsDia, excedeu };
}

function registrarFalha() {
  const c = carregar();
  c.falhasConsecutivas = (c.falhasConsecutivas || 0) + 1;
  const bloqueado = c.falhasConsecutivas >= c.limiteFalhasConsecutivas;
  salvar();
  return { ok: !bloqueado, falhasConsecutivas: c.falhasConsecutivas, limite: c.limiteFalhasConsecutivas, bloqueado };
}

function resetarFalhas() {
  const c = carregar();
  c.falhasConsecutivas = 0;
  salvar();
  return { ok: true };
}

function definirLimite(tipo, valor) {
  const c = carregar();
  if (tipo === 'postsDia') c.limitePostsDia = Number(valor);
  if (tipo === 'horasSemana') c.limiteHorasSemana = Number(valor);
  if (tipo === 'falhasConsecutivas') c.limiteFalhasConsecutivas = Number(valor);
  salvar();
  return { ok: true, tipo, valor: c[tipo === 'postsDia' ? 'limitePostsDia' : tipo === 'horasSemana' ? 'limiteHorasSemana' : 'limiteFalhasConsecutivas'] };
}

function estatisticasLimites() {
  const c = carregar();
  return { limitePostsDia: c.limitePostsDia, limiteHorasSemana: c.limiteHorasSemana, limiteFalhasConsecutivas: c.limiteFalhasConsecutivas, falhasConsecutivas: c.falhasConsecutivas || 0 };
}

module.exports = { registrarPost, registrarFalha, resetarFalhas, definirLimite, estatisticasLimites, carregar, salvar, ARQ };