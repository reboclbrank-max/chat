// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE ENGAJAMENTO DE CONTEÚDO — engajamento por conteúdo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-engajamento-conteudo.json');

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

function gerarRelatorioEngajamentoConteudo(conteudo, jogo, rede, periodo, curtidas, comentarios, compartilhamentos, salvamentos) {
  const c = carregar();
  const id = 'rec_' + c.proximoId++;
  const eng = Number(curtidas) + Number(comentarios) + Number(compartilhamentos) + Number(salvamentos);
  const r = { id, conteudo: conteudo || '', jogo: jogo || 'ambos', rede: rede || 'todos', periodo: periodo || '', curtidas: Number(curtidas) || 0, comentarios: Number(comentarios) || 0, compartilhamentos: Number(compartilhamentos) || 0, salvamentos: Number(salvamentos) || 0, engajamentoTotal: eng, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosEngajamentoConteudo(jogo = null, rede = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.engajamentoTotal - a.engajamentoTotal);
}

function marcarEngajamentoConteudoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasEngajamentoConteudo() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalEngajamento = c.relatorios.reduce((s, r) => s + r.engajamentoTotal, 0);
  return { total, totalEngajamento, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioEngajamentoConteudo, listarRelatoriosEngajamentoConteudo, marcarEngajamentoConteudoEnviado, estatisticasEngajamentoConteudo, carregar, salvar, ARQ };