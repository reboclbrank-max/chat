// Checkpoint da régua: prefixo nunca é placar, retomada não repete nem mistura versões.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resumo, salvarAtomico, validarRetomada } = require('../../bench/medir-aberto.js');

const banco = [{ id: 1, q: 'Questão um' }, { id: 2, q: 'Questão dois' }];
const meta = { bancoSha256: 'b', codigoSha256: 'c', rubricaSha256: 'r', medidorSha256: 'm', concorrencia: 1 };
const primeiro = { id: 1, q: 'Questão um', ok: true, falhas: [], palavras: 70, ms: 100 };
const segundo = { id: 2, q: 'Questão dois', ok: false, falhas: ['curto (1<70)'], palavras: 1, ms: 200 };
const parcial = resumo([primeiro], 2, 'depois');
assert.strictEqual(parcial.completo, false);
assert.strictEqual(parcial.pct, null, 'prefixo não é porcentagem da régua');
assert.strictEqual(resumo([primeiro, segundo], 2, 'depois').pct, 50);
assert.strictEqual(resumo([primeiro, segundo], 2, 'depois').medianaMs, 150, 'para dois valores usa média dos centrais');
assert.strictEqual(resumo([primeiro, segundo], 2, 'depois').medianaPalavras, 35.5);
assert.strictEqual(resumo([primeiro], 2, 'depois').medianaMs, 100);
assert.strictEqual(resumo([], 2, 'depois').medianaMs, null);
const checkpoint = { meta, sum: parcial, res: [primeiro] };
assert.deepStrictEqual(validarRetomada(checkpoint, meta, banco, 'depois'), [primeiro]);
assert.throws(() => validarRetomada(checkpoint, { ...meta, codigoSha256: 'outro' }, banco, 'depois'), /código|codigoSha256/);
assert.throws(() => validarRetomada(checkpoint, { ...meta, medidorSha256: 'outro' }, banco, 'depois'), /medidorSha256/);
assert.throws(() => validarRetomada(checkpoint, { ...meta, concorrencia: 2 }, banco, 'depois'), /concorrencia/);
assert.throws(() => validarRetomada({ ...checkpoint, res: [primeiro, primeiro] }, meta, banco, 'depois'), /itens/);
assert.throws(() => validarRetomada({ ...checkpoint, sum: resumo([primeiro, segundo], 2, 'depois') }, meta, banco, 'depois'), /já está completa/);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aberto-checkpoint-'));
try {
  const arq = path.join(dir, 'resultado.json');
  salvarAtomico(arq, checkpoint);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(arq, 'utf8')), checkpoint);
  assert(!fs.existsSync(arq + '.tmp'));
  salvarAtomico(arq, { meta, sum: resumo([primeiro, segundo], 2, 'depois'), res: [primeiro, segundo] });
  assert.strictEqual(JSON.parse(fs.readFileSync(arq, 'utf8')).res.length, 2);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
console.log('✔ checkpoint atômico; sem placar parcial, mistura de hashes ou repetição de itens');
