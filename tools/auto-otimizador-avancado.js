// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏱ AUTO-OTIMIZADOR AVANÇADO — coleta dados reais de acesso de cada rede e ajusta
// horários de postagem automaticamente, sem horários fixos.
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'auto-otimizador-avancado.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = {
    ativo: false,
    redes: {},
    ajustes: [],
    ultima_execucao: null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

const REDES = ['instagram', 'x', 'nostr', 'gmail'];
const JOGOS = ['ambos', 'prancheta', 'ceifalume'];

function ativarAutoOtimizadorAvancado() {
  const c = carregar();
  const id = 'aoa_' + Date.now();
  c.ativo = true;
  REDES.forEach(rede => {
    if (!c.redes[rede]) c.redes[rede] = {};
    JOGOS.forEach(jogo => {
      if (!c.redes[rede][jogo]) {
        c.redes[rede][jogo] = { horarios: [], media_acesso: 0, ultimo_ajuste: null, total_registros: 0 };
      }
    });
  });
  c.ultima_execucao = new Date().toISOString();
  salvar();
  return { ok: true, id, redes: REDES.length, jogos: JOGOS.length };
}

function registrarAcesso(rede, jogo, horario, sucesso) {
  const c = carregar();
  if (!c.redes[rede]) c.redes[rede] = {};
  if (!c.redes[rede][jogo]) c.redes[rede][jogo] = { horarios: [], media_acesso: 0, ultimo_ajuste: null, total_registros: 0 };
  const r = c.redes[rede][jogo];
  r.horarios.push({ horario, sucesso, registradoEm: new Date().toISOString() });
  if (r.horarios.length > 200) r.horarios = r.horarios.slice(-200);
  r.total_registros++;
  const media = r.horarios.filter(h => h.sucesso).length / r.horarios.length * 100;
  r.media_acesso = Math.round(media * 100) / 100;
  salvar();
  return { ok: true, media_acesso: r.media_acesso };
}

function otimizarHorarios() {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Auto-otimizador não ativo' };
  const ajustes = [];
  REDES.forEach(rede => {
    JOGOS.forEach(jogo => {
      const r = c.redes[rede] && c.redes[rede][jogo];
      if (r && r.horarios.length > 0) {
        const melhores = r.horarios.filter(h => h.sucesso).map(h => h.horario);
        if (melhores.length > 0) {
          const ajuste = { rede, jogo, horario_recomendado: melhores[Math.floor(Math.random() * melhores.length)], confianca: Math.round(r.media_acesso * 100), total_registros: r.total_registros };
          ajustes.push(ajuste);
          r.ultimo_ajuste = new Date().toISOString();
        }
      }
    });
  });
  c.ajustes = ajustes;
  c.ultima_execucao = new Date().toISOString();
  salvar();
  return { ok: true, ajustes };
}

function estatisticasAutoOtimizador() {
  const c = carregar();
  return {
    ativo: c.ativo,
    redes_configuradas: Object.keys(c.redes).length,
    total_ajustes: c.ajustes.length,
    ultima_execucao: c.ultima_execucao
  };
}

module.exports = { ativarAutoOtimizadorAvancado, registrarAcesso, otimizarHorarios, estatisticasAutoOtimizador, REDES, JOGOS };
