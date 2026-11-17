// CONTRATO DA FÓRMULA DO PLACAR — a catraca do ciclo 5.
//
// O instrutor vai rodar `placar.js --recalcular` e conferir a aritmética na mão. Este contrato
// garante que a conta é UMA só: as quatro categorias somam o total, e os dois números saem
// delas por fórmula, sem constante escrita à mão em lugar nenhum.
//
// Regras que ele prende:
//   * buraco ABERTO conta vivo (saber o nome da dívida não é pagá-la);
//   * buraco FECHADO, com contrato e vermelho visto, conta morto;
//   * inválida sai do denominador ingênuo, e não entra em nenhum dos dois;
//   * não_executa sai do estrito (não tem veredito de execução) e fica no ingênuo.
'use strict';
const assert = require('assert');
const { recalcula } = require('./placar.js');

let total = 0, certos = 0;
function ok(nome, fn) {
  total++;
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { console.log('✘ ' + nome + ' → ' + String(e.message).split('\n')[0]); process.exitCode = 1; }
}

function linha(status, origem, tipo) {
  return { id: 'X', arquivo: 'a.js', linha: 1, tipo: tipo || 'trocar-limite', descricao: 'd', status, origem: origem || 'mutador', motivo: '' };
}

// Tabela de brinquedo com números conhecidos e escolhidos para não dar empate acidental:
//   6 mortas + 1 buraco fechado · 3 vivas + 1 buraco aberto · 2 não executam · 1 inválida  = 14 linhas
const FIXTURE = {
  seed: 42, maxPorModulo: 6,
  linhas: [
    linha('morta'), linha('morta'), linha('morta'), linha('morta'), linha('morta'), linha('morta'),
    linha('viva'), linha('viva'), linha('viva'),
    linha('viva', 'buraco'),
    linha('morta', 'buraco'),
    linha('nao_executa'), linha('nao_executa'),
    linha('invalida'),
  ],
};

ok('as quatro categorias somam o total da tabela', () => {
  const r = recalcula(FIXTURE, { imprimir: false });
  assert.equal(r.total, 14);
  assert.equal(r.somaConfere, true, 'as categorias não fecham com o total');
  assert.deepEqual(r.conta, { morta: 7, viva: 4, nao_executa: 2, invalida: 1 });
});

ok('ingênuo = mortas / (todas as válidas), com inválida fora', () => {
  const r = recalcula(FIXTURE, { imprimir: false });
  assert.equal(r.validas, 13, 'válidas = total − inválidas');
  assert.equal(r.ingenuo, 7 / 13);
});

ok('estrito = mortas / (mortas + vivas) — não_executa sai do denominador', () => {
  const r = recalcula(FIXTURE, { imprimir: false });
  assert.equal(r.executaveis, 11);
  assert.equal(r.estrito, 7 / 11);
});

ok('buraco aberto conta vivo e buraco fechado conta morto, na mesma conta', () => {
  const r = recalcula(FIXTURE, { imprimir: false });
  const semBuracos = { ...FIXTURE, linhas: FIXTURE.linhas.filter(l => l.origem !== 'buraco') };
  const s = recalcula(semBuracos, { imprimir: false });
  assert.equal(s.conta.viva, 3, 'sem o buraco aberto sobra 3 vivas');
  assert.equal(s.conta.morta, 6, 'sem o buraco fechado sobra 6 mortas');
  assert.ok(r.conta.viva === s.conta.viva + 1, 'o buraco aberto tem de entrar como viva');
  assert.ok(r.conta.morta === s.conta.morta + 1, 'o buraco fechado tem de entrar como morta');
});

console.log('\n' + certos + '/' + total + ' contratos da fórmula do placar passaram');
