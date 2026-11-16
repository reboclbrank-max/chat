// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 CICLO DE VIDA DO CLIENTE — rastreamento de estágios do cliente
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'ciclo-vida.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { clientes: [], transicoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarCliente(idUsuario, jogo, estagioInicial, dataCadastro) {
  const c = carregar();
  const id = 'cv_' + c.proximoId++;
  const cli = { id, idUsuario, jogo: jogo || 'ambos', estagioAtual: estagioInicial || 'lead', dataCadastro: dataCadastro || new Date().toISOString(), ativo: true, criacaoEm: new Date().toISOString() };
  c.clientes.push(cli);
  salvar();
  return { ok: true, cliente: cli };
}

function transicaoCicloVida(idUsuario, novoEstagio, jogo) {
  const c = carregar();
  const cli = c.clientes.find(x => x.idUsuario === idUsuario && x.jogo === jogo);
  if (!cli) return { ok: false, erro: 'Cliente não encontrado' };
  const id = 'tra_' + c.proximoId++;
  const t = { id, idUsuario, estagioAnterior: cli.estagioAtual, novoEstagio, jogo: jogo || 'ambos', dataTransicao: new Date().toISOString() };
  c.transicoes.push(t);
  cli.estagioAtual = novoEstagio;
  salvar();
  return { ok: true, transicao: t };
}

function listarClientes(jogo = null, estagio = null) {
  const c = carregar();
  let l = c.clientes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (estagio) l = l.filter(x => x.estagioAtual === estagio);
  return l.sort((a, b) => new Date(b.criacaoEm) - new Date(a.criacaoEm));
}

function estatisticasCicloVida() {
  const c = carregar();
  const total = c.clientes.length;
  const porEstagio = {};
  c.clientes.forEach(x => { porEstagio[x.estagioAtual] = (porEstagio[x.estagioAtual] || 0) + 1; });
  return { total, porEstagio, totalTransicoes: c.transicoes.length };
}

module.exports = { registrarCliente, transicaoCicloVida, listarClientes, estatisticasCicloVida, carregar, salvar, ARQ };