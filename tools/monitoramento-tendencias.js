// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 MONITORAMENTO DE TENDÊNCIAS — detecção de tendências emergentes
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'monitoramento-tendencias.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { tendencias: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarTendencia(nome, rede, jogo, descricao, intensidade, categoria) {
  const c = carregar();
  const id = 'tend_' + c.proximoId++;
  const t = { id, nome: nome || '', rede: rede || 'todos', jogo: jogo || 'ambos', descricao: descricao || '', intensidade: Number(intensidade) || 0, categoria: categoria || 'geral', ativa: true, criacaoEm: new Date().toISOString() };
  c.tendencias.push(t);
  salvar();
  return { ok: true, tendencia: t };
}

function listarTendencias(jogo = null, categoria = null, ativa = null) {
  const c = carregar();
  let l = c.tendencias;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (categoria) l = l.filter(x => x.categoria === categoria);
  if (ativa !== null) l = l.filter(x => x.ativa === ativa);
  return l.sort((a, b) => b.intensidade - a.intensidade);
}

function estatisticasTendencias() {
  const c = carregar();
  const total = c.tendencias.length;
  const ativas = c.tendencias.filter(x => x.ativa).length;
  return { total, ativas, inativas: total - ativas };
}

module.exports = { registrarTendencia, listarTendencias, estatisticasTendencias, carregar, salvar, ARQ };