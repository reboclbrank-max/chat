// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 RELATÓRIO DE CONTEÚDO POR EXPORTAÇÃO MÚLTIPLA — conteúdo por exportação múltipla
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-exportacao-multipla.json');

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

function gerarRelatorioConteudoPorExportacaoMultipla(formato, jogo, quantidade, destino, sucesso) {
  const c = carregar();
  const id = 'rexp_' + c.proximoId++;
  const r = { id, formato: formato || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, destino: destino || '', sucesso: sucesso === true, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorExportacaoMultipla(jogo = null, formato = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (formato) l = l.filter(x => x.formato === formato);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorExportacaoMultiplaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorExportacaoMultipla() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalSucesso = c.relatorios.filter(x => x.sucesso).length;
  return { total, totalSucesso, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorExportacaoMultipla, listarRelatoriosConteudoPorExportacaoMultipla, marcarConteudoPorExportacaoMultiplaEnviado, estatisticasConteudoPorExportacaoMultipla, carregar, salvar, ARQ };