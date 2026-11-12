// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤝 RASTREAMENTO DE AFILIADOS — indicações com código de afiliado
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'afiliados.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { afiliados: [], indicacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarAfiliado(nome, jogo, codigo, comissao) {
  const c = carregar();
  const id = 'af_' + c.proximoId++;
  const a = { id, nome, jogo: jogo || 'ambos', codigo: codigo || '', comissao: comissao || '0%', indicacoes: 0, conversoes: 0, ganhos: 0, ativo: true, criadoEm: new Date().toISOString() };
  c.afiliados.push(a);
  salvar();
  return { ok: true, afiliado: a };
}

function registrarIndicacaoAfiliado(codigoAfiliado, indicado, jogo) {
  const c = carregar();
  const af = c.afiliados.find(x => x.codigo === codigoAfiliado);
  if (!af) return { ok: false, erro: 'Afiliado não encontrado' };
  const id = 'ind_' + c.proximoId++;
  const ind = { id, codigoAfiliado, indicado, jogo: jogo || 'ambos', convertido: false, criadoEm: new Date().toISOString() };
  c.indicacoes.push(ind);
  af.indicacoes++;
  salvar();
  return { ok: true, indicacao: ind };
}

function converterIndicacaoAfiliado(idIndicacao) {
  const c = carregar();
  const ind = c.indicacoes.find(x => x.id === idIndicacao);
  if (!ind) return { ok: false, erro: 'Indicação não encontrada' };
  ind.convertido = true;
  const af = c.afiliados.find(x => x.codigo === ind.codigoAfiliado);
  if (af) { af.conversoes++; af.ganhos = (af.ganhos || 0) + 10; }
  salvar();
  return { ok: true, indicacao: ind };
}

function listarAfiliados(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.afiliados;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.conversoes - a.conversoes);
}

function estatisticasAfiliados() {
  const c = carregar();
  const total = c.afiliados.length;
  const totalConversoes = c.afiliados.reduce((s, a) => s + (a.conversoes || 0), 0);
  const totalGanhos = c.afiliados.reduce((s, a) => s + (a.ganhos || 0), 0);
  return { total, totalConversoes, totalGanhos };
}

module.exports = { cadastrarAfiliado, registrarIndicacaoAfiliado, converterIndicacaoAfiliado, listarAfiliados, estatisticasAfiliados, carregar, salvar, ARQ };