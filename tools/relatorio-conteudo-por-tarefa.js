// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ RELATÓRIO DE CONTEÚDO POR TAREFA — conteúdo por tarefa
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-tarefa.json');

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

function gerarRelatorioConteudoPorTarefa(tarefa, jogo, quantidade, concluídas, pendentes) {
  const c = carregar();
  const id = 'rt_' + c.proximoId++;
  const r = { id, tarefa: tarefa || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, concluídas: Number(concluídas) || 0, pendentes: Number(pendentes) || 0, taxaConclusao: Number(quantidade) > 0 ? ((Number(concluídas) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorTarefa(jogo = null, tarefa = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tarefa) l = l.filter(x => x.tarefa === tarefa);
  return l.sort((a, b) => b.concluídas - a.concluídas);
}

function marcarConteudoPorTarefaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorTarefa() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalConcluidas = c.relatorios.reduce((s, r) => s + r.concluídas, 0);
  return { total, totalConcluidas, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorTarefa, listarRelatoriosConteudoPorTarefa, marcarConteudoPorTarefaEnviado, estatisticasConteudoPorTarefa, carregar, salvar, ARQ };