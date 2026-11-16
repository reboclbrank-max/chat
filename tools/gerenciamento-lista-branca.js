// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ GERENCIAMENTO DE LISTA BRANCA — contatos aprovados para comunicação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'lista-branca.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { aprovados: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarListaBranca(identificador, rede, jogo, tipo, motivo) {
  const c = carregar();
  const id = 'lb_' + c.proximoId++;
  const b = { id, identificador: identificador || '', rede: rede || 'todos', jogo: jogo || 'ambos', tipo: tipo || 'usuario', motivo: motivo || '', ativo: true, criadoEm: new Date().toISOString() };
  c.aprovados.push(b);
  salvar();
  return { ok: true, aprovado: b };
}

function removerListaBranca(id) {
  const c = carregar();
  const idx = c.aprovados.findIndex(x => x.id === id);
  if (idx === -1) return { ok: false, erro: 'Não encontrado na lista branca' };
  c.aprovados.splice(idx, 1);
  salvar();
  return { ok: true };
}

function listarListaBranca(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.aprovados;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasListaBranca() {
  const c = carregar();
  const total = c.aprovados.length;
  const ativos = c.aprovados.filter(x => x.ativo).length;
  return { total, ativos, inativos: total - ativos };
}

module.exports = { adicionarListaBranca, removerListaBranca, listarListaBranca, estatisticasListaBranca, carregar, salvar, ARQ };