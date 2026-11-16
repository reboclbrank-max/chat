// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 TESTE DE ASSUNTO DE EMAIL — A/B de assuntos para campanhas email
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'teste-assunto-email.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { testes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarTesteAssunto(campanha, assuntoA, assuntoB, jogo) {
  const c = carregar();
  const id = 'tae_' + c.proximoId++;
  const t = { id, campanha: campanha || '', assuntoA: assuntoA || '', assuntoB: assuntoB || '', jogo: jogo || 'ambos', aberturasA: 0, aberturasB: 0, cliquesA: 0, cliquesB: 0, enviadosA: 0, enviadosB: 0, vencedor: null, status: 'ativo', criadoEm: new Date().toISOString() };
  c.testes.push(t);
  salvar();
  return { ok: true, teste: t };
}

function registrarResultadoTeste(testeId, tipo, variante, valor) {
  const c = carregar();
  const t = c.testes.find(x => x.id === testeId);
  if (!t) return { ok: false, erro: 'Teste não encontrado' };
  const campo = variante === 'A' ? tipo + 'A' : tipo + 'B';
  t[campo] = (t[campo] || 0) + Number(valor) || 0;
  if (tipo === 'enviados') {
    if (t.enviadosA > 0 && t.enviadosB > 0) {
      const taxaA = t.aberturasA / t.enviadosA;
      const taxaB = t.aberturasB / t.enviadosB;
      t.vencedor = taxaB > taxaA ? 'B' : taxaA > taxaB ? 'A' : 'empate';
      t.status = 'concluido';
    }
  }
  salvar();
  return { ok: true, teste: t };
}

function listarTestesAssunto(jogo = null, status = null) {
  const c = carregar();
  let l = c.testes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasTesteAssunto() {
  const c = carregar();
  const total = c.testes.length;
  const concluidos = c.testes.filter(x => x.status === 'concluido').length;
  return { total, concluidos, ativos: c.testes.filter(x => x.status === 'ativo').length };
}

module.exports = { criarTesteAssunto, registrarResultadoTeste, listarTestesAssunto, estatisticasTesteAssunto, carregar, salvar, ARQ };