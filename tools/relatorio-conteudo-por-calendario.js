// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 RELATÓRIO DE CONTEÚDO POR CALENDÁRIO — conteúdo por calendário editorial
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-calendario.json');

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

function gerarRelatorioConteudoPorCalendario(data, jogo, quantidade, publicados, pendentes) {
  const c = carregar();
  const id = 'rcl_' + c.proximoId++;
  const r = { id, data: data || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, publicados: Number(publicados) || 0, pendentes: Number(pendentes) || 0, taxaPublicacao: Number(quantidade) > 0 ? ((Number(publicados) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCalendario(jogo = null, data = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (data) l = l.filter(x => x.data === data);
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarConteudoPorCalendarioEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCalendario() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalPublicados = c.relatorios.reduce((s, r) => s + r.publicados, 0);
  return { total, totalPublicados, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCalendario, listarRelatoriosConteudoPorCalendario, marcarConteudoPorCalendarioEnviado, estatisticasConteudoPorCalendario, carregar, salvar, ARQ };