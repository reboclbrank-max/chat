// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 GERENCIAMENTO DE LISTA DE DIFUSÃO — listas de contatos para divulgação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'lista-difusao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { listas: [], contatos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarListaDifusao(nome, jogo, descricao) {
  const c = carregar();
  const id = 'ld_' + c.proximoId++;
  const l = { id, nome: nome || '', jogo: jogo || 'ambos', descricao: descricao || '', totalContatos: 0, ativa: true, criadoEm: new Date().toISOString() };
  c.listas.push(l);
  salvar();
  return { ok: true, lista: l };
}

function adicionarContatoLista(listaId, contato, jogo) {
  const c = carregar();
  const lst = c.listas.find(x => x.id === listaId);
  if (!lst) return { ok: false, erro: 'Lista não encontrada' };
  const id = 'ct_' + c.proximoId++;
  const ct = { id, listaId, contato: contato || '', jogo: jogo || 'ambos', ativo: true, criadoEm: new Date().toISOString() };
  c.contatos.push(ct);
  lst.totalContatos++;
  salvar();
  return { ok: true, contato: ct };
}

function listarListasDifusao(jogo = null, ativa = null) {
  const c = carregar();
  let l = c.listas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativa !== null) l = l.filter(x => x.ativa === ativa);
  return l;
}

function estatisticasListaDifusao() {
  const c = carregar();
  const total = c.listas.length;
  const totalContatos = c.contatos.length;
  return { total, totalContatos, ativas: c.listas.filter(x => x.ativa).length };
}

module.exports = { criarListaDifusao, adicionarContatoLista, listarListasDifusao, estatisticasListaDifusao, carregar, salvar, ARQ };