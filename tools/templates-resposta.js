// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 TEMPLATES DE RESPOSTA — modelos de resposta por tipo de situação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'templates-resposta.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { templates: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarTemplate(nome, tipo, conteudo, jogo, categoria) {
  const c = carregar();
  const id = 'tpl_' + c.proximoId++;
  const t = { id, nome: nome || '', tipo: tipo || 'resposta', conteudo: conteudo || '', jogo: jogo || 'ambos', categoria: categoria || 'geral', usos: 0, ativo: true, criadoEm: new Date().toISOString() };
  c.templates.push(t);
  salvar();
  return { ok: true, template: t };
}

function usarTemplate(id) {
  const c = carregar();
  const t = c.templates.find(x => x.id === id);
  if (!t) return { ok: false, erro: 'Template não encontrado' };
  t.usados = (t.usados || 0) + 1;
  salvar();
  return { ok: true, template: t };
}

function listarTemplates(jogo = null, categoria = null, ativo = null) {
  const c = carregar();
  let l = c.templates;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (categoria) l = l.filter(x => x.categoria === categoria);
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => (b.usados || 0) - (a.usados || 0));
}

function estatisticasTemplates() {
  const c = carregar();
  const total = c.templates.length;
  const ativos = c.templates.filter(x => x.ativo).length;
  const totalUsos = c.templates.reduce((s, t) => s + (t.usados || 0), 0);
  return { total, ativos, totalUsos };
}

module.exports = { criarTemplate, usarTemplate, listarTemplates, estatisticasTemplates, carregar, salvar, ARQ };