// 🆘 SOCORRO DA BARREIRA (degrau 2 da escada de autonomia, 04/11/2026)
//
// Quando a barreira de testes reprova, o socorro transforma a reprovação em DIAGNÓSTICO:
// qual job, qual passo, qual categoria e o link do run. O vigia lê isso e avisa o dono
// pelo canal que já existe (estado + e-mail). Quando a barreira fica verde, o item volta
// a saudável e o aviso de mudança acontece sozinho.
//
// O que ele NÃO faz, de propósito: não escreve código, não abre PR, não mescla, não
// religa nada e não inventa canal novo. Perceber e pedir é autonomia; decidir sozinho
// o que muda a casa não é.
//
// Por que não é uma issue: o repositório não tem Issues (has_issues = false, medido em
// 04/11 — a API devolve 410 Gone). O canal da casa é o ramo de estado que o vigia publica.
'use strict';

// Categorias fechadas. O estado público recebe só este código — nunca log, exceção,
// conteúdo de caixa ou URL autenticada.
const CATEGORIAS = Object.freeze([
  'teste-de-unidade', 'teste-de-navegador', 'sintaxe', 'dependencias',
  'bibliotecas', 'outra', 'desconhecida'
]);

function texto(valor) {
  return String(valor == null ? '' : valor).trim();
}

// Nome do job e do passo que falharam. Só isso já diz onde olhar, sem abrir log.
function resumeFalha(jobs) {
  const lista = Array.isArray(jobs) ? jobs : [];
  for (const job of lista) {
    if (!job || texto(job.conclusion) !== 'failure') continue;
    const passos = Array.isArray(job.steps) ? job.steps : [];
    const quebrado = passos.find(p => p && texto(p.conclusion) === 'failure');
    return {
      job: texto(job.name) || '(sem nome)',
      passo: quebrado ? (texto(quebrado.name) || '(sem nome)') : '(falhou antes de qualquer passo)'
    };
  }
  return null;
}

function categoriaDoPasso(passo) {
  const p = texto(passo).toLowerCase();
  if (!p) return 'desconhecida';
  if (p.includes('navegador')) return 'teste-de-navegador';
  if (p.includes('testes rápidos') || p.includes('testes rapidos')) return 'teste-de-unidade';
  if (p.includes('sintaxe')) return 'sintaxe';
  if (p.includes('depend')) return 'dependencias';
  if (p.includes('bibliotecas') || p.includes('pip')) return 'bibliotecas';
  if (p.includes('antes de qualquer passo')) return 'desconhecida';
  return 'outra';
}

// Traduz uma execução da barreira em diagnóstico fechado.
// Entrada: { conclusao, sha, runUrl, jobs }
// Saída:   { causa: 'barreira-vermelha' | 'saudavel' | 'indefinida', categoria, detalhe, evidencia }
function diagnosticoDaBarreira({ conclusao, sha, runUrl, jobs }) {
  const c = texto(conclusao).toLowerCase();
  const curto = texto(sha).slice(0, 10);
  if (c === 'success') {
    return { causa: 'saudavel', categoria: '', detalhe: 'barreira verde em ' + (curto || 'commit recente'), evidencia: 'barreira-verde' };
  }
  if (c !== 'failure') {
    return { causa: 'indefinida', categoria: 'desconhecida', detalhe: 'última execução da barreira em ' + (c || 'estado vazio'), evidencia: '' };
  }
  const falha = resumeFalha(jobs);
  const categoria = falha ? categoriaDoPasso(falha.passo) : 'desconhecida';
  const onde = falha ? falha.job + ' → ' + falha.passo : 'passo não identificado';
  return {
    causa: 'barreira-vermelha',
    categoria: CATEGORIAS.includes(categoria) ? categoria : 'outra',
    detalhe: 'barreira vermelha (' + (CATEGORIAS.includes(categoria) ? categoria : 'outra') + ') em '
      + (curto || 'commit recente') + ': ' + onde + (runUrl ? ' — ' + runUrl : ''),
    evidencia: ''
  };
}

// ---- CLI: diagnóstico de uma execução, só leitura (não cria, não comenta, não fecha) ----
async function principal() {
  const token = texto(process.env.GITHUB_TOKEN);
  const repo = texto(process.env.REPO) || 'reboclbrank-max/chat';
  const runId = texto(process.env.RUN_ID);
  if (!token || !runId) throw new Error('ambiente incompleto: falta GITHUB_TOKEN ou RUN_ID');

  const cabecalhos = {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + token,
    'User-Agent': 'socorro/1'
  };
  const busca = async caminho => {
    const r = await fetch('https://api.github.com/repos/' + repo + caminho, { headers: cabecalhos, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(caminho + ' -> HTTP ' + r.status);
    return r.json();
  };
  const run = await busca('/actions/runs/' + runId);
  const jobs = (await busca('/actions/runs/' + runId + '/jobs')).jobs || [];
  const d = diagnosticoDaBarreira({ conclusao: run.conclusion, sha: run.head_sha, runUrl: run.html_url, jobs });
  console.log('run ' + runId + ' · ' + (run.conclusion || run.status));
  console.log('  causa: ' + d.causa + ' · categoria: ' + (d.categoria || '-'));
  console.log('  detalhe: ' + d.detalhe);
  if (d.evidencia) console.log('  evidência: ' + d.evidencia);
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ socorro não concluiu: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = { resumeFalha, categoriaDoPasso, diagnosticoDaBarreira, CATEGORIAS };
