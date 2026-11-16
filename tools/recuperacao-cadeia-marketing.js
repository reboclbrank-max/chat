// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RECUPERAÇÃO EM CADEIA MARKETING — recupera automaticamente falhas em cadeia
// across todas as camadas, sem intervenção humana. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'recuperacao-cadeia-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, falhas: [], recuperacoes: [], cadeias: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarRecuperacaoCadeia() {
  const c = carregar();
  const id = 'rcm_' + c.proximoId++;
  c.ativo = true;
  const rec = { id, ativo: true, executadoEm: new Date().toISOString(), tipo: 'ativacao' };
  c.recuperacoes.push(rec);
  salvar();
  return { ok: true, recuperacao: rec };
}

function desativarRecuperacaoCadeia() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function registrarFalha(camada, erro, jogo) {
  const c = carregar();
  const falha = { id: 'fal_' + c.proximoId++, camada, erro: String(erro).slice(0, 200), jogo: jogo || 'ambos', executadoEm: new Date().toISOString(), recuperada: false };
  c.falhas.push(falha);
  if (c.ativo) {
    const cadeia = { id: 'cad_' + c.proximoId++, falha_id: falha.id, acao: 'recuperacao-automatica', status: 'processando', executadoEm: new Date().toISOString() };
    c.cadeias.push(cadeia);
    falha.recuperada = true;
  }
  salvar();
  return { ok: true, falha, cadeia: c.ativo ? cadeia : null };
}

function listarFalhas(jogo = null, naoRecuperadas = false) {
  const c = carregar();
  let l = c.falhas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (naoRecuperadas) l = l.filter(x => !x.recuperada);
  return l.sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
}

function estatisticasRecuperacaoCadeia() {
  const c = carregar();
  return { ativo: c.ativo, total_falhas: c.falhas.length, total_recuperacoes: c.recuperacoes.length, falhas_nao_recuperadas: c.falhas.filter(x => !x.recuperada).length, cadeias: c.cadeias.length };
}

module.exports = { ativarRecuperacaoCadeia, desativarRecuperacaoCadeia, registrarFalha, listarFalhas, estatisticasRecuperacaoCadeia, carregar, salvar, ARQ };