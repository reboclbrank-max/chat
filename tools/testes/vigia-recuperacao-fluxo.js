// Fluxo isolado do vigia: uma pane simultânea de turno/caixa não pode virar rajada de dispatches.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '../..');
const fonte = fs.readFileSync(path.join(raiz, 'tools/vigia-casa.js'), 'utf8');
const estadoVigia = require('../vigia-estado');

async function executa(estadoInicial, configuracao = {}) {
  const escritos = [];
  const dispatches = [];
  const agora = new Date().toISOString();
  const token = Object.prototype.hasOwnProperty.call(configuracao, 'token') ? configuracao.token : 'controle-inerte';
  const emailRuns = Object.prototype.hasOwnProperty.call(configuracao, 'emailRuns') ? configuracao.emailRuns : [];
  const exameRuns = Object.prototype.hasOwnProperty.call(configuracao, 'exameRuns') ? configuracao.exameRuns : [{ created_at: agora }];
  const sitePostRuns = Object.prototype.hasOwnProperty.call(configuracao, 'sitePostRuns') ? configuracao.sitePostRuns :
    [{ status: 'completed', conclusion: 'success', event: 'schedule', created_at: agora, updated_at: agora }];
  const resposta = (corpo = {}, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
    text: async () => 'x'.repeat(100001)
  });
  const fetchFalso = async (url, requisicao = {}) => {
    if (/\/dispatches$/.test(url)) {
      dispatches.push({ url, metodo: requisicao.method, corpo: requisicao.body });
      return resposta({}, 204);
    }
    if (url === 'https://reboclbrank-max.github.io/chat/') return resposta();
    if (url === 'https://reboclbrank-max.github.io/site/') return resposta();
    if (url.includes('/repos/reboclbrank-max/site/commits?')) {
      return resposta([{ commit: { committer: { date: agora } } }]);
    }
    if (url.includes('/repos/reboclbrank-max/site/actions/workflows/postagem-diaria.yml/runs?')) {
      return resposta({ workflow_runs: sitePostRuns });
    }
    if (url.includes('/actions/workflows/email.yml/runs?')) {
      if (configuracao.falhaApiEmail) throw new Error('API de e-mail indisponível no isolamento');
      return resposta({ workflow_runs: emailRuns });
    }
    if (url.includes('/actions/workflows/evolucao.yml/runs?')) {
      if (configuracao.falhaApiExame) throw new Error('API de exame indisponível no isolamento');
      return resposta({ workflow_runs: exameRuns });
    }
    if (/rebocl-brank\.itch\.io\/(ceifalume|prancheta)$/.test(url)) return resposta();
    throw new Error('URL inesperada no isolamento: ' + url);
  };
  const fsFalso = {
    readFileSync: () => JSON.stringify(estadoInicial),
    writeFileSync: (_arquivo, conteudo) => {
      if (configuracao.falhaEscrita) throw new Error('persistência indisponível no isolamento');
      escritos.push(JSON.parse(conteudo));
    }
  };
  const processo = { env: { GITHUB_TOKEN: token }, argv: [] };
  const contexto = {
    require: (nome) => {
      if (nome === 'fs') return fsFalso;
      if (nome === './vigia-estado') return estadoVigia;
      // O teste deliberadamente não fornece SMTP/IMAP: a caixa falha de modo controlado.
      if (nome === 'nodemailer') throw new Error('nodemailer indisponível no isolamento');
      if (nome === 'imapflow') throw new Error('imapflow não deve ser carregado sem credenciais');
      throw new Error('require inesperado: ' + nome);
    },
    process: processo,
    fetch: fetchFalso,
    AbortSignal,
    Date,
    JSON,
    Math,
    Object,
    String,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    console: { log: () => {}, warn: () => {}, error: () => {} }
  };
  const resultado = vm.runInNewContext(fonte, contexto, { filename: 'vigia-casa-isolado.js' });
  await Promise.resolve(resultado);
  return { escritos, dispatches, exitCode: processo.exitCode };
}

(async () => {
  const inicial = { verificado_em: '2026-10-19T00:00:00.000Z', itens: {} };
  const primeira = await executa(inicial);
  assert.equal(primeira.dispatches.length, 1, 'turno e caixa falhos devem gerar só um dispatch');
  assert.match(primeira.dispatches[0].url, /\/email\.yml\/dispatches$/);
  assert.equal(primeira.dispatches[0].metodo, 'POST');
  assert.equal(primeira.escritos.length, 1, 'primeira tentativa deve persistir o freio');
  const aposPrimeira = primeira.escritos[0];
  assert.deepEqual(Object.keys(aposPrimeira.recuperacoes || {}), ['email']);
  assert.match(aposPrimeira.recuperacoes.email.ultima_tentativa_em, /^\d{4}-\d\d-\d\dT/);
  assert.equal(aposPrimeira.itens['Casa postando (site)'].evidencia, 'postagem-agendada-recente',
    'sucesso recente do workflow só vira evidência técnica fechada');

  const estadoCorrompido = await executa(null);
  assert.equal(estadoCorrompido.exitCode, undefined, 'estado público inválido deve ser reconstruído, não derrubar o vigia');
  assert.equal(estadoCorrompido.escritos.length, 1, 'estado reconstruído deve gerar nova fotografia');
  assert.equal(estadoCorrompido.escritos[0].itens['Página do chat'].ok, true);

  const semToken = await executa(inicial, { token: '' });
  assert.equal(semToken.dispatches.length, 0, 'sem token não há dispatch a fingir como recuperação');
  assert.equal(semToken.escritos.length, 1, 'a falha ainda fica observável sem token');
  assert.equal(Object.prototype.hasOwnProperty.call(semToken.escritos[0], 'recuperacoes'), false,
    'freio só é gravado depois de tentativa real de dispatch');

  const execucaoFalha = await executa(inicial, {
    emailRuns: [{ status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() }]
  });
  assert.equal(execucaoFalha.dispatches.length, 0, 'execução concluída com falha não recebe re-dispatch cego');
  assert.equal(execucaoFalha.escritos[0].itens['Chat por e-mail (24h)'].causa, 'execucao-falhou');
  assert.equal(Object.prototype.hasOwnProperty.call(execucaoFalha.escritos[0], 'recuperacoes'), false);

  const duplicados = await executa(inicial, {
    emailRuns: [
      { status: 'in_progress', created_at: new Date().toISOString() },
      { status: 'in_progress', created_at: new Date().toISOString() }
    ]
  });
  assert.equal(duplicados.dispatches.length, 0, 'turnos duplicados não são cancelados, reiniciados ou substituídos');
  assert.equal(duplicados.escritos[0].itens['Chat por e-mail (24h)'].causa, 'turnos-duplicados');
  assert.equal(Object.prototype.hasOwnProperty.call(duplicados.escritos[0], 'recuperacoes'), false,
    'duplicidade não entra na família automática de recuperação');

  const apiIndisponivel = await executa(inicial, { falhaApiEmail: true });
  assert.equal(apiIndisponivel.dispatches.length, 0, 'API indisponível não autoriza dispatch às cegas');
  assert.equal(apiIndisponivel.escritos[0].itens['Chat por e-mail (24h)'].causa, 'api-indisponivel');

  const filaEstagnada = await executa(inicial, {
    emailRuns: [{ status: 'queued', created_at: new Date(Date.now() - 31 * 60 * 1000).toISOString() }]
  });
  assert.equal(filaEstagnada.dispatches.length, 0, 'fila congestionada não recebe mais trabalho automaticamente');
  assert.equal(filaEstagnada.escritos[0].itens['Chat por e-mail (24h)'].causa, 'fila-estagnada');

  const postadorAtrasado = await executa(inicial, {
    sitePostRuns: [{ status: 'completed', conclusion: 'success', created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() }]
  });
  assert.equal(postadorAtrasado.escritos[0].itens['Casa postando (site)'].causa, 'postagem-atrasada');
  assert.equal(postadorAtrasado.dispatches.some(d => /reboclbrank-max\/site\//.test(d.url)), false,
    'cadência atrasada fica explícita, sem tentar publicar ou despachar o site');

  const postadorFalhou = await executa(inicial, {
    sitePostRuns: [
      { status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() },
      { status: 'completed', conclusion: 'success', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() }
    ]
  });
  assert.equal(postadorFalhou.escritos[0].itens['Casa postando (site)'].causa, 'execucao-falhou');
  assert.equal(postadorFalhou.dispatches.some(d => /reboclbrank-max\/site\//.test(d.url)), false,
    'falha do postador também não autoriza recuperação cega');

  const falhaExame = await executa(inicial, {
    emailRuns: [{ status: 'in_progress', created_at: new Date().toISOString() }],
    exameRuns: [{ status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() }]
  });
  assert.equal(falhaExame.dispatches.length, 0, 'bateria que falhou não recebe re-dispatch cego');
  assert.equal(falhaExame.escritos[0].itens['Bateria do cérebro'].causa, 'execucao-falhou');

  const segunda = await executa(aposPrimeira);
  assert.equal(segunda.dispatches.length, 0, 'segunda sonda dentro do intervalo não pode re-disparar');
  assert.equal(segunda.escritos.length, 1, 'segunda falha só consolida o limiar 2/2');
  const aposSegunda = segunda.escritos[0];
  assert.equal(aposSegunda.itens['Chat por e-mail (24h)'].falhas, 2);
  assert.equal(aposSegunda.itens['Caixa de e-mail'].falhas, 2);

  const terceira = await executa(aposSegunda);
  assert.equal(terceira.dispatches.length, 0, 'pane persistente continua contida');
  assert.equal(terceira.escritos.length, 0, 'estado 2/2 estável não deve gerar commit a cada 15 min');

  const persistenciaFalha = await executa(inicial, { falhaEscrita: true });
  assert.equal(persistenciaFalha.exitCode, 1, 'falha fatal de persistência deve reprovar o workflow');
  console.log('✔ fluxo isolado contém recuperação duplicada, ruído, dispatch cego e falso verde fatal');
})().catch((erro) => {
  console.error('✘ fluxo isolado da recuperação — ' + (erro && (erro.stack || erro.message) || erro));
  process.exitCode = 1;
});
