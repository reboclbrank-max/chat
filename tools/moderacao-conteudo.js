// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ MODERAÇÃO DE CONTEÚDO — aprovação/rejeição de conteúdos gerados
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'moderacao.json');

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

function submeterConteudo(texto, tipo, rede, jogo, autor) {
  const c = carregar();
  const id = 'mod_' + c.proximoId++;
  const con = { id, texto: texto || '', tipo: tipo || 'post', rede: rede || 'todos', jogo: jogo || 'ambos', autor: autor || '', status: 'pendente', motivo: '', criadoEm: new Date().toISOString(), revisadoEm: null, revisadoPor: null };
  c.conteudos.push(con);
  salvar();
  return { ok: true, conteudo: con };
}

function aprovarConteudo(id, revisadoPor, motivo) {
  const c = carregar();
  const con = c.conteudos.find(x => x.id === id);
  if (!con) return { ok: false, erro: 'Conteúdo não encontrado' };
  con.status = 'aprovado';
  con.revisadoPor = revisadoPor || 'sistema';
  con.motivo = motivo || '';
  con.revisadoEm = new Date().toISOString();
  salvar();
  return { ok: true, conteudo: con };
}

function rejeitarConteudo(id, revisadoPor, motivo) {
  const c = carregar();
  const con = c.conteudos.find(x => x.id === id);
  if (!con) return { ok: false, erro: 'Conteúdo não encontrado' };
  con.status = 'rejeitado';
  con.revisadoPor = revisadoPor || 'sistema';
  con.motivo = motivo || '';
  con.revisadoEm = new Date().toISOString();
  salvar();
  return { ok: true, conteudo: con };
}

function listarConteudos(status = null, jogo = null) {
  const c = carregar();
  let l = c.conteudos;
  if (status) l = l.filter(x => x.status === status);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasModeracao() {
  const c = carregar();
  const total = c.conteudos.length;
  const pendentes = c.conteudos.filter(x => x.status === 'pendente').length;
  const aprovados = c.conteudos.filter(x => x.status === 'aprovado').length;
  const rejeitados = c.conteudos.filter(x => x.status === 'rejeitado').length;
  return { total, pendentes, aprovados, rejeitados };
}

module.exports = { submeterConteudo, aprovarConteudo, rejeitarConteudo, listarConteudos, estatisticasModeracao, carregar, salvar, ARQ };