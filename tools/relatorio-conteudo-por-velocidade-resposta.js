// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚡ RELATÓRIO DE CONTEÚDO POR VELOCIDADE DE RESPOSTA — conteúdo por velocidade de resposta
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-velocidade-resposta.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { relatorios: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function gerarRelatorioConteudoPorVelocidadeResposta(canal, jogo, tempoMedioMs, respostas, satisfacao) {
  const c = carregar();
  const id = 'rvel_' + c.proximoId++;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', tempoMedioMs: Number(tempoMedioMs) || 0, respostas: Number(respostas) || 0, satisfacao: Number(satisfacao) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorVelocidadeResposta(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => a.tempoMedioMs - b.tempoMedioMs);
}

function marcarConteudoPorVelocidadeRespostaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorVelocidadeResposta() {
  const c = carregar();
  const total = c.relatorios.length;
  const mediaTempo = total > 0 ? (c.relatorios.reduce((s, r) => s + r.tempoMedioMs, 0) / total).toFixed(2) : 0;
  return { total, mediaTempoMs: mediaTempo, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorVelocidadeResposta, listarRelatoriosConteudoPorVelocidadeResposta, marcarConteudoPorVelocidadeRespostaEnviado, estatisticasConteudoPorVelocidadeResposta, carregar, salvar, ARQ };