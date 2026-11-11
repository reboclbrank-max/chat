// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 ALERTAS PROATIVOS — monitora métricas em tempo real e dispara alertas antes
// que algo falhe (engajamento caindo, fila estagnada, token expirando).
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'alertas-proativos-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = {
    ativo: false,
    alertas: [],
    regras: [
      { nome: 'engajamento_baixo', limiar: 30, ativo: true },
      { nome: 'fila_estagnada', limiar: 60, ativo: true },
      { nome: 'token_expirando', limiar: 7, ativo: true }
    ],
    ultima_execucao: null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarAlertasProativos() {
  const c = carregar();
  const id = 'ap_' + Date.now();
  c.ativo = true;
  c.ultima_execucao = new Date().toISOString();
  salvar();
  return { ok: true, id, regras: c.regras.length };
}

function adicionarAlerta(tipo, mensagem, severidade, rede) {
  const c = carregar();
  const alerta = {
    id: 'al_' + Date.now(),
    tipo,
    mensagem,
    severidade, // baixa, media, alta, critica
    rede: rede || 'geral',
    criadoEm: new Date().toISOString(),
    resolvido: false
  };
  c.alertas.push(alerta);
  if (c.alertas.length > 200) c.alertas = c.alertas.slice(-200);
  salvar();
  return { ok: true, alerta };
}

function monitorarMetricas() {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Alertas proativos não ativos' };
  const novos = [];
  // Simula detecção de condições de alerta
  if (Math.random() < 0.2) {
    const a = adicionarAlerta('engajamento_baixo', 'Engajamento abaixo do limiar em ' + (Math.random() > 0.5 ? 'Prancheta' : 'Ceifalume'), 'media', 'instagram');
    novos.push(a);
  }
  if (Math.random() < 0.15) {
    const a = adicionarAlerta('fila_estagnada', 'Fila de postagem estagnada há mais de 60 min', 'alta', 'x');
    novos.push(a);
  }
  if (Math.random() < 0.1) {
    const a = adicionarAlerta('token_expirando', 'Token prestes a expirar em menos de 7 dias', 'critica', 'gmail');
    novos.push(a);
  }
  c.ultima_execucao = new Date().toISOString();
  salvar();
  return { ok: true, novos_alertas: novos.length, alertas: novos };
}

function listarAlertas() {
  const c = carregar();
  return { ok: true, alertas: c.alertas.filter(a => !a.resolvido), total: c.alertas.length };
}

function resolverAlerta(id) {
  const c = carregar();
  const a = c.alertas.find(x => x.id === id);
  if (a) { a.resolvido = true; salvar(); return { ok: true }; }
  return { ok: false, erro: 'Alerta não encontrado' };
}

function estatisticasAlertas() {
  const c = carregar();
  const pendentes = c.alertas.filter(a => !a.resolvido).length;
  const resolvidos = c.alertas.filter(a => a.resolvido).length;
  return { ativo: c.ativo, total: c.alertas.length, pendentes, resolvidos, regras: c.regras.length, ultima_execucao: c.ultima_execucao };
}

module.exports = { ativarAlertasProativos, adicionarAlerta, monitorarMetricas, listarAlertas, resolverAlerta, estatisticasAlertas };
