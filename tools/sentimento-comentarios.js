// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 😊 ANÁLISE DE SENTIMENTO DE COMENTÁRIOS — classifica comentários das redes
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'sentimento-comentarios.json');

const POSITIVAS = ['gosto', 'adorei', 'excelente', 'incrível', 'show', 'top', 'legal', 'bom', 'ótimo', 'maravilhoso', 'fantástico', 'perfeito', 'amei', 'recomendo'];
const NEGATIVAS = ['odeio', 'péssimo', 'ruim', 'horrível', 'detesto', 'lento', 'bug', 'erro', 'falha', 'decepção', 'triste', 'raiva', 'pior', 'não gosto', 'odiei'];

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { analises: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function analisarSentimento(texto, rede, jogo, autor) {
  const c = carregar();
  const t = texto.toLowerCase();
  let pos = 0, neg = 0;
  for (const p of POSITIVAS) if (t.includes(p)) pos++;
  for (const n of NEGATIVAS) if (t.includes(n)) neg++;
  let sentimento = 'neutro';
  if (pos > neg) sentimento = 'positivo';
  else if (neg > pos) sentimento = 'negativo';
  const id = 'sent_' + c.proximoId++;
  const a = { id, texto, sentimento, pos, neg, rede: rede || 'todos', jogo: jogo || 'ambos', autor: autor || '', criadoEm: new Date().toISOString() };
  c.analises.push(a);
  salvar();
  return { ok: true, analise: a };
}

function listarAnalises(sentimento = null, jogo = null) {
  const c = carregar();
  let l = c.analises;
  if (sentimento) l = l.filter(x => x.sentimento === sentimento);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l;
}

function estatisticasSentimento() {
  const c = carregar();
  const total = c.analises.length;
  const pos = c.analises.filter(x => x.sentimento === 'positivo').length;
  const neg = c.analises.filter(x => x.sentimento === 'negativo').length;
  const neu = c.analises.filter(x => x.sentimento === 'neutro').length;
  return { total, positivo: pos, negativo: neg, neutro: neu };
}

module.exports = { analisarSentimento, listarAnalises, estatisticasSentimento, carregar, salvar, ARQ };