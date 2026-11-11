// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 FUNIL UTM AVANÇADO — rastreamento completo de conversão
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'funil-utm.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { links: [], cliques: [], conversoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarLink(campanha, fonte, medio, conteudo, termo, urlDestino, jogo) {
  const c = carregar();
  const id = 'utm_' + c.proximoId++;
  const utm = `?utm_source=${fonte}&utm_medium=${medio}&utm_campaign=${campanha}&utm_content=${conteudo}&utm_term=${termo}`;
  const l = { id, campanha, fonte, medio, conteudo, termo, urlDestino, urlCompleta: urlDestino + utm, jogo: jogo || 'ambos', cliques: 0, conversoes: 0, criadoEm: new Date().toISOString() };
  c.links.push(l);
  salvar();
  return { ok: true, link: l };
}

function registrarClique(linkId) {
  const c = carregar();
  const l = c.links.find(x => x.id === linkId);
  if (!l) return { ok: false, erro: 'Link não encontrado' };
  l.cliques++;
  c.cliques.push({ linkId, criadoEm: new Date().toISOString() });
  salvar();
  return { ok: true, cliques: l.cliques };
}

function registrarConversao(linkId) {
  const c = carregar();
  const l = c.links.find(x => x.id === linkId);
  if (!l) return { ok: false, erro: 'Link não encontrado' };
  l.conversoes++;
  c.conversoes.push({ linkId, criadoEm: new Date().toISOString() });
  salvar();
  return { ok: true, conversoes: l.conversoes };
}

function listarLinks(jogo = null) {
  const c = carregar();
  if (jogo) return c.links.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return c.links;
}

function estatisticasFunil() {
  const c = carregar();
  const totalCliques = c.links.reduce((s, l) => s + l.cliques, 0);
  const totalConversoes = c.links.reduce((s, l) => s + l.conversoes, 0);
  return { totalLinks: c.links.length, totalCliques, totalConversoes, taxaConversao: totalCliques > 0 ? ((totalConversoes / totalCliques) * 100).toFixed(2) : 0 };
}

module.exports = { criarLink, registrarClique, registrarConversao, listarLinks, estatisticasFunil, carregar, salvar, ARQ };