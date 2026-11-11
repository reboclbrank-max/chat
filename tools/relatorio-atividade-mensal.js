// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 RELATÓRIO DE ATIVIDADE MENSAL — atividade de marketing por mês
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-atividade-mensal.json');

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

function gerarRelatorioAtividade(mes, ano, jogo, posts, stories, reels, emails, notificacoes) {
  const c = carregar();
  const id = 'ram_' + c.proximoId++;
  const r = { id, mes: Number(mes) || 1, ano: Number(ano) || new Date().getFullYear(), jogo: jogo || 'ambos', posts: Number(posts) || 0, stories: Number(stories) || 0, reels: Number(reels) || 0, emails: Number(emails) || 0, notificacoes: Number(notificacoes) || 0, totalAtividades: Number(posts || 0) + Number(stories || 0) + Number(reels || 0) + Number(emails || 0) + Number(notificacoes || 0), geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosAtividade(jogo = null, ano = null, mes = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ano) l = l.filter(x => x.ano === Number(ano));
  if (mes) l = l.filter(x => x.mes === Number(mes));
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarAtividadeEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasAtividadeMensal() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAtividades = c.relatorios.reduce((s, r) => s + r.totalAtividades, 0);
  return { total, totalAtividades, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioAtividade, listarRelatoriosAtividade, marcarAtividadeEnviado, estatisticasAtividadeMensal, carregar, salvar, ARQ };