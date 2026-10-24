// Contrato do medidor de cobertura no navegador — 2026-10-24.
//
// O medidor abre Chromium, liga o profiler do CDP e conta linha a linha o que executou nas
// quatro rotas. O risco desse tipo de medição é publicar número bonito e errado: se o range
// do script inteiro (que sempre tem count > 0) for usado, tudo vira 100%. Este contrato prova
// o mapeamento offset → linha com um caso sintético onde se sabe exatamente o que deve dar,
// sem abrir navegador e sem rede.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { medirScript, inicioDasLinhas, linhaDoOffset, ehLinhaDeCodigo, porcento } = require('../cobertura-navegador');

const raiz = path.resolve(__dirname, '../..');
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

// Caso sintético: `usada` é chamada, o `if` interno nunca entra e `naoUsada` nunca roda.
const fonte = [
  "'use strict';",          // linha 0 — topo do script: executa
  'function usada() {',     // linha 1 — executa
  '  if (falso) {',         // linha 2 — bloco não tomado
  '    return 1;',          // linha 3 — bloco não tomado
  '  }',                    // linha 4 — bloco não tomado
  '  return 2;',            // linha 5 — executa
  '}',                      // linha 6 — executa
  'function naoUsada() {',  // linha 7 — nunca executa
  '  return 3;',            // linha 8 — nunca executa
  '}'                       // linha 9 — nunca executa
].join('\n');

function offsetDoTrecho(trecho) {
  const i = fonte.indexOf(trecho);
  assert(i >= 0, 'trecho não encontrado: ' + trecho);
  return i;
}

const funcoes = [
  // envelope do script: cobre tudo e sempre tem count > 0 — é justamente o que não pode valer
  { functionName: '', ranges: [{ startOffset: 0, endOffset: fonte.length, count: 1 }] },
  { functionName: 'usada', ranges: [{ startOffset: offsetDoTrecho('function usada() {'), endOffset: offsetDoTrecho('function naoUsada() {'), count: 1 }] },
  {
    functionName: '',
    ranges: [
      { startOffset: offsetDoTrecho('  if (falso) {'), endOffset: offsetDoTrecho('  }') + 3, count: 0 }
    ]
  },
  { functionName: 'naoUsada', ranges: [{ startOffset: offsetDoTrecho('function naoUsada() {'), endOffset: fonte.length, count: 0 }] }
];

ok('o envelope do script não transforma tudo em coberto', () => {
  const m = medirScript(fonte, funcoes);
  assert.equal(m.linhaTotal, 10, 'linhas de código: ' + m.linhaTotal);
  assert.equal(m.linhaCoberta, 4, 'deveriam executar 4 linhas (topo, abre, return 2, fecha); deu ' + m.linhaCoberta);
  assert(m.linhaCoberta < m.linhaTotal, 'medição não discriminou nada');
});

ok('conta funções nomeadas chamadas, sem contars blocos anônimos', () => {
  const m = medirScript(fonte, funcoes);
  assert.equal(m.funcoesTotais, 2, 'funções nomeadas: ' + m.funcoesTotais);
  assert.equal(m.funcoesChamadas, 1, 'chamadas: ' + m.funcoesChamadas);
});

ok('bloco interno não tomado não conta como executado', () => {
  const m = medirScript(fonte, funcoes);
  // Se o bloco do `if` fosse ignorado, as linhas 2–4 entrariam e o total subiria para 7.
  assert(m.linhaCoberta < 7, 'linhas do bloco não tomado foram contadas como cobertas');
});

ok('offset vira número de linha nas fronteiras', () => {
  const inicios = inicioDasLinhas(fonte);
  assert.equal(linhaDoOffset(inicios, 0), 0);
  assert.equal(linhaDoOffset(inicios, inicios[3]), 3);
  assert.equal(linhaDoOffset(inicios, inicios[3] + 4), 3);
  assert.equal(linhaDoOffset(inicios, inicios[9]), 9);
  assert.equal(linhaDoOffset(inicios, fonte.length), 9);
});

ok('linha vazia e comentário não entram na conta de código', () => {
  assert.equal(ehLinhaDeCodigo(''), false);
  assert.equal(ehLinhaDeCodigo('   '), false);
  assert.equal(ehLinhaDeCodigo('  // comentário'), false);
  assert.equal(ehLinhaDeCodigo('  /* abre bloco'), false);
  assert.equal(ehLinhaDeCodigo('   * continua'), false);
  assert.equal(ehLinhaDeCodigo('  const x = 1;'), true);
});

ok('percentual é arredondado e não divide por zero', () => {
  assert.equal(porcento(1, 3), 33.3);
  assert.equal(porcento(0, 0), 0);
  assert.equal(porcento(2, 2), 100);
});

ok('o medidor não abre rede externa nem usa terceiros', () => {
  const fonteMedidor = fs.readFileSync(path.join(raiz, 'tools/cobertura-navegador.js'), 'utf8');
  const externos = fonteMedidor.match(/https?:\/\/(?!127\.0\.0\.1)[a-z0-9.-]+/gi) || [];
  assert.deepEqual(externos, [], 'o medidor citou host externo: ' + externos.join(', '));
  assert(/127\.0\.0\.1/.test(fonteMedidor), 'o medidor deveria falar só com o servidor efêmero local');
});

ok('o medidor é opt-in e avisa quando 100% não discrimina', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
  assert(pkg.scripts && pkg.scripts['cobertura-paginas'], 'falta o script npm run cobertura-paginas');
  const fonteMedidor = fs.readFileSync(path.join(raiz, 'tools/cobertura-navegador.js'), 'utf8');
  assert(/não discrimina nada/.test(fonteMedidor), 'o relatório precisa avisar quando a medição dá 100%');
  assert(/SKIP: Chromium não encontrado/.test(fonteMedidor), 'sem navegador precisa terminar em SKIP explícito');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes do medidor de cobertura passaram');
process.exitCode = falhas ? 1 : 0;
