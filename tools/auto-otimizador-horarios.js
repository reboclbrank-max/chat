// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏰ AUTO-OTIMIZADOR DE HORÁRIOS — ajusta horários de postagem baseado em dados
// reais de acesso de cada rede, sem horários fixos. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'auto-otimizador-horarios.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, otimizacoes: [], redes: {}, proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarAutoOtimizador(rede, jogo) {
  const c = carregar();
  const id = 'aoh_' + c.proximoId++;
  c.ativo = true;
  c.redes[rede] = c.redes[rede] || {};
  c.redes[rede][jogo || 'ambos'] = { id, ativo: true, criadoEm: new Date().toISOString(), ajustes: 0 };
  salvar();
  return { ok: true, otimizacao: c.redes[rede][jogo || 'ambos'] };
}

function desativarAutoOtimizador() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function registrarAcesso(rede, horario, jogo, quantidade) {
  const c = carregar();
  const reg = { id: 'acc_' + c.proximoId++, rede, horario, jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, executadoEm: new Date().toISOString() };
  c.otimizacoes.push(reg);
  if (c.redes[rede] && c.redes[rede][jogo || 'ambos']) c.redes[rede][jogo || 'ambos'].ajustes++;
  salvar();
  return { ok: true, registro: reg };
}

function listarOtimizacoes(rede = null) {
  const c = carregar();
  let l = c.otimizacoes;
  if (rede) l = l.filter(x => x.rede === rede);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function estatisticasAutoOtimizador() {
  const c = carregar();
  return { ativo: c.ativo, total_otimizacoes: c.otimizacoes.length, redes: Object.keys(c.redes).length, total_ajustes: c.otimizacoes.reduce((s, x) => s + x.quantidade, 0) };
}

module.exports = { ativarAutoOtimizador, desativarAutoOtimizador, registrarAcesso, listarOtimizacoes, estatisticasAutoOtimizador, carregar, salvar, ARQ };