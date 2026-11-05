// 🌓 MODO SOMBRA — o degrau 4 decidindo de mentira, para valer de verdade depois.
//
// A ideia: antes de dar à máquina o direito de mesclar código, medir o julgamento dela.
// A cada PR que passa pela barreira, o sombra responde duas perguntas e NÃO faz nada:
//
//   1. "com o nível de hoje (texto), eu mesclaria?"        → é o que o mesclador já faz.
//   2. "se o degrau 4 estivesse ligado, eu mesclaria?"     → o que queremos medir.
//
// A segunda é respondida com uma faixa HIPOTÉTICA: entra todo arquivo que não é essencial.
// Assim o registro mostra, com o tempo, quantas PRs de código teriam entrado sozinhas, quais
// seriam barradas pelo mapa de risco e — o número que decide tudo — quantas dessas foram
// seguidas de main vermelha.
//
// Nada aqui escreve na main, abre PR ou mescla. O registro vai para um ramo próprio.
'use strict';

const { avalia } = require('./mesclador-estreito.js');
const { classificar, ESSENCIAL } = require('./risco-de-arquivo.js');

function texto(valor) {
  return String(valor == null ? '' : valor).trim();
}

// Faixa hipotética do degrau 4: tudo que NÃO está na lista do que pode calar a casa.
// Código desconhecido entra no exercício de propósito: é exatamente ele que o degrau 4
// enfrentaria, e é sobre ele que precisamos de número. Continua barrado na vida real.
function dentroDaFaixaHipotetica(caminho) {
  const c = classificar(caminho);
  return c.categoria !== ESSENCIAL || c.duro === false;
}

// Vereditos do sombra para uma PR. Função pura: recebe dados, devolve decisão.
function vereditoSombra({ pr, arquivos } = {}) {
  const lista = (Array.isArray(arquivos) ? arquivos : []).map(a => texto(a && (a.filename || a.caminho))).filter(Boolean);
  const dadosDaPr = { numero: (pr && pr.numero) || 0, estado: (pr && pr.estado) || 'open', rascunho: Boolean(pr && pr.rascunho), deFork: Boolean(pr && pr.deFork) };

  const hoje = avalia({ pr: dadosDaPr, arquivos: lista.map(f => ({ filename: f })), nivel: 'texto' });
  const essenciais = lista.filter(f => !dentroDaFaixaHipotetica(f));
  const hipotetico = essenciais.length
    ? { decidiria: 'recusar', motivo: 'fora até da faixa hipotética: ' + essenciais.slice(0, 3).join(', ') }
    : { decidiria: 'mesclar', motivo: 'só arquivos não essenciais (' + lista.length + ')' };

  return {
    hoje: { decidiria: hoje.pode ? 'mesclar' : 'recusar', motivo: hoje.motivo },
    degrau4: hipotetico,
    essenciais,
    arquivos: lista
  };
}

// Um registro é o retrato de uma PR no momento em que a barreira terminou.
function registroDe({ quando, pr, sha, titulo, arquivos, barreira, veredito } = {}) {
  const v = veredito || vereditoSombra({ pr, arquivos });
  return {
    quando: texto(quando),
    pr: Number((pr && pr.numero) || 0),
    sha: texto(sha).slice(0, 40),
    mesclada: Boolean((pr || {}).mesclada),
    mergeSha: texto((pr || {}).mergeSha).slice(0, 40) || null,
    titulo: texto(titulo).slice(0, 120),
    barreira: texto(barreira) || 'desconhecida',
    arquivos: v.arquivos.slice(0, 40),
    essenciais: v.essenciais.slice(0, 10),
    hoje: v.hoje,
    degrau4: v.degrau4
  };
}

// Resumo do que o sombra viu até agora. Puro: recebe registros, devolve números.
function resumoDoRegistro(registros) {
  const lista = (Array.isArray(registros) ? registros : []).filter(r => r && typeof r === 'object');
  const total = lista.length;
  const verdes = lista.filter(r => r.barreira === 'success').length;
  const mesclariaDegrau4 = lista.filter(r => r.degrau4 && r.degrau4.decidiria === 'mesclar');
  const bloqueadasPorEssencial = lista.filter(r => r.degrau4 && r.degrau4.decidiria === 'recusar');
  const contagem = {};
  for (const r of bloqueadasPorEssencial) {
    for (const a of r.essenciais || []) contagem[a] = (contagem[a] || 0) + 1;
  }
  const maisFrequentes = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return {
    total,
    verdes,
    vermelhas: total - verdes,
    mesclariaDegrau4: mesclariaDegrau4.length,
    bloqueadasPorEssencial: bloqueadasPorEssencial.length,
    essenciaisMaisFrequentes: maisFrequentes,
    taxaQueODegrau4Aceitaria: total ? mesclariaDegrau4.length / total : 0
  };
}

// ---- rede (só o CLI usa) ----------------------------------------------------------
const RAMO = 'sombra/registro';
const PASTA = 'registros';

