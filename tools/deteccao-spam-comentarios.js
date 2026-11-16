// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ DETECÇÃO DE SPAM EM COMENTÁRIOS — filtro automático de spam
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'spam-comentarios.json');

const PALAVRAS_SPAM = ['ganhe dinheiro', 'clique aqui', 'ganhe r$', 'grátis', 'promoção imperdível', 'ganhe agora', 'dinheiro fácil', 'renda extra', 'trabalhe em casa', 'bitcoin grátis'];

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { analises: [], palavrasBloqueadas: [...PALAVRAS_SPAM], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function analisarComentario(texto, rede, jogo, autor) {
  const c = carregar();
  const id = 'spam_' + c.proximoId++;
  const t = texto.toLowerCase();
  let pontuacao = 0;
  const palavrasEncontradas = [];
  for (const p of c.palavrasBloqueadas) {
    if (t.includes(p)) { pontuacao += 10; palavrasEncontradas.push(p); }
  }
  const ehSpam = pontuacao >= 20;
  const a = { id, texto, ehSpam, pontuacao, palavrasEncontradas, rede: rede || 'todos', jogo: jogo || 'ambos', autor: autor || '', criadoEm: new Date().toISOString() };
  c.analises.push(a);
  salvar();
  return { ok: true, analise: a };
}

function adicionarPalavraBloqueada(palavra) {
  const c = carregar();
  if (!c.palavrasBloqueadas.includes(palavra)) c.palavrasBloqueadas.push(palavra);
  salvar();
  return { ok: true, palavrasBloqueadas: c.palavrasBloqueadas };
}

function listarAnalises(ehSpam = null, jogo = null) {
  const c = carregar();
  let l = c.analises;
  if (ehSpam !== null) l = l.filter(x => x.ehSpam === ehSpam);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasSpam() {
  const c = carregar();
  const total = c.analises.length;
  const spam = c.analises.filter(x => x.ehSpam).length;
  return { total, spam, naoSpam: total - spam, palavrasBloqueadas: c.palavrasBloqueadas.length };
}

module.exports = { analisarComentario, adicionarPalavraBloqueada, listarAnalises, estatisticasSpam, carregar, salvar, ARQ };