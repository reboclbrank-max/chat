// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔁 LOOP DE APRENDIZAGEM AUTOMÁTICO — melhora o sistema continuamente com base
// nos resultados de cada ação executada. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'loop-aprendizado-automatico.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, iteracoes: [], melhorias_aplicadas: [], taxa_aprendizado: 0.1, proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarLoopAprendizado(taxa) {
  const c = carregar();
  const id = 'lap_' + c.proximoId++;
  c.ativo = true;
  c.taxa_aprendizado = Number(taxa) || 0.1;
  const it = { id, ativo: true, executadoEm: new Date().toISOString(), iteracao: c.iteracoes.length + 1 };
  c.iteracoes.push(it);
  salvar();
  return { ok: true, iteracao: it };
}

function desativarLoopAprendizado() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function registrarResultadoAcao(acao, resultado, jogo, impacto) {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Loop não ativo' };
  const reg = { id: 'res_' + c.proximoId++, acao, resultado, jogo: jogo || 'ambos', impacto: Number(impacto) || 0, executadoEm: new Date().toISOString(), aprendizado_aplicado: false };
  c.iteracoes.push(reg);
  if (Math.abs(reg.impacto) > 5) {
    c.melhorias_aplicadas.push({ acao: reg.acao, impacto: reg.impacto, ajustado: true, executadoEm: new Date().toISOString() });
    reg.aprendizado_aplicado = true;
  }
  salvar();
  return { ok: true, registro: reg };
}

function listarIteracoes(jogo = null) {
  const c = carregar();
  let l = c.iteracoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
}

function estatisticasLoopAprendizado() {
  const c = carregar();
  return { ativo: c.ativo, total_iteracoes: c.iteracoes.length, melhorias_aplicadas: c.melhorias_aplicadas.length, taxa_aprendizado: c.taxa_aprendizado };
}

module.exports = { ativarLoopAprendizado, desativarLoopAprendizado, registrarResultadoAcao, listarIteracoes, estatisticasLoopAprendizado, carregar, salvar, ARQ };