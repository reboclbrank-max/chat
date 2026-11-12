// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📸 ANÁLISE DE CONTEÚDO DO INSTAGRAM — desempenho de conteúdos no Instagram
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-ig.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { conteudos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarConteudoIG(titulo, tipo, jogo, curtidas, comentarios, compartilhamentos, alcancado, salvamentos) {
  const c = carregar();
  const id = 'ig_' + c.proximoId++;
  const eng = Number(curtidas) + Number(comentarios) + Number(compartilhamentos) + Number(salvamentos);
  const ig = { id, titulo: titulo || '', tipo: tipo || 'post', jogo: jogo || 'ambos', curtidas: Number(curtidas) || 0, comentarios: Number(comentarios) || 0, compartilhamentos: Number(compartilhamentos) || 0, alcancado: Number(alcancado) || 0, salvamentos: Number(salvamentos) || 0, engajamento: eng, taxaEngajamento: Number(alcancado) > 0 ? ((eng / Number(alcancado)) * 100).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.conteudos.push(ig);
  salvar();
  return { ok: true, conteudo: ig };
}

function listarConteudosIG(jogo = null, tipo = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasConteudoIG() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalEngajamento = c.conteudos.reduce((s, c) => s + c.engajamento, 0);
  return { total, totalEngajamento, ativos: c.conteudos.filter(x => x.ativo).length };
}

module.exports = { registrarConteudoIG, listarConteudosIG, estatisticasConteudoIG, carregar, salvar, ARQ };