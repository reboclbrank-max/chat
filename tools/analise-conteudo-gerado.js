// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✍️ ANÁLISE DE CONTEÚDO GERADO — avaliação de conteúdo gerado por IA
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-gerado.json');

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

function registrarConteudoGerado(titulo, jogo, tipo, conteudo, avaliacao, modeloIA) {
  const c = carregar();
  const id = 'cg_' + c.proximoId++;
  const cg = { id, titulo: titulo || '', jogo: jogo || 'ambos', tipo: tipo || 'post', conteudo: conteudo || '', avaliacao: Number(avaliacao) || 0, modeloIA: modeloIA || 'ia', aprovado: false, criadoEm: new Date().toISOString() };
  c.conteudos.push(cg);
  salvar();
  return { ok: true, conteudo: cg };
}

function aprovarConteudoGerado(id) {
  const c = carregar();
  const cg = c.conteudos.find(x => x.id === id);
  if (!cg) return { ok: false, erro: 'Conteúdo não encontrado' };
  cg.aprovado = true;
  salvar();
  return { ok: true, conteudo: cg };
}

function listarConteudosGerados(jogo = null, tipo = null, aprovado = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  if (aprovado !== null) l = l.filter(x => x.aprovado === aprovado);
  return l.sort((a, b) => b.avaliacao - a.avaliacao);
}

function estatisticasConteudoGerado() {
  const c = carregar();
  const total = c.conteudos.length;
  const aprovados = c.conteudos.filter(x => x.aprovado).length;
  const mediaAvaliacao = total > 0 ? (c.conteudos.reduce((s, c) => s + c.avaliacao, 0) / total).toFixed(2) : 0;
  return { total, aprovados, mediaAvaliacao };
}

module.exports = { registrarConteudoGerado, aprovarConteudoGerado, listarConteudosGerados, estatisticasConteudoGerado, carregar, salvar, ARQ };