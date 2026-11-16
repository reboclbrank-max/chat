// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖼️ GERENCIAMENTO DE ASSETS — controle de imagens, vídeos e materiais
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'assets.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { assets: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarAsset(nome, tipo, url, jogo, rede, descricao) {
  const c = carregar();
  const id = 'ast_' + c.proximoId++;
  const a = { id, nome: nome || '', tipo: tipo || 'imagem', url: url || '', jogo: jogo || 'ambos', rede: rede || 'todos', descricao: descricao || '', usos: 0, ativo: true, criadoEm: new Date().toISOString() };
  c.assets.push(a);
  salvar();
  return { ok: true, asset: a };
}

function incrementarUsoAsset(id) {
  const c = carregar();
  const a = c.assets.find(x => x.id === id);
  if (!a) return { ok: false, erro: 'Asset não encontrado' };
  a.usados = (a.usados || 0) + 1;
  salvar();
  return { ok: true, asset: a };
}

function listarAssets(jogo = null, tipo = null, ativo = null) {
  const c = carregar();
  let l = c.assets;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => (b.usados || 0) - (a.usados || 0));
}

function estatisticasAssets() {
  const c = carregar();
  const total = c.assets.length;
  const ativos = c.assets.filter(x => x.ativo).length;
  const totalUsos = c.assets.reduce((s, a) => s + (a.usados || 0), 0);
  return { total, ativos, totalUsos };
}

module.exports = { registrarAsset, incrementarUsoAsset, listarAssets, estatisticasAssets, carregar, salvar, ARQ };