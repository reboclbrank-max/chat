// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 GERENCIAMENTO DE NEWSLETTER — controle de newsletters e inscritos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'newsletter.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { edicoes: [], inscritos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarEdicaoNewsletter(titulo, conteudo, jogo, dataEnvio, status) {
  const c = carregar();
  const id = 'nl_' + c.proximoId++;
  const e = { id, titulo: titulo || '', conteudo: conteudo || '', jogo: jogo || 'ambos', dataEnvio: dataEnvio || new Date().toISOString(), status: status || 'rascunho', envios: 0, aberturas: 0, cliques: 0, criadoEm: new Date().toISOString() };
  c.edicoes.push(e);
  salvar();
  return { ok: true, edicao: e };
}

function inscreverNewsletter(email, jogo, origem) {
  const c = carregar();
  const id = 'ins_' + c.proximoId++;
  const ins = { id, email: email || '', jogo: jogo || 'ambos', origem: origem || 'site', ativo: true, inscritoEm: new Date().toISOString() };
  c.inscritos.push(ins);
  salvar();
  return { ok: true, inscricao: ins };
}

function listarEdicoesNewsletter(jogo = null, status = null) {
  const c = carregar();
  let l = c.edicoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.dataEnvio) - new Date(a.dataEnvio));
}

function estatisticasNewsletter() {
  const c = carregar();
  const totalEdicoes = c.edicoes.length;
  const totalInscritos = c.inscritos.length;
  const totalEnvios = c.edicoes.reduce((s, e) => s + (e.envios || 0), 0);
  return { totalEdicoes, totalInscritos, totalEnvios, ativos: c.inscritos.filter(x => x.ativo).length };
}

module.exports = { criarEdicaoNewsletter, inscreverNewsletter, listarEdicoesNewsletter, estatisticasNewsletter, carregar, salvar, ARQ };