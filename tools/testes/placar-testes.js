// Contrato do placar honesto da barreira — 2026-10-24.
// O repositório publicava "54/54", "22/22" e "92/92" como se tudo medisse a mesma coisa.
// Não mede: a maioria das suítes lê o fonte e compara texto. Este contrato garante que
//  - o corredor separa prova estática, mista e de comportamento;
//  - a medição de cobertura é opt-in, com escopo de produto (sem contar os próprios testes);
//  - a barreira do CI continua sem depender de `c8`, para não ficar mais lenta ou exigir rede.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '../..');
const ler = (nome) => fs.readFileSync(path.join(raiz, nome), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try {
    fn();
    certos++;
    console.log('✔ ' + nome);
  } catch (e) {
    falhas++;
    console.error('✘ ' + nome + ' — ' + e.message);
  }
}

ok('o corredor separa as três classes de prova', () => {
  const corredor = ler('tools/testes/roda-testes.js');
  assert.match(corredor, /function classificaSuite/, 'classificador ausente');
  assert.match(corredor, /estatica: \{ total: 0, falhas: 0 \}/, 'classe estática ausente');
  assert.match(corredor, /comportamento: \{ total: 0, falhas: 0 \}/, 'classe comportamento ausente');
  assert.match(corredor, /misto: \{ total: 0, falhas: 0 \}/, 'classe misto ausente');
});

ok('o placar é impresso e explica o que cada classe significa', () => {
  const corredor = ler('tools/testes/roda-testes.js');
  assert.match(corredor, /Placar por tipo de prova/);
  assert.match(corredor, /estática = lê fonte e compara texto; comportamento = executa módulo, rota ou cenário/);
  assert.match(corredor, /linhaPlacar\('comportamento'/, 'falta a linha do comportamento');
  assert.match(corredor, /linhaPlacar\('estática'/, 'falta a linha da estática');
});

ok('o cenário end-to-end conta como comportamento', () => {
  const corredor = ler('tools/testes/roda-testes.js');
  assert.match(corredor, /placar\.comportamento\.total\+\+/, 'cenário não entra no placar');
});

ok('a cobertura é opt-in e não faz parte da barreira do CI', () => {
  const pkg = JSON.parse(ler('package.json'));
  assert.equal(typeof pkg.scripts.cobertura, 'string', 'falta script de cobertura');
  assert(/c8/.test(pkg.scripts.cobertura), 'o script de cobertura precisa usar c8');
  assert(pkg.devDependencies && pkg.devDependencies.c8, 'c8 precisa ser devDependency');
  assert(!pkg.dependencies.c8, 'c8 não pode entrar em dependências de produção');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  assert.match(workflow, /run: node tools\/testes\/roda-testes\.js/, 'a barreira precisa rodar o corredor direto');
  assert.doesNotMatch(workflow, /c8/, 'a barreira não deve depender de c8');
});

ok('a cobertura mede produto, não os próprios testes', () => {
  const c8 = JSON.parse(ler('.c8rc.json'));
  assert(Array.isArray(c8.include) && c8.include.some((p) => p.startsWith('tools/')), 'include precisa cobrir tools/');
  assert(c8.include.some((p) => p === 'sw.js'), 'a casca precisa entrar na medição');
  assert(c8.exclude.some((p) => p.includes('tools/testes')), 'os testes não podem inflar a cobertura');
  assert.equal(c8.all, false, 'all:true mediria arquivo nunca executado e distorceria o número');
});

ok('o limite da medição está declarado na continuidade', () => {
  const continuidade = ler('CONTINUIDADE.md');
  assert(/Placar por tipo de prova/.test(continuidade), 'a continuidade precisa registrar o placar');
  assert(/não mede o JavaScript inline das quatro páginas|não cobre o JavaScript inline/.test(continuidade), 'a continuidade precisa declarar que o inline das páginas não é medido');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes do placar passaram');
process.exitCode = falhas ? 1 : 0;
