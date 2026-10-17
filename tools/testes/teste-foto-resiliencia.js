// Regressão do diagnóstico de foto: IMAP caído e resultado parcial precisam falhar de forma observável.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fonte = fs.readFileSync(path.resolve(__dirname, '../teste-foto.js'), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('a coleta IMAP de foto tem teto, sonda e reconexão', () => {
  assert.match(fonte, /const comTeto\s*=/);
  assert.match(fonte, /async function reconecta/);
  assert.match(fonte, /async function varreSegura/);
  assert.match(fonte, /client\.status\('INBOX'/);
  assert.match(fonte, /await varreSegura\(\)/);
});
ok('varredura prioriza a rodada atual e não a caixa histórica', () => {
  assert.match(fonte, /since: new Date\(t0 - 3600000\)/);
  assert.match(fonte, /\(uids \|\| \[\]\)\.slice\(\)\.reverse\(\)/);
  assert.match(fonte, /const vistos = new Set\(\)/);
  assert.match(fonte, /enviad\|sent\|spam/);
  assert.doesNotMatch(fonte, /todos\|all mail\|spam/);
});
ok('resultado parcial, ausência e erro encerram o workflow como falha', () => {
  assert.match(fonte, /process\.exit\(veredito\.indexOf\('PASS'\) === 0 \? 0 : 1\)/);
  assert.match(fonte, /catch\(e => \{ console\.error\('ERRO:', e\.message\); process\.exit\(1\); \}\)/);
});

console.log(`${certos}/${certos + falhas} testes de resiliência da foto passaram`);
process.exitCode = falhas ? 1 : 0;
