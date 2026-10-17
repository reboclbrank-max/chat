// 🧠 EVOLUÇÃO DIÁRIA DO CHAT v3 — bateria rastreável, com amostras distintas e histórico público sanitizado.
// A régua mede o sistema de rotas, não "QI". Cada resposta só vale contra o gabarito público da própria questão; tenta 3 rodadas × 4 rotas de texto.
'use strict';
const fs = require('fs');

const ARQUIVO_SAUDE = 'saude-cerebro.md';
const ARQUIVO_HISTORICO = 'qualidade-historico.json';
const LIMITE_HISTORICO = 30;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function leJson(caminho, padrao) {
  try { return JSON.parse(fs.readFileSync(caminho, 'utf8')); } catch (e) { return padrao; }
}

function normalizaAmostra(valor, padrao = '') {
  const limpo = String(valor || '').toLowerCase().trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return limpo || padrao;
}

function numeroDaSemente(texto) {
  let n = 2166136261;
  for (const c of String(texto || '')) {
    n ^= c.charCodeAt(0);
    n = Math.imul(n, 16777619) >>> 0;
  }
  return n >>> 0;
}

// Em uma mesma amostra, cada questão aparece uma vez. A semente fica registrada para impedir
// que sucessivas execuções do mesmo dia pareçam evidência independente.
function selecionaQuestoes(banco, quantidade, amostra) {
  const itens = Array.isArray(banco) ? banco.slice() : [];
  let estado = numeroDaSemente(amostra);
  for (let i = itens.length - 1; i > 0; i--) {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    const j = estado % (i + 1);
    [itens[i], itens[j]] = [itens[j], itens[i]];
  }
  return itens.slice(0, Math.max(0, Math.min(Number(quantidade) || 0, itens.length)));
}

function agoraDaAmostra() {
  const hoje = new Date().toISOString().slice(0, 10);
  const escolhida = normalizaAmostra(process.env.EVOLUCAO_AMOSTRA);
  if (escolhida) return escolhida;
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    return normalizaAmostra('manual-' + (process.env.GITHUB_RUN_ID || Date.now()), 'manual-local');
  }
  return 'diaria-' + hoje;
}

function bateriaAnterior(texto) {
  return [...String(texto || '').matchAll(/—\s*(\d+)\/(\d+)/g)].map(m => ({ certo: Number(m[1]), total: Number(m[2]) }));
}

function escolheBanco() {
  let banco = JSON.parse(fs.readFileSync('banco-questoes.json', 'utf8')).questoes;
  let nivel = 1;
  try {
    const recentes = bateriaAnterior(fs.readFileSync(ARQUIVO_SAUDE, 'utf8'));
    if (recentes.length >= 3 && recentes.slice(0, 3).every(x => x.total && x.certo / x.total >= 0.9)) {
      banco = JSON.parse(fs.readFileSync('banco-v2.json', 'utf8')).questoes;
      nivel = 2;
    }
  } catch (e) {}
  return { banco, nivel };
}

const nm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function respostaAceita(resposta, gabarito) {
  const normalizada = nm(resposta);
  return (Array.isArray(gabarito) ? gabarito : []).some(g => {
    const esperado = nm(g);
    if (!esperado) return false;
    if (esperado.length <= 2) return new RegExp('(^| )' + esperado + '( |$)').test(normalizada);
    return normalizada.indexOf(esperado) >= 0;
  });
}

// Guarda anti-cota: uma mensagem de infraestrutura com HTTP 200 não conta como resposta.
const COTA_RE = /api key used for this request|(?:has|have) reached (?:its|your|the) (?:limit|quota)|too many requests|rate limit exceeded/i;
function textoUtil(t) {
  const s = String(t || '').trim();
  if (!s) return false;
  if (s.length < 300 && COTA_RE.test(s)) return false;
  return true;
}

async function rota(nome, url, corpo, bearer) {
  const headers = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = 'Bearer unused';
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(corpo), signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const c = ((((j.choices || [])[0] || {}).message || {}).content) || '';
  return textoUtil(c) ? c.trim() : null;
}

