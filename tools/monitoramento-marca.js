// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏷️ MONITORAMENTO DE MARCA — rastreamento de menções à marca e concorrentes
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'monitoramento-marca.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { monitoramentos: [], palavrasChave: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarPalavraChave(palavra, jogo, tipo) {
  const c = carregar();
  const id = 'pwc_' + c.proximoId++;
  const p = { id, palavra: palavra || '', jogo: jogo || 'ambos', tipo: tipo || 'marca', ativo: true, mencoes: 0, criadoEm: new Date().toISOString() };
  c.palavrasChave.push(p);
  salvar();
  return { ok: true, palavraChave: p };
}

function registrarMonitoramento(palavraChave, rede, jogo, contexto, sentimento) {
  const c = carregar();
  const id = 'mon_' + c.proximoId++;
  const m = { id, palavraChave: palavraChave || '', rede: rede || 'todos', jogo: jogo || 'ambos', contexto: contexto || '', sentimento: sentimento || 'neutro', criadoEm: new Date().toISOString() };
  c.monitoramentos.push(m);
  const pwc = c.palavrasChave.find(x => x.palavra === palavraChave);
  if (pwc) pwc.mencoes++;
  salvar();
  return { ok: true, monitoramento: m };
}

function listarPalavrasChave(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.palavrasChave;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.mencoes - a.mencoes);
}

function estatisticasMonitoramentoMarca() {
  const c = carregar();
  const total = c.palavrasChave.length;
  const totalMencoes = c.monitoramentos.length;
  return { total, totalMencoes, ativas: c.palavrasChave.filter(x => x.ativo).length };
}

module.exports = { adicionarPalavraChave, registrarMonitoramento, listarPalavrasChave, estatisticasMonitoramentoMarca, carregar, salvar, ARQ };