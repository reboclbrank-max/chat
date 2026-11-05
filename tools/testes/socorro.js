// Contrato isolado do socorro: a reprovação da barreira vira diagnóstico fechado,
// sem log, sem exceção e sem canal novo. Puro: não usa rede.
'use strict';
const assert = require('assert');
const { resumeFalha, categoriaDoPasso, diagnosticoDaBarreira, CATEGORIAS } = require('../socorro.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

const jobsComNavegador = [
  { name: 'testes', conclusion: 'failure', steps: [
    { name: 'Bibliotecas (as mesmas versões do turno)', conclusion: 'success' },
    { name: 'Navegador controlado (quatro rotas, desktop e mobile)', conclusion: 'failure' }
  ] }
];

ok('acha job e passo que falharam', () => {
  const f = resumeFalha(jobsComNavegador);
  assert.equal(f.job, 'testes');
  assert.match(f.passo, /Navegador controlado/);
});

ok('job que falhou sem passo diz isso em vez de inventar', () => {
  assert.match(resumeFalha([{ name: 'testes', conclusion: 'failure', steps: [] }]).passo, /antes de qualquer passo/);
  assert.equal(resumeFalha([]), null);
  assert.equal(resumeFalha(null), null);
});

ok('categoria do passo é fechada', () => {
  assert.equal(categoriaDoPasso('Navegador controlado (quatro rotas)'), 'teste-de-navegador');
  assert.equal(categoriaDoPasso('Testes rápidos (IMAP, SMTP e motores falsos)'), 'teste-de-unidade');
  assert.equal(categoriaDoPasso('Sintaxe'), 'sintaxe');
  assert.equal(categoriaDoPasso('algo inédito'), 'outra');
  assert.equal(categoriaDoPasso(''), 'desconhecida');
});

ok('barreira vermelha vira causa própria, com categoria e link', () => {
  const d = diagnosticoDaBarreira({ conclusao: 'failure', sha: 'abcdef1234567890', runUrl: 'https://exemplo/run/1', jobs: jobsComNavegador });
  assert.equal(d.causa, 'barreira-vermelha');
  assert.equal(d.categoria, 'teste-de-navegador');
  assert.match(d.detalhe, /abcdef1234/);
  assert.match(d.detalhe, /Navegador controlado/);
  assert.match(d.detalhe, /https:\/\/exemplo\/run\/1/);
});

ok('o detalhe não carrega log, exceção nem credencial', () => {
  const d = diagnosticoDaBarreira({ conclusao: 'failure', sha: 'abc', runUrl: 'u', jobs: jobsComNavegador });
  assert(!/Traceback|Error:|token|senha/i.test(d.detalhe), 'diagnóstico não pode vazar log ou segredo');
});

ok('barreira verde é saúde, com evidência fechada', () => {
  const d = diagnosticoDaBarreira({ conclusao: 'success', sha: 'abc1234', runUrl: '', jobs: [] });
  assert.equal(d.causa, 'saudavel');
  assert.equal(d.evidencia, 'barreira-verde');
});

ok('barreira ainda rodando é em andamento, não ausência', () => {
  const d = diagnosticoDaBarreira({ conclusao: '', sha: 'abc1234', runUrl: '', jobs: [] });
  assert.equal(d.causa, 'saudavel');
  assert.equal(d.evidencia, 'barreira-em-andamento');
  assert.match(d.detalhe, /rodando agora/);
  const nula = diagnosticoDaBarreira({ conclusao: null, sha: 'abc1234', runUrl: '', jobs: [] });
  assert.equal(nula.evidencia, 'barreira-em-andamento');
});

ok('conclusão que não é falha nem sucesso não inventa diagnóstico', () => {
  const d = diagnosticoDaBarreira({ conclusao: 'cancelled', sha: 'abc', runUrl: '', jobs: [] });
  assert.equal(d.causa, 'indefinida');
  assert.equal(d.evidencia, '');
});

ok('categoria fora da lista fechada cai em outra', () => {
  assert(CATEGORIAS.includes(diagnosticoDaBarreira({ conclusao: 'failure', sha: 'a', runUrl: '', jobs: jobsComNavegador }).categoria));
});

(async () => {
  let certos = 0;
  let falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} contratos do socorro passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
