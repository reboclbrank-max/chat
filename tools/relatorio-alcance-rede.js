// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📶 RELATÓRIO DE ALCANCE POR REDE — alcance detalhado por rede social
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-alcance-rede.json');

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

function gerarRelatorioAlcanceRede(rede, jogo, periodo, alcance, impressoes, visualizacoes, perfil) {
  const c = carregar();
  const id = 'rar_' + c.proximoId++;
  const r = { id, rede: rede || 'todos', jogo: jogo || 'ambos', periodo: periodo || '', alcance: Number(alcance) || 0, impressoes: Number(impressoes) || 0, visualizacoes: Number(visualizacoes) || 0, perfil: perfil || '', taxaAlcanceImpressao: Number(impressoes) > 0 ? ((Number(alcance) / Number(impressoes)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosAlcanceRede(jogo = null, rede = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.alcance - a.alcance);
}

function marcarAlcanceRedeEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasAlcanceRede() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAlcance = c.relatorios.reduce((s, r) => s + r.alcance, 0);
  return { total, totalAlcance, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioAlcanceRede, listarRelatoriosAlcanceRede, marcarAlcanceRedeEnviado, estatisticasAlcanceRede, carregar, salvar, ARQ };