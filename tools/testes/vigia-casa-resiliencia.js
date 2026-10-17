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

console.log(`${certos}/${certos + falhas} testes de resiliência do vigia passaram`);
process.exitCode = falhas ? 1 : 0;