async function api(rota, { token, metodo = 'GET', corpo } = {}) {
  const resposta = await fetch('https://api.github.com' + rota, {
    method: metodo,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'sombra/1',
      'Content-Type': 'application/json'
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  const vazio = resposta.status === 204;
  const dados = vazio ? {} : await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(rota + ' -> HTTP ' + resposta.status + ' ' + texto(dados.message).slice(0, 120));
  return dados;
}

async function garantirRamo({ token, repo }) {
  const existe = await api('/repos/' + repo + '/git/ref/heads/' + encodeURIComponent(RAMO), { token }).catch(() => null);
  if (existe) return;
  const base = await api('/repos/' + repo + '/branches/main', { token });
  await api('/repos/' + repo + '/git/refs', {
    token, metodo: 'POST',
    corpo: { ref: 'refs/heads/' + RAMO, sha: base.commit.sha }
  }).catch(() => {});
}

async function decidir({ token, repo, sha, conclusaoBarreira }) {
  const abertas = await api('/repos/' + repo + '/pulls?state=all&per_page=50', { token });
  const alvo = (Array.isArray(abertas) ? abertas : []).find(p => texto(p.head && p.head.sha) === texto(sha));
  if (!alvo) { console.log('sombra: nenhuma PR para ' + texto(sha).slice(0, 10) + ' — nada a registrar'); return null; }
  const arquivos = await api('/repos/' + repo + '/pulls/' + alvo.number + '/files?per_page=100', { token });
  const registro = registroDe({
    quando: new Date().toISOString(),
    pr: {
      numero: alvo.number, estado: alvo.state, rascunho: alvo.draft,
      deFork: Boolean(alvo.head && alvo.head.repo && alvo.head.repo.full_name !== repo),
      mesclada: Boolean(alvo.merged_at),
      mergeSha: alvo.merge_commit_sha || null
    },
    sha: alvo.head.sha,
    titulo: alvo.title,
    arquivos,
    barreira: conclusaoBarreira
  });
  await garantirRamo({ token, repo });
  const nome = PASTA + '/' + registro.quando.replace(/[:.]/g, '-') + '-' + alvo.number + '.json';
  await api('/repos/' + repo + '/contents/' + nome, {
    token, metodo: 'PUT',
    corpo: {
      message: 'sombra: registro da PR #' + alvo.number + ' (nao altera nada)',
      content: Buffer.from(JSON.stringify(registro, null, 2) + '\n').toString('base64'),
      branch: RAMO
    }
  });
  console.log('sombra: registrado #' + alvo.number + ' — hoje ' + registro.hoje.decidiria + ', degrau 4 ' + registro.degrau4.decidiria);
  return registro;
}

async function ler({ token, repo }) {
  const itens = await api('/repos/' + repo + '/contents/' + PASTA + '?ref=' + encodeURIComponent(RAMO), { token }).catch(() => null);
  if (!Array.isArray(itens)) { console.log('sombra: nenhum registro ainda'); return { total: 0 }; }
  const registros = [];
  for (const item of itens.slice(-200)) {
    const conteudo = await api('/repos/' + repo + '/contents/' + item.path + '?ref=' + encodeURIComponent(RAMO), { token }).catch(() => null);
    if (conteudo && conteudo.content) {
      try { registros.push(JSON.parse(Buffer.from(conteudo.content, 'base64').toString('utf8'))); } catch (e) {}
    }
  }
  const resumo = resumoDoRegistro(registros);
  console.log('🌓 Modo sombra — ' + resumo.total + ' registro(s)');
  console.log('   barreira verde: ' + resumo.verdes + ' · vermelha: ' + resumo.vermelhas);
  console.log('   o degrau 4 teria mesclado: ' + resumo.mesclariaDegrau4 + ' (' + Math.round(resumo.taxaQueODegrau4Aceitaria * 100) + '%)');
  console.log('   barradas por arquivo essencial: ' + resumo.bloqueadasPorEssencial);
  if (resumo.essenciaisMaisFrequentes.length) {
    console.log('   essenciais mais vistos: ' + resumo.essenciaisMaisFrequentes.map(([a, n]) => a + ' (' + n + ')').join(', '));
  }
  return resumo;
}

async function principal() {
  const token = texto(process.env.GITHUB_TOKEN);
  const repo = texto(process.env.REPO) || 'reboclbrank-max/chat';
  const modo = texto(process.argv[2] || process.env.MODO).toLowerCase();
  if (!token) throw new Error('falta GITHUB_TOKEN');
  if (modo === 'decidir') return decidir({ token, repo, sha: texto(process.env.HEAD_SHA), conclusaoBarreira: texto(process.env.BARREIRA) });
  if (modo === 'ler') return ler({ token, repo });
  throw new Error('modo desconhecido: ' + (modo || '(vazio)') + ' — use decidir ou ler');
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ sombra não concluiu: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = { dentroDaFaixaHipotetica, vereditoSombra, registroDe, resumoDoRegistro, RAMO, PASTA };
