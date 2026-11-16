// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📱 MONITORAMENTO DE CONCORRÊNCIA SOCIAL — rastreamento de concorrentes nas redes
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'monitoramento-concorrencia-social.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { concorrentes: [], postagens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarConcorrenteSocial(nome, rede, jogo, seguidores, url) {
  const c = carregar();
  const id = 'mcs_' + c.proximoId++;
  const con = { id, nome: nome || '', rede: rede || 'todos', jogo: jogo || 'ambos', seguidores: Number(seguidores) || 0, url: url || '', ativo: true, criadoEm: new Date().toISOString() };
  c.concorrentes.push(con);
  salvar();
  return { ok: true, concorrente: con };
}

function registrarPostagemConcorrente(concorrenteId, rede, conteudo, engajamento, data) {
  const c = carregar();
  const con = c.concorrentes.find(x => x.id === concorrenteId);
  if (!con) return { ok: false, erro: 'Concorrente não encontrado' };
  const id = 'pst_' + c.proximoId++;
  const p = { id, concorrenteId, rede: rede || 'todos', conteudo: conteudo || '', engajamento: Number(engajamento) || 0, data: data || new Date().toISOString(), jogo: con.jogo };
  c.postagens.push(p);
  salvar();
  return { ok: true, postagem: p };
}

function listarConcorrentesSociais(jogo = null, rede = null) {
  const c = carregar();
  let l = c.concorrentes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.seguidores - a.seguidores);
}

function estatisticasMonitoramentoSocial() {
  const c = carregar();
  const total = c.concorrentes.length;
  const totalPostagens = c.postagens.length;
  return { total, totalPostagens, ativos: c.concorrentes.filter(x => x.ativo).length };
}

module.exports = { cadastrarConcorrenteSocial, registrarPostagemConcorrente, listarConcorrentesSociais, estatisticasMonitoramentoSocial, carregar, salvar, ARQ };