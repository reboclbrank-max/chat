// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 RASTREAMENTO DE INDICAÇÕES POR REDE — de onde vêm os novos usuários
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'indicacoes-rede.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { indicacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarIndicacaoRede(rede, jogo, quantidade, fonte) {
  const c = carregar();
  const id = 'ir_' + c.proximoId++;
  const ind = { id, rede: rede || 'todos', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, fonte: fonte || 'orgânico', criadoEm: new Date().toISOString() };
  c.indicacoes.push(ind);
  salvar();
  return { ok: true, indicacao: ind };
}

function listarIndicacoesRede(rede = null, jogo = null) {
  const c = carregar();
  let l = c.indicacoes;
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasIndicacoesRede() {
  const c = carregar();
  const total = c.indicacoes.length;
  const totalQuantidade = c.indicacoes.reduce((s, i) => s + (i.quantidade || 0), 0);
  return { total, totalQuantidade };
}

module.exports = { registrarIndicacaoRede, listarIndicacoesRede, estatisticasIndicacoesRede, carregar, salvar, ARQ };