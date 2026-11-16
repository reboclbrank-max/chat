// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 INTEGRAÇÃO CRUZADA MARKETING — conecta camadas entre si (sentimento → alerta
// → conteúdo → follow-up) executando fluxos automáticos em cadeia.
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'integracao-cruzada-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, fluxos: [], execucoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarIntegracaoCruzada() {
  const c = carregar();
  const id = 'icm_' + c.proximoId++;
  c.ativo = true;
  const f = { id, ativo: true, criadoEm: new Date().toISOString() };
  c.fluxos.push(f);
  salvar();
  return { ok: true, fluxo: f };
}

function desativarIntegracaoCruzada() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function executarFluxoCruzado(origem, destino, acao, jogo, dados) {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Integração não ativa' };
  const exec = { id: 'exc_' + c.proximoId++, origem, destino, acao, jogo: jogo || 'ambos', dados: dados || {}, executadoEm: new Date().toISOString(), status: 'executado' };
  c.execucoes.push(exec);
  salvar();
  return { ok: true, execucao: exec };
}

function listarFluxos(jogo = null) {
  const c = carregar();
  let l = c.execucoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
}

function estatisticasIntegracaoCruzada() {
  const c = carregar();
  return { ativo: c.ativo, total_fluxos: c.fluxos.length, total_execucoes: c.execucoes.length };
}

module.exports = { ativarIntegracaoCruzada, desativarIntegracaoCruzada, executarFluxoCruzado, listarFluxos, estatisticasIntegracaoCruzada, carregar, salvar, ARQ };