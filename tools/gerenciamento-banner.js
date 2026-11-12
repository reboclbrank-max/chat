// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖼️ GERENCIAMENTO DE BANNER — controle de banners publicitários
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'banners.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { banners: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarBanner(nome, rede, jogo, url, tamanho, posicao, dataExpiracao) {
  const c = carregar();
  const id = 'ban_' + c.proximoId++;
  const b = { id, nome: nome || '', rede: rede || 'todos', jogo: jogo || 'ambos', url: url || '', tamanho: tamanho || '', posicao: posicao || '', dataExpiracao: dataExpiracao || null, ativo: true, impressoes: 0, cliques: 0, criadoEm: new Date().toISOString() };
  c.banners.push(b);
  salvar();
  return { ok: true, banner: b };
}

function registrarImpressaoBanner(id) {
  const c = carregar();
  const b = c.banners.find(x => x.id === id);
  if (!b) return { ok: false, erro: 'Banner não encontrado' };
  b.impressoes++;
  salvar();
  return { ok: true, banner: b };
}

function registrarCliqueBanner(id) {
  const c = carregar();
  const b = c.banners.find(x => x.id === id);
  if (!b) return { ok: false, erro: 'Banner não encontrado' };
  b.cliques++;
  salvar();
  return { ok: true, banner: b };
}

function listarBanners(jogo = null, rede = null, ativo = null) {
  const c = carregar();
  let l = c.banners;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.impressoes - a.impressoes);
}

function estatisticasBanners() {
  const c = carregar();
  const total = c.banners.length;
  const totalImpressoes = c.banners.reduce((s, b) => s + (b.impressoes || 0), 0);
  const totalCliques = c.banners.reduce((s, b) => s + (b.cliques || 0), 0);
  return { total, totalImpressoes, totalCliques, ctr: totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(2) : 0, ativos: c.banners.filter(x => x.ativo).length };
}

module.exports = { registrarBanner, registrarImpressaoBanner, registrarCliqueBanner, listarBanners, estatisticasBanners, carregar, salvar, ARQ };