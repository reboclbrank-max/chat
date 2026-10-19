// Regressão do vigia: a própria checagem de e-mail não pode ficar presa em IMAP indefinidamente.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const fonte = fs.readFileSync(path.join(raiz, 'tools/vigia-casa.js'), 'utf8');
const workflow = fs.readFileSync(path.join(raiz, '.github/workflows/vigia.yml'), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('sonda IMAP do vigia tem tetos para conexão, trava, busca, leitura e logout', () => {
  assert.match(fonte, /const comTeto\s*=/);
  for (const etapa of ['comTeto(cli.connect(), 45000', "comTeto(cli.getMailboxLock('INBOX'), 30000", 'comTeto(cli.search({ seen: false }), 30000', 'comTeto(cli.fetchOne(alvo[0], { envelope: true }), 30000', 'comTeto(cli.logout(), 15000']) {
    assert(fonte.includes(etapa), etapa + ' sem teto');
  }
});
ok('workflow do vigia tem teto global de execução', () => {
  assert.match(workflow, /vigia:\n\s+runs-on: ubuntu-24\.04\n\s+timeout-minutes: 15\n/);
});
ok('workflow serializa vigias para não disputar IMAP e estado', () => {
  assert.match(workflow, /concurrency:\n\s+group: vigia-casa\n\s+cancel-in-progress: false/);
});
ok('sondas da API GitHub usam o token só no cabeçalho da própria API', () => {
  const trecho = fonte.slice(fonte.indexOf('async function buscaJSON'), fonte.indexOf('async function verifica'));
  assert(trecho.includes("if (TOKEN && /^https:\\/\\/api\\.github\\.com\\//.test(url))"));
  assert(trecho.includes("headers.Authorization = 'Bearer ' + TOKEN"));
  assert(trecho.includes('fetch(url, { headers,'));
  assert(!/console\.log\([^\n]*TOKEN/.test(trecho), 'a sonda não pode registrar o token');
});
ok('cron cobre todos os quartos de hora sem corrente que exceda o job', () => {
  assert.match(workflow, /cron: '12,27,42,57 \* \* \* \*'/);
  assert(!/VIGIA_CADEIA|VIGIA_CADEIA_MIN/.test(workflow), 'workflow não deve pedir corrente interna');
  assert(!/setTimeout\(r, min \* 60 \* 1000\)/.test(fonte), 'vigia não pode dormir a corrente dentro do teto de 15 min');
  assert.match(fonte, /A cadência pertence ao cron de 15 min/);
});
ok('recuperação automática tem freio persistido e não faz rajada do mesmo turno', () => {
  assert.match(fonte, /registrosDeRecuperacao\(antigo\.recuperacoes\)/);
  assert.match(fonte, /recuperacaoPermitida\(recuperacoes, chave, referencia\)/);
  assert.match(fonte, /recuperacoes = registraRecuperacao\(recuperacoes, chave, referencia\)/);
  assert.match(fonte, /if \(Object\.keys\(recuperacoes\)\.length\) estado\.recuperacoes = recuperacoes/);
  const tentativasEmail = fonte.match(/tentaRecuperar\('email'/g) || [];
  assert.equal(tentativasEmail.length, 2, 'turno e caixa devem dividir a mesma família email');
  assert.match(fonte, /recuperação já tentada no intervalo seguro/);
  assert.match(fonte, /Math\.min\(2, \(prev\.falhas \|\| 0\) \+ 1\)/);
  assert(!/cura\.push\(await acao/.test(fonte), 'não deve despachar sem passar pelo freio');
});

console.log(`${certos}/${certos + falhas} testes de resiliência do vigia passaram`);
process.exitCode = falhas ? 1 : 0;
