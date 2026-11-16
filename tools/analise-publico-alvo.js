// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 ANÁLISE DE PÚBLICO-ALVO — perfil e características do público
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'publico-alvo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { perfis: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarPerfilPublico(nome, jogo, faixaEtaria, genero, localizacao, interesses) {
  const c = carregar();
  const id = 'ppa_' + c.proximoId++;
  const p = { id, nome: nome || '', jogo: jogo || 'ambos', faixaEtaria: faixaEtaria || '', genero: genero || '', localizacao: localizacao || '', interesses: interesses || [], tamanho: 0, ativo: true, criadoEm: new Date().toISOString() };
  c.perfis.push(p);
  salvar();
  return { ok: true, perfil: p };
}

function atualizarTamanhoPerfil(id, tamanho) {
  const c = carregar();
  const p = c.perfis.find(x => x.id === id);
  if (!p) return { ok: false, erro: 'Perfil não encontrado' };
  p.tamanho = Number(tamanho) || 0;
  salvar();
  return { ok: true, perfil: p };
}

function listarPerfisPublico(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.perfis;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.tamanho - a.tamanho);
}

function estatisticasPublicoAlvo() {
  const c = carregar();
  const total = c.perfis.length;
  const totalPessoas = c.perfis.reduce((s, p) => s + p.tamanho, 0);
  return { total, totalPessoas, ativos: c.perfis.filter(x => x.ativo).length };
}

module.exports = { criarPerfilPublico, atualizarTamanhoPerfil, listarPerfisPublico, estatisticasPublicoAlvo, carregar, salvar, ARQ };