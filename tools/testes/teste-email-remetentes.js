// Regressão da coleta: o remetente sintético desconhecido não pode ser contado como resposta do Chat.
'use strict';
const assert = require('assert');
const { aliasesDeTeste, ehRemetenteSintetico } = require('../teste-email-remetentes');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('aliases são derivados sem expor o endereço de produção', () => {
  const a = aliasesDeTeste('dono@exemplo.com');
  assert.deepEqual(a, { teste: 'dono+teste@exemplo.com', estranho: 'dono+estranho@exemplo.com' });
});
ok('coleta ignora os dois remetentes sintéticos', () => {
  const a = aliasesDeTeste('dono@exemplo.com');
  assert.equal(ehRemetenteSintetico('dono+teste@exemplo.com', a), true);
  assert.equal(ehRemetenteSintetico('dono+estranho@exemplo.com', a), true);
  assert.equal(ehRemetenteSintetico('chat@exemplo.com', a), false);
});
ok('fallback sem endereço real continua finito', () => {
  const a = aliasesDeTeste('');
  assert.equal(ehRemetenteSintetico('estranho@exemplo.com', a), true);
  assert.equal(ehRemetenteSintetico('', a), false);
});

console.log(`${certos}/${certos + falhas} testes de remetentes da rodada passaram`);
process.exitCode = falhas ? 1 : 0;
