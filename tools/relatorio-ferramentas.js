// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ RELATÓRIO DE FERRAMENTAS — controle de custos de ferramentas de marketing
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-ferramentas.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ferramentas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarFerramenta(nome, jogo, custoMensal, categoria, status) {
  const c = carregar();
  const id = 'fer_' + c.proximoId++;
  const f = { id, nome: nome || '', jogo: jogo || 'ambos', custoMensal: Number(custoMensal) || 0, categoria: categoria || 'ferramenta', status: status || 'ativa', criadoEm: new Date().toISOString() };
  c.ferramentas.push(f);
  salvar();
  return { ok: true, ferramenta: f };
}

function listarFerramentas(jogo = null, status = null) {
  const c = carregar();
  let l = c.ferramentas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => b.custoMensal - a.custoMensal);
}

function estatisticasFerramentas() {
  const c = carregar();
  const total = c.ferramentas.length;
  const totalCusto = c.ferramentas.reduce((s, f) => s + f.custoMensal, 0);
  return { total, totalCustoMensal: totalCusto, ativas: c.ferramentas.filter(x => x.status === 'ativa').length };
}

module.exports = { registrarFerramenta, listarFerramentas, estatisticasFerramentas, carregar, salvar, ARQ };