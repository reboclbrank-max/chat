// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📉 FUNIL DE CONVERSÃO COMPLETO — impressão → clique → download → instalação → retenção
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'funil-conversao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { funis: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarEtapa(nome, jogo, impressoes, cliques, downloads, instalacoes, primeiroJogo, retencao1, retencao7) {
  const c = carregar();
  const id = 'fnl_' + c.proximoId++;
  const f = { id, nome: nome || '', jogo: jogo || 'ambos', impressoes: Number(impressoes) || 0, cliques: Number(cliques) || 0, downloads: Number(downloads) || 0, instalacoes: Number(instalacoes) || 0, primeiroJogo: Number(primeiroJogo) || 0, retencao1: Number(retencao1) || 0, retencao7: Number(retencao7) || 0, criadoEm: new Date().toISOString() };
  c.funis.push(f);
  salvar();
  return { ok: true, funil: f };
}

function listarFunis(jogo = null) {
  const c = carregar();
  if (jogo) return c.funis.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return c.funis;
}

function estatisticasFunilConversao() {
  const c = carregar();
  const total = c.funis.length;
  const ultimo = total > 0 ? c.funis[total - 1] : null;
  if (!ultimo) return { total: 0 };
  const ctr = ultimo.impressoes > 0 ? ((ultimo.cliques / ultimo.impressoes) * 100).toFixed(2) : 0;
  const conversao = ultimo.cliques > 0 ? ((ultimo.downloads / ultimo.cliques) * 100).toFixed(2) : 0;
  const instalacao = ultimo.downloads > 0 ? ((ultimo.instalacoes / ultimo.downloads) * 100).toFixed(2) : 0;
  return { total, ultimo: ultimo.nome, ctr, conversao, taxaInstalacao: instalacao, retencao1: ultimo.retencao1, retencao7: ultimo.retencao7 };
}

module.exports = { registrarEtapa, listarFunis, estatisticasFunilConversao, carregar, salvar, ARQ };