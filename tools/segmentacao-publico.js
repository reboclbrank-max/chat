// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 SEGMENTAÇÃO DE PÚBLICO — grupos de usuários por comportamento
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'segmentacao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { segmentos: [], usuarios: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarSegmento(nome, criterio, jogo) {
  const c = carregar();
  const id = 'seg_' + c.proximoId++;
  const s = { id, nome: nome || '', criterio: criterio || '', jogo: jogo || 'ambos', totalUsuarios: 0, ativo: true, criadoEm: new Date().toISOString() };
  c.segmentos.push(s);
  salvar();
  return { ok: true, segmento: s };
}

function atribuirUsuarioSegmento(idUsuario, segmentoId, jogo) {
  const c = carregar();
  const seg = c.segmentos.find(x => x.id === segmentoId);
  if (!seg) return { ok: false, erro: 'Segmento não encontrado' };
  const id = 'usu_' + c.proximoId++;
  const u = { id, idUsuario, segmentoId, jogo: jogo || 'ambos', criadoEm: new Date().toISOString() };
  c.usuarios.push(u);
  seg.totalUsuarios++;
  salvar();
  return { ok: true, usuario: u };
}

function listarSegmentos(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.segmentos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l;
}

function estatisticasSegmentacao() {
  const c = carregar();
  return { totalSegmentos: c.segmentos.length, totalUsuarios: c.usuarios.length, segmentosAtivos: c.segmentos.filter(x => x.ativo).length };
}

module.exports = { criarSegmento, atribuirUsuarioSegmento, listarSegmentos, estatisticasSegmentacao, carregar, salvar, ARQ };