// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤝 GERENCIAMENTO DE INFLUENCIADORES — parcerias e desempenho
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'influenciadores.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { influenciadores: [], parceiros: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarInfluenciador(nome, rede, seguidores, jogo, taxaEngajamento) {
  const c = carregar();
  const id = 'inf_' + c.proximoId++;
  const inf = { id, nome: nome || '', rede: rede || 'todos', seguidores: Number(seguidores) || 0, jogo: jogo || 'ambos', taxaEngajamento: taxaEngajamento || '0%', ativo: true, parceiros: 0, criadoEm: new Date().toISOString() };
  c.influenciadores.push(inf);
  salvar();
  return { ok: true, influenciador: inf };
}

function registrarParceria(influenciadorId, jogo, valor, resultado) {
  const c = carregar();
  const inf = c.influenciadores.find(x => x.id === influenciadorId);
  if (!inf) return { ok: false, erro: 'Influenciador não encontrado' };
  const id = 'par_' + c.proximoId++;
  const p = { id, influenciadorId, jogo: jogo || 'ambos', valor: Number(valor) || 0, resultado: resultado || '', status: 'ativo', criadoEm: new Date().toISOString() };
  c.parceiros.push(p);
  inf.parceiros++;
  salvar();
  return { ok: true, parceiro: p };
}

function listarInfluenciadores(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.influenciadores;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.seguidores - a.seguidores);
}

function estatisticasInfluenciadores() {
  const c = carregar();
  const total = c.influenciadores.length;
  const totalParceiros = c.parceiros.length;
  const totalSeguidores = c.influenciadores.reduce((s, i) => s + (i.seguidores || 0), 0);
  return { total, totalSeguidores, totalParceiros, ativos: c.influenciadores.filter(x => x.ativo).length };
}

module.exports = { cadastrarInfluenciador, registrarParceria, listarInfluenciadores, estatisticasInfluenciadores, carregar, salvar, ARQ };