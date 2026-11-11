// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚡ ANÁLISE DE VELOCIDADE DE RESPOSTA — tempo médio de resposta por rede
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'velocidade-resposta.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { respostas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarResposta(rede, jogo, tempoSegundos, tipo, autor) {
  const c = carregar();
  const id = 'vel_' + c.proximoId++;
  const r = { id, rede: rede || 'todos', jogo: jogo || 'ambos', tempoSegundos: Number(tempoSegundos) || 0, tipo: tipo || 'comentario', autor: autor || '', criadoEm: new Date().toISOString() };
  c.respostas.push(r);
  salvar();
  return { ok: true, resposta: r };
}

function listarRespostas(rede = null, jogo = null) {
  const c = carregar();
  let l = c.respostas;
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasVelocidade(rede = null, jogo = null) {
  const c = carregar();
  let l = c.respostas;
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  const total = l.length;
  const medio = total > 0 ? (l.reduce((s, r) => s + r.tempoSegundos, 0) / total).toFixed(2) : 0;
  const minimo = total > 0 ? Math.min(...l.map(r => r.tempoSegundos)) : 0;
  const maximo = total > 0 ? Math.max(...l.map(r => r.tempoSegundos)) : 0;
  return { total, tempoMedio: medio, minimo, maximo };
}

module.exports = { registrarResposta, listarRespostas, estatisticasVelocidade, carregar, salvar, ARQ };