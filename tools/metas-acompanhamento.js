// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 METAS E ACOMPANHAMENTO — marketing Prancheta + Ceifalume
// Define metas por período, acompanha progresso e alerta sobre riscos.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'metas.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { metas: [], acompanhamentos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarMeta(descricao, valorAlvo, periodo, jogo, tipoMetrica) {
  const c = carregar();
  const id = 'meta_' + c.proximoId++;
  const meta = { id, descricao, valorAlvo: Number(valorAlvo), valorAtual: 0, periodo, jogo: jogo || 'ambos', tipoMetrica, status: 'ativa', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), concluidaEm: null };
  c.metas.push(meta);
  salvar();
  return { ok: true, meta };
}

function atualizarProgressoMeta(id, valorAtual) {
  const c = carregar();
  const meta = c.metas.find(m => m.id === id);
  if (!meta) return { ok: false, erro: 'Meta não encontrada' };
  meta.valorAtual = Number(valorAtual);
  meta.atualizadoEm = new Date().toISOString();
  if (meta.valorAtual >= meta.valorAlvo && meta.status === 'ativa') {
    meta.status = 'concluida';
    meta.concluidaEm = new Date().toISOString();
  }
  salvar();
  return { ok: true, meta };
}

function listarMetas(status = null, jogo = null) {
  const c = carregar();
  let lista = c.metas;
  if (status) lista = lista.filter(m => m.status === status);
  if (jogo) lista = lista.filter(m => m.jogo === jogo || m.jogo === 'ambos');
  return lista;
}

function adicionarAcompanhamento(metaId, observacao, valor) {
  const c = carregar();
  const id = 'acomp_' + c.proximoId++;
  const ac = { id, metaId, observacao, valor: Number(valor) || 0, criadoEm: new Date().toISOString() };
  c.acompanhamentos.push(ac);
  salvar();
  return { ok: true, acompanhamento: ac };
}

function estatisticasMetas() {
  const c = carregar();
  const total = c.metas.length;
  const ativas = c.metas.filter(m => m.status === 'ativa').length;
  const concluidas = c.metas.filter(m => m.status === 'concluida').length;
  const emRisco = c.metas.filter(m => m.status === 'ativa' && m.valorAlvo > 0 && (m.valorAtual / m.valorAlvo) < 0.5).length;
  return { total, ativas, concluidas, emRisco };
}

module.exports = { criarMeta, atualizarProgressoMeta, listarMetas, adicionarAcompanhamento, estatisticasMetas, carregar, salvar, ARQ };