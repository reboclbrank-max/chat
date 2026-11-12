// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE CONCORRÊNCIA — relatório completo de concorrentes
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-concorrencia.json');

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

function gerarRelatorioConcorrencia(jogo, concorrente, periodo, metricas, analise, recomendacoes) {
  const c = carregar();
  const id = 'rc_' + c.proximoId++;
  const r = { id, jogo: jogo || 'ambos', concorrente: concorrente || '', periodo: periodo || '', metricas: metricas || {}, analise: analise || '', recomendacoes: recomendacoes || [], geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConcorrencia(jogo = null, concorrente = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (concorrente) l = l.filter(x => x.concorrente === concorrente);
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarConcorrenciaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasRelatorioConcorrencia() {
  const c = carregar();
  const total = c.relatorios.length;
  const enviados = c.relatorios.filter(x => x.enviado).length;
  return { total, enviados, naoEnviados: total - enviados };
}

module.exports = { gerarRelatorioConcorrencia, listarRelatoriosConcorrencia, marcarConcorrenciaEnviado, estatisticasRelatorioConcorrencia, carregar, salvar, ARQ };