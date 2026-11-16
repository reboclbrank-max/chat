// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📚 HISTÓRICO DE CONTEÚDO — controle de versão e restauração de posts
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'historico-conteudo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { versoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarVersao(conteudoId, conteudo, versao, autor, mudanca) {
  const c = carregar();
  const id = 'ver_' + c.proximoId++;
  const v = { id, conteudoId, conteudo, versao: versao || '1.0', autor: autor || 'sistema', mudanca: mudanca || '', criadoEm: new Date().toISOString() };
  c.versoes.push(v);
  salvar();
  return { ok: true, versao: v };
}

function listarVersoes(conteudoId) {
  const c = carregar();
  return c.versoes.filter(v => v.conteudoId === conteudoId).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function restaurarVersao(versaoId) {
  const c = carregar();
  const v = c.versoes.find(v => v.id === versaoId);
  if (!v) return { ok: false, erro: 'Versão não encontrada' };
  return { ok: true, conteudo: v.conteudo, versao: v };
}

function estatisticasHistorico() {
  const c = carregar();
  return { totalVersoes: c.versoes.length, conteudosUnicos: new Set(c.versoes.map(v => v.conteudoId)).size };
}

module.exports = { registrarVersao, listarVersoes, restaurarVersao, estatisticasHistorico, carregar, salvar, ARQ };