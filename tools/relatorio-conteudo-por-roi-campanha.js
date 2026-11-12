// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 RELATÓRIO DE CONTEÚDO POR ROI CAMPANHA — conteúdo por ROI de campanha
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-roi-campanha.json');

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

function gerarRelatorioConteudoPorROICampanha(campanha, jogo, investimento, receita, lucro) {
  const c = carregar();
  const id = 'rroi_' + c.proximoId++;
  const r = { id, campanha: campanha || '', jogo: jogo || 'ambos', investimento: Number(investimento) || 0, receita: Number(receita) || 0, lucro: Number(lucro) || 0, roi: Number(investimento) > 0 ? (((Number(lucro) / Number(investimento)) * 100).toFixed(2)) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorROICampanha(jogo = null, campanha = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (campanha) l = l.filter(x => x.campanha === campanha);
  return l.sort((a, b) => b.roi - a.roi);
}

function marcarConteudoPorROICampanhaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorROICampanha() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestido = c.relatorios.reduce((s, r) => s + r.investimento, 0);
  return { total, totalInvestido, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorROICampanha, listarRelatoriosConteudoPorROICampanha, marcarConteudoPorROICampanhaEnviado, estatisticasConteudoPorROICampanha, carregar, salvar, ARQ };