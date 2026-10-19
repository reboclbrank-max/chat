// Regressão da sonda de pré-requisito: não confundir opção --version não suportada com binário ausente.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { comandoExecutavelDisponivel } = require('./pre-requisitos');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('executável localizado continua disponível mesmo se --version sair diferente de zero', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-requisito-'));
  try {
    const binario = path.join(pasta, 'ferramenta-sem-version');
    fs.writeFileSync(binario, '#!/bin/sh\nexit 64\n');
    fs.chmodSync(binario, 0o700);
    assert.equal(comandoExecutavelDisponivel(binario), true);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});
ok('caminho inexistente continua ausente', () => {
  const inexistente = path.join(os.tmpdir(), 'rebocl-nao-existe-' + process.pid);
  assert.equal(comandoExecutavelDisponivel(inexistente), false);
});
console.log(`${certos}/${certos + falhas} testes de pré-requisitos multimodais passaram`);
process.exitCode = falhas ? 1 : 0;
