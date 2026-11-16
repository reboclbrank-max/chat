// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✉️ RELATÓRIO DE CONTEÚDO POR TESTE ASSUNTO EMAIL — conteúdo por teste de assunto de email
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-teste-assunto-email.json');

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

function gerarRelatorioConteudoPorTesteAssuntoEmail(assunto, jogo, aberturas, cliques, conversoes) {
  const c = carregar();
  const id = 'rata_' + c.proximoId++;
  const r = { id, assunto: assunto || '', jogo: jogo || 'ambos', aberturas: Number(aberturas) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, taxaAbertura: Number(aberturas) > 0 ? ((Number(cliques) / Number(aberturas)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorTesteAssuntoEmail(jogo = null, assunto = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (assunto) l = l.filter(x => x.assunto === assunto);
  return l.sort((a, b) => b.aberturas - a.aberturas);
}

function marcarConteudoPorTesteAssuntoEmailEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorTesteAssuntoEmail() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAberturas = c.relatorios.reduce((s, r) => s + r.aberturas, 0);
  return { total, totalAberturas, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorTesteAssuntoEmail, listarRelatoriosConteudoPorTesteAssuntoEmail, marcarConteudoPorTesteAssuntoEmailEnviado, estatisticasConteudoPorTesteAssuntoEmail, carregar, salvar, ARQ };