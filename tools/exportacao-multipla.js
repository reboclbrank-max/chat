// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 EXPORTAÇÃO MÚLTIPLA — CSV, JSON, PDF para múltiplos módulos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'exportacoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { exportacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarExportacao(modulo, formato, jogo, registros, arquivo) {
  const c = carregar();
  const id = 'exp_' + c.proximoId++;
  const e = { id, modulo: modulo || '', formato: formato || 'json', jogo: jogo || 'ambos', registros: Number(registros) || 0, arquivo: arquivo || '', criadoEm: new Date().toISOString() };
  c.exportacoes.push(e);
  salvar();
  return { ok: true, exportacao: e };
}

function listarExportacoes(jogo = null, formato = null) {
  const c = carregar();
  let l = c.exportacoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (formato) l = l.filter(x => x.formato === formato);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasExportacao() {
  const c = carregar();
  const total = c.exportacoes.length;
  const totalRegistros = c.exportacoes.reduce((s, e) => s + (e.registros || 0), 0);
  return { total, totalRegistros, porFormato: { json: c.exportacoes.filter(x => x.formato === 'json').length, csv: c.exportacoes.filter(x => x.formato === 'csv').length } };
}

module.exports = { registrarExportacao, listarExportacoes, estatisticasExportacao, carregar, salvar, ARQ };