// Mantém a mesma família de rotas de texto do canal real. A bateria não deve declarar a casa muda
// antes de tentar uma reserva que o e-mail/Telegram efetivamente possuem.
function rotasTexto(conteudo) {
  return [
    ['frota', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, true],
    ['reserva', 'https://text.pollinations.ai/openai/chat/completions', { model: 'openai-fast', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, false],
    ['llm7', 'https://api.llm7.io/v1/chat/completions', { model: 'DeepSeek-V4-Flash-0731', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, true],
    ['omni', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, true]
  ];
}

async function pergunta(conteudo) {
  for (let rodada = 0; rodada < 3; rodada++) {
    for (const [nome, url, corpo, bearer] of rotasTexto(conteudo)) {
      try {
        const texto = await rota(nome, url, corpo, bearer);
        if (texto) return { texto, via: nome };
      } catch (e) {}
    }
    if (rodada < 2) await sleep(15000);
  }
  return null;
}

function atualizaHistorico(anterior, registro) {
  const baterias = Array.isArray(anterior && anterior.baterias) ? anterior.baterias : [];
  const semMesmaAmostra = baterias.filter(x => x && x.amostra !== registro.amostra);
  return {
    esquema: 'qualidade-chat-v1',
    atualizado_em: registro.quando,
    aviso: 'Histórico público sanitizado: IDs e placar, sem e-mails, destinos, respostas integrais ou segredos.',
    baterias: [registro].concat(semMesmaAmostra).slice(0, LIMITE_HISTORICO)
  };
}

function escreveSaude(linha) {
  let anterior = '';
  try { anterior = fs.readFileSync(ARQUIVO_SAUDE, 'utf8'); } catch (e) {}
  const linhasAnteriores = anterior.split('\n').filter(l => l.startsWith('- '));
  const curva = [linha].concat(linhasAnteriores).slice(0, 14).reverse().map(l => (l.split('— ')[1] || l).split(' · ')[0]).join(' | ');
  const corpo = [
    '# 🧠 SAÚDE DO CÉREBRO DO CHAT (bateria automática v3)',
    '',
    'Banco v1/v2 público · 10 questões por amostra · 3 rodadas × 3 rotas (frota→reserva→omni) · 🔇=infraestrutura muda, não erro de cérebro.',
    'Cada amostra tem identificador e IDs no `qualidade-historico.json`; reexecução da mesma amostra substitui o registro, não infla a evidência.',
    '',
    linha,
    ...linhasAnteriores.slice(0, 119),
    '',
    '**Curva (14 mais recentes):** ' + curva,
    ''
  ].join('\n');
  fs.writeFileSync(ARQUIVO_SAUDE, corpo);
}

async function executar() {
  const { banco, nivel } = escolheBanco();
  const amostra = agoraDaAmostra();
  const sorteadas = selecionaQuestoes(banco, 10, amostra);
  let certos = 0;
  let mudos = 0;
  const detalhes = [];
  const rotas = {};

  for (const item of sorteadas) {
    const r = await pergunta('Responda APENAS o que foi pedido, curtíssimo: ' + item.q);
    const resposta = r ? r.texto : '';
    if (!r) mudos++;
    const passou = respostaAceita(resposta, item.g);
    if (passou) certos++;
    if (r) rotas[r.via] = (rotas[r.via] || 0) + 1;
    detalhes.push((passou ? '✅' : (r ? '❌' : '🔇')) + (r ? ' [' + r.via + '] ' : ' ') + item.q.slice(0, 55) + ' → ' + (resposta || 'mudo').slice(0, 38).replace(/\n/g, ' '));
    await sleep(2000);
  }

  const quando = new Date().toISOString();
  const linha = '- ' + quando.slice(0, 16).replace('T', ' ') + ' UTC — ' + certos + '/' + sorteadas.length + ' (mudos: ' + mudos + ')' + (nivel === 2 ? ' · NÍVEL 2' : '') + ' · amostra: ' + amostra + ' · banco: v' + nivel + (certos === sorteadas.length ? ' ✨ PERFEITO' : '');
  const registro = {
    quando,
    amostra,
    banco: 'v' + nivel,
    ids: sorteadas.map(item => item.id),
    total: sorteadas.length,
    certos,
    mudos,
    rotas
  };
  escreveSaude(linha);
  fs.writeFileSync(ARQUIVO_HISTORICO, JSON.stringify(atualizaHistorico(leJson(ARQUIVO_HISTORICO, {}), registro), null, 2) + '\n');
  console.log('EXAME DO DIA v3:', certos + '/' + sorteadas.length + ' (mudos: ' + mudos + '; amostra: ' + amostra + ')');
  detalhes.forEach(d => console.log(d));
  return registro;
}

if (require.main === module) {
  executar().catch(erro => { console.error('EXAME FALHOU:', String(erro && erro.message || erro)); process.exitCode = 1; });
}

module.exports = { normalizaAmostra, selecionaQuestoes, bateriaAnterior, escolheBanco, atualizaHistorico, respostaAceita, textoUtil, rotasTexto, executar };
