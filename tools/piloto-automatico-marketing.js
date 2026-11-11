// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 PILOTO AUTOMÁTICO DE MARKETING — orquestra todas as camadas de forma autônoma
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'piloto-automatico-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = {
    ativo: false,
    modos: {},
    ultima_execucao: null,
    historico: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarPilotoAutomatico(jogo, modo, intervaloMinutos) {
  const c = carregar();
  const id = 'pil_' + c.proximoId++;
  c.ativo = true;
  c.modos[jogo] = c.modos[jogo] || {};
  c.modos[jogo][modo] = {
    id, ativo: true, intervaloMinutos: Number(intervaloMinutos) || 60,
    ultimaExecucao: null, proximaExecucao: new Date(Date.now() + (Number(intervaloMinutos) || 60) * 60000).toISOString(),
    criadoEm: new Date().toISOString()
  };
  salvar();
  return { ok: true, piloto: c.modos[jogo][modo] };
}

function desativarPilotoAutomatico(jogo, modo) {
  const c = carregar();
  if (c.modos[jogo] && c.modos[jogo][modo]) {
    c.modos[jogo][modo].ativo = false;
    salvar();
    return { ok: true };
  }
  return { ok: false, erro: 'Piloto não encontrado' };
}

function listarPilotosAutomaticos(jogo = null) {
  const c = carregar();
  let resultado = [];
  for (const [j, modos] of Object.entries(c.modos)) {
    if (jogo && j !== jogo) continue;
    for (const [m, dados] of Object.entries(modos)) {
      resultado.push({ jogo: j, modo: m, ...dados });
    }
  }
  return resultado.sort((a, b) => new Date(b.proximaExecucao) - new Date(a.proximaExecucao));
}

function executarPilotoAutomatico(jogo, modo) {
  const c = carregar();
  const piloto = c.modos[jogo] && c.modos[jogo][modo];
  if (!piloto || !piloto.ativo) return { ok: false, erro: 'Piloto não ativo' };
  const entrada = { jogo, modo, executadoEm: new Date().toISOString(), id: piloto.id };
  c.historico.push(entrada);
  if (c.historico.length > 200) c.historico = c.historico.slice(-200);
  piloto.ultimaExecucao = entrada.executadoEm;
  piloto.proximaExecucao = new Date(Date.now() + (piloto.intervaloMinutos || 60) * 60000).toISOString();
  c.ultima_execucao = entrada.executadoEm;
  salvar();
  return { ok: true, piloto: entrada };
}

function estatisticasPilotoAutomatico() {
  const c = carregar();
  const totalPilotos = listarPilotosAutomaticos().length;
  const ativos = listarPilotosAutomaticos().filter(p => p.ativo).length;
  return { ativo: c.ativo, totalPilotos, ativos, ultima_execucao: c.ultima_execucao, total_execucoes: c.historico.length };
}

module.exports = { ativarPilotoAutomatico, desativarPilotoAutomatico, listarPilotosAutomaticos, executarPilotoAutomatico, estatisticasPilotoAutomatico, carregar, salvar, ARQ };