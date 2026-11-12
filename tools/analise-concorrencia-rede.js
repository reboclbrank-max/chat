// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 ANÁLISE DE CONCORRÊNCIA POR REDE — benchmark por rede social
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'concorrencia-rede.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { concorrentes: [], comparativos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarConcorrente(nome, rede, seguidores, jogo, url) {
  const c = carregar();
  const id = 'con_' + c.proximoId++;
  const con = { id, nome: nome || '', rede: rede || 'todos', seguidores: Number(seguidores) || 0, jogo: jogo || 'ambos', url: url || '', ativo: true, criadoEm: new Date().toISOString() };
  c.concorrentes.push(con);
  salvar();
  return { ok: true, concorrente: con };
}

function adicionarComparativoRede(metrica, nossoValor, valorConcorrente, vencedor, jogo, rede) {
  const c = carregar();
  const id = 'com_' + c.proximoId++;
  const comp = { id, metrica, nossoValor: Number(nossoValor) || 0, valorConcorrente: Number(valorConcorrente) || 0, vencedor: vencedor || 'empate', jogo: jogo || 'ambos', rede: rede || 'todos', diferenca: Math.abs(Number(nossoValor) - Number(valorConcorrente)), criadoEm: new Date().toISOString() };
  c.comparativos.push(comp);
  salvar();
  return { ok: true, comparativo: comp };
}

function listarConcorrentes(jogo = null, rede = null, ativo = null) {
  const c = carregar();
  let l = c.concorrentes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.seguidores - a.seguidores);
}

function estatisticasConcorrenciaRede() {
  const c = carregar();
  const total = c.concorrentes.length;
  const totalComparativos = c.comparativos.length;
  return { total, totalComparativos, ativos: c.concorrentes.filter(x => x.ativo).length };
}

module.exports = { cadastrarConcorrente, adicionarComparativoRede, listarConcorrentes, estatisticasConcorrenciaRede, carregar, salvar, ARQ };