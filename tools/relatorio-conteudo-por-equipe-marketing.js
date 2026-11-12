// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 RELATÓRIO DE CONTEÚDO POR EQUIPE MARKETING — conteúdo por equipe de marketing
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-equipe-marketing.json');

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

function gerarRelatorioConteudoPorEquipeMarketing(membro, jogo, tarefas, concluidas, horas) {
  const c = carregar();
  const id = 'rtmk_' + c.proximoId++;
  const r = { id, membro: membro || '', jogo: jogo || 'ambos', tarefas: Number(tarefas) || 0, concluidas: Number(concluidas) || 0, horas: Number(horas) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorEquipeMarketing(jogo = null, membro = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (membro) l = l.filter(x => x.membro === membro);
  return l.sort((a, b) => b.concluidas - a.concluidas);
}

function marcarConteudoPorEquipeMarketingEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorEquipeMarketing() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalTarefas = c.relatorios.reduce((s, r) => s + r.tarefas, 0);
  return { total, totalTarefas, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorEquipeMarketing, listarRelatoriosConteudoPorEquipeMarketing, marcarConteudoPorEquipeMarketingEnviado, estatisticasConteudoPorEquipeMarketing, carregar, salvar, ARQ };