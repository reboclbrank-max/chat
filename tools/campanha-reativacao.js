// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 CAMPANHA DE REATIVAÇÃO — campanhas para reativar usuários inativos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'campanha-reativacao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { campanhas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarCampanhaReativacao(nome, jogo, mensagem, alvoInativos, rede) {
  const c = carregar();
  const id = 'cre_' + c.proximoId++;
  const camp = { id, nome: nome || '', jogo: jogo || 'ambos', mensagem: mensagem || '', alvoInativos: Number(alvoInativos) || 0, rede: rede || 'todos', reativados: 0, status: 'ativa', criadoEm: new Date().toISOString() };
  c.campanhas.push(camp);
  salvar();
  return { ok: true, campanha: camp };
}

function registrarReativacao(campanhaId, idUsuario, jogo) {
  const c = carregar();
  const camp = c.campanhas.find(x => x.id === campanhaId);
  if (!camp) return { ok: false, erro: 'Campanha não encontrada' };
  camp.reativados++;
  salvar();
  return { ok: true, campanha: camp };
}

function listarCampanhasReativacao(jogo = null, status = null) {
  const c = carregar();
  let l = c.campanhas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => b.reativados - a.reativados);
}

function estatisticasCampanhaReativacao() {
  const c = carregar();
  const total = c.campanhas.length;
  const totalReativados = c.campanhas.reduce((s, c) => s + c.reativados, 0);
  return { total, totalReativados, ativas: c.campanhas.filter(x => x.status === 'ativa').length };
}

module.exports = { criarCampanhaReativacao, registrarReativacao, listarCampanhasReativacao, estatisticasCampanhaReativacao, carregar, salvar, ARQ };