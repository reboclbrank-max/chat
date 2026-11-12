// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 ANÁLISE DE CONCORRÊNCIA DE CONTEÚDO — comparação de temas e formatos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'concorrencia-conteudo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { conteudosConcorrentes: [], comparativos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarConteudoConcorrente(titulo, concorrente, rede, jogo, formato, engajamento, url) {
  const c = carregar();
  const id = 'cc_' + c.proximoId++;
  const cc = { id, titulo: titulo || '', concorrente: concorrente || '', rede: rede || 'todos', jogo: jogo || 'ambos', formato: formato || 'post', engajamento: Number(engajamento) || 0, url: url || '', ativo: true, criadoEm: new Date().toISOString() };
  c.conteudosConcorrentes.push(cc);
  salvar();
  return { ok: true, conteudo: cc };
}

function adicionarComparativoConteudo(metrica, nossoValor, valorConcorrente, vencedor, jogo) {
  const c = carregar();
  const id = 'ccc_' + c.proximoId++;
  const comp = { id, metrica, nossoValor: Number(nossoValor) || 0, valorConcorrente: Number(valorConcorrente) || 0, vencedor: vencedor || 'empate', jogo: jogo || 'ambos', diferenca: Math.abs(Number(nossoValor) - Number(valorConcorrente)), criadoEm: new Date().toISOString() };
  c.comparativos.push(comp);
  salvar();
  return { ok: true, comparativo: comp };
}

function listarConteudosConcorrentes(jogo = null, rede = null, concorrente = null) {
  const c = carregar();
  let l = c.conteudosConcorrentes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (concorrente) l = l.filter(x => x.concorrente === concorrente);
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasConcorrenciaConteudo() {
  const c = carregar();
  const total = c.conteudosConcorrentes.length;
  const totalComparativos = c.comparativos.length;
  return { total, totalComparativos, ativos: c.conteudosConcorrentes.filter(x => x.ativo).length };
}

module.exports = { registrarConteudoConcorrente, adicionarComparativoConteudo, listarConteudosConcorrentes, estatisticasConcorrenciaConteudo, carregar, salvar, ARQ };