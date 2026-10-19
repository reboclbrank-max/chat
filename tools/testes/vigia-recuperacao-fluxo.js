// Fluxo isolado do vigia: uma pane simultânea de turno/caixa não pode virar rajada de dispatches.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '../..');
const fonte = fs.readFileSync(path.join(raiz, 'tools/vigia-casa.js'), 'utf8');
const estadoVigia = require('../vigia-estado');

async function executa(estadoInicial, token = 'controle-inerte') {
  const escritos = [];
  const dispatches = [];
  const agora = new Date().toISOString();
  const resposta = (corpo = {}, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
    text: async () => 'x'.repeat(100001)
  });
  const fetchFalso = async (url, opcoes = {}) => {
    if (/\/dispatches$/.test(url)) {
      dispatches.push({ url, metodo: opcoes.method, corpo: opcoes.body });
      return resposta({}, 204);
    }
    if (url === 'https://reboclbrank-max.github.io/chat/') return resposta();
    if (url === 'https://reboclbrank-max.github.io/site/') return resposta();
    if (url.includes('/repos/reboclbrank-max/site/commits?')) {
      return resposta([{ commit: { committer: { date: agora } } }]);
    }
    if (url.includes('/actions/workflows/email.yml/runs?')) return resposta({ workflow_runs: [] });
    if (url.includes('/actions/workflows/evolucao.yml/runs?')) return resposta({ workflow_runs: [{ created_at: agora }] });
    if (/rebocl-brank\.itch\.io\/(ceifalume|prancheta)$/.test(url)) return resposta();
    throw new Error('URL inesperada no isolamento: ' + url);
  };
  const fsFalso = {
    readFileSync: () => JSON.stringify(estadoInicial),
    writeFileSync: (_arquivo, conteudo) => escritos.push(JSON.parse(conteudo))
  };
  const contexto = {
    require: (nome) => {
      if (nome === 'fs') return fsFalso;
      if (nome === './vigia-estado') return estadoVigia;
      // O teste deliberadamente não fornece SMTP/IMAP: a caixa falha de modo controlado.
      if (nome === 'nodemailer') throw new Error('nodemailer indisponível no isolamento');
      if (nome === 'imapflow') throw new Error('imapflow não deve ser carregado sem credenciais');
      throw new Error('require inesperado: ' + nome);
    },
    process: { env: { GITHUB_TOKEN: token }, argv: [], exit: () => {} },
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
    console: { log: () => {}, error: () => {} }
  };
  const resultado = vm.runInNewContext(fonte, contexto, { filename: 'vigia-casa-isolado.js' });
  await Promise.resolve(resultado);
  return { escritos, dispatches };
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

  const semToken = await executa(inicial, '');
  assert.equal(semToken.dispatches.length, 0, 'sem token não há dispatch a fingir como recuperação');
  assert.equal(semToken.escritos.length, 1, 'a falha ainda fica observável sem token');
  assert.equal(Object.prototype.hasOwnProperty.call(semToken.escritos[0], 'recuperacoes'), false,
    'freio só é gravado depois de tentativa real de dispatch');

  const segunda = await executa(aposPrimeira);
  assert.equal(segunda.dispatches.length, 0, 'segunda sonda dentro do intervalo não pode re-disparar');
  assert.equal(segunda.escritos.length, 1, 'segunda falha só consolida o limiar 2/2');
  const aposSegunda = segunda.escritos[0];
  assert.equal(aposSegunda.itens['Chat por e-mail (24h)'].falhas, 2);
  assert.equal(aposSegunda.itens['Caixa de e-mail'].falhas, 2);

  const terceira = await executa(aposSegunda);
  assert.equal(terceira.dispatches.length, 0, 'pane persistente continua contida');
  assert.equal(terceira.escritos.length, 0, 'estado 2/2 estável não deve gerar commit a cada 15 min');
  console.log('✔ fluxo isolado contém recuperação duplicada e ruído de estado durante pane persistente');
})().catch((erro) => {
  console.error('✘ fluxo isolado da recuperação — ' + (erro && (erro.stack || erro.message) || erro));
  process.exitCode = 1;
});
