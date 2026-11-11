// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 VALIDAÇÃO DE LINK AVANÇADA — verifica links antes de publicar
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'validacao-link.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { validacoes: [], linksBloqueados: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function validarLink(url, contexto) {
  const c = carregar();
  const id = 'val_' + c.proximoId++;
  const bloqueado = cache.linksBloqueados.some(b => url.includes(b));
  const valido = url.startsWith('http') && !bloqueado;
  const v = { id, url, contexto: contexto || '', valido, bloqueado, criadoEm: new Date().toISOString() };
  c.validacoes.push(v);
  salvar();
  return { ok: true, valido, bloqueado, link: v };
}

function bloquearLink(palavra) {
  const c = carregar();
  if (!c.linksBloqueados.includes(palavra)) c.linksBloqueados.push(palavra);
  salvar();
  return { ok: true, linksBloqueados: c.linksBloqueados };
}

function listarValidacoes(limite = 20) {
  const c = carregar();
  return c.validacoes.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite);
}

function estatisticasValidacao() {
  const c = carregar();
  const total = c.validacoes.length;
  const validos = c.validacoes.filter(v => v.valido).length;
  const bloqueados = c.validacoes.filter(v => v.bloqueado).length;
  return { total, validos, bloqueados, linksBloqueados: c.linksBloqueados.length };
}

module.exports = { validarLink, bloquearLink, listarValidacoes, estatisticasValidacao, carregar, salvar, ARQ };