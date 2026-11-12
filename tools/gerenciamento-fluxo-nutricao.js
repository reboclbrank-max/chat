// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💧 GERENCIAMENTO DE FLUXO DE NUTRIÇÃO — sequências de nutrição de leads
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'fluxo-nutricao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { fluxos: [], inscricoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarFluxoNutricao(nome, jogo, descricao, etapas, status) {
  const c = carregar();
  const id = 'fn_' + c.proximoId++;
  const f = { id, nome: nome || '', jogo: jogo || 'ambos', descricao: descricao || '', etapas: Number(etapas) || 0, status: status || 'ativo', inscricoes: 0, concluidos: 0, criadoEm: new Date().toISOString() };
  c.fluxos.push(f);
  salvar();
  return { ok: true, fluxo: f };
}

function inscreverFluxo(fluxoId, lead, jogo) {
  const c = carregar();
  const f = c.fluxos.find(x => x.id === fluxoId);
  if (!f) return { ok: false, erro: 'Fluxo não encontrado' };
  const id = 'ins_' + c.proximoId++;
  const ins = { id, fluxoId, lead: lead || '', jogo: jogo || 'ambos', etapaAtual: 1, concluido: false, inscritoEm: new Date().toISOString() };
  c.inscricoes.push(ins);
  f.inscricoes++;
  salvar();
  return { ok: true, inscricao: ins };
}

function listarFluxosNutricao(jogo = null, status = null) {
  const c = carregar();
  let l = c.fluxos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => b.inscricoes - a.inscricoes);
}

function estatisticasFluxoNutricao() {
  const c = carregar();
  const total = c.fluxos.length;
  const totalInscricoes = c.fluxos.reduce((s, f) => s + (f.inscricoes || 0), 0);
  return { total, totalInscricoes, ativos: c.fluxos.filter(x => x.status === 'ativo').length };
}

module.exports = { criarFluxoNutricao, inscreverFluxo, listarFluxosNutricao, estatisticasFluxoNutricao, carregar, salvar, ARQ };