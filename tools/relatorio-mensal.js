// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 RELATÓRIO MENSAL — relatório consolidado mensal de marketing
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-mensal.json');

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

function gerarRelatorioMensal(mes, ano, jogo, metricas, destaques, recomendacoes) {
  const c = carregar();
  const id = 'rm_' + c.proximoId++;
  const r = { id, mes: Number(mes) || 1, ano: Number(ano) || new Date().getFullYear(), jogo: jogo || 'ambos', metricas: metricas || {}, destaques: destaques || [], recomendacoes: recomendacoes || [], geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosMensais(jogo = null, ano = null, mes = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ano) l = l.filter(x => x.ano === Number(ano));
  if (mes) l = l.filter(x => x.mes === Number(mes));
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarRelatorioMensalEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasRelatorioMensal() {
  const c = carregar();
  const total = c.relatorios.length;
  const enviados = c.relatorios.filter(x => x.enviado).length;
  return { total, enviados, naoEnviados: total - enviados };
}

module.exports = { gerarRelatorioMensal, listarRelatoriosMensais, marcarRelatorioMensalEnviado, estatisticasRelatorioMensal, carregar, salvar, ARQ };