// Regressão de implantação: mudança em ferramenta chamada pelo canal precisa trocar o turno após a barreira.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const origem = fs.readFileSync(path.resolve(__dirname, '../email-poll.js'), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('geografia local é classificada como código que exige troca de turno', () => {
  const linha = origem.split(/\r?\n/).find(x => x.indexOf('const CODIGO =') >= 0) || '';
  assert.match(linha, /geografia-brasil\\\.js/, 'geografia-brasil.js ausente da lista de adoção');
  assert.match(linha, /email-chat\\\.js/, 'núcleo do canal ausente da lista de adoção');
  assert.match(linha, /email-poll\\\.js/, 'coordenador ausente da lista de adoção');
});

console.log(`${certos}/${certos + falhas} testes de adoção do turno passaram`);
process.exitCode = falhas ? 1 : 0;
