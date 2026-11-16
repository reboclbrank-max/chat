// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 RELATÓRIO DE CONTEÚDO POR EXPORTAÇÃO — conteúdo por exportação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-exportacao.json');

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

function gerarRelatorioConteudoPorExportacao(formato, jogo, quantidade, registros, arquivo) {
  const c = carregar();
  const id = 'rex_' + c.proximoId++;
  const r = { id, formato: formato || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, registros: Number(registros) || 0, arquivo: arquivo || '', geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorExportacao(jogo = null, formato = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (formato) l = l.filter(x => x.formato === formato);
  return l.sort((a, b) => b.registros - a.registros);
}

function marcarConteudoPorExportacaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorExportacao() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalRegistros = c.relatorios.reduce((s, r) => s + r.registros, 0);
  return { total, totalRegistros, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorExportacao, listarRelatoriosConteudoPorExportacao, marcarConteudoPorExportacaoEnviado, estatisticasConteudoPorExportacao, carregar, salvar, ARQ };