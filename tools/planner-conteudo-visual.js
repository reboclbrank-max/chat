// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 PLANNER DE CONTEÚDO VISUAL — planejamento de posts visuais por rede
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'planner-visual.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { planejamentos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarPlanejamentoVisual(data, rede, tipoConteudo, jogo, descricao, assetId) {
  const c = carregar();
  const id = 'plv_' + c.proximoId++;
  const p = { id, data, rede: rede || 'todos', tipoConteudo: tipoConteudo || 'post', jogo: jogo || 'ambos', descricao: descricao || '', assetId: assetId || '', status: 'planejado', publicado: false, criadoEm: new Date().toISOString() };
  c.planejamentos.push(p);
  salvar();
  return { ok: true, planejamento: p };
}

function listarPlanejamentos(dataInicial, dataFinal, jogo = null) {
  const c = carregar();
  let l = c.planejamentos;
  if (dataInicial) l = l.filter(x => x.data >= dataInicial);
  if (dataFinal) l = l.filter(x => x.data <= dataFinal);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => a.data.localeCompare(b.data));
}

function marcarPlanejamentoPublicado(id) {
  const c = carregar();
  const p = c.planejamentos.find(x => x.id === id);
  if (!p) return { ok: false, erro: 'Planejamento não encontrado' };
  p.publicado = true;
  p.status = 'publicado';
  salvar();
  return { ok: true, planejamento: p };
}

function estatisticasPlannerVisual() {
  const c = carregar();
  const total = c.planejamentos.length;
  const publicados = c.planejamentos.filter(x => x.publicado).length;
  return { total, publicados, pendentes: total - publicados };
}

module.exports = { criarPlanejamentoVisual, listarPlanejamentos, marcarPlanejamentoPublicado, estatisticasPlannerVisual, carregar, salvar, ARQ };