// Contrato: todo caminho de envio que limpa o compositor também atualiza o contador visível.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = [
  ['index.html', 6],
  ['direto.html', 5],
  ['ligar.html', 5],
  ['limpar.html', 6]
];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
function envio(html) {
  return entre(html, 'async function enviar() {', '\n\n// Quando o workflow privado falha');
}
function trechosDeLimpeza(codigo) {
  const agulha = "caixa.value = ''; caixa.style.height = 'auto';";
  const indices = [];
  let inicio = 0;
  while (true) {
    const indice = codigo.indexOf(agulha, inicio);
    if (indice < 0) break;
    indices.push(indice);
    inicio = indice + agulha.length;
  }
  return indices.map((indice, posicao) => codigo.slice(indice, indices[posicao + 1] || codigo.length));
}
const funcoesContador = [];
for (const [rota, esperadas] of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  const codigo = envio(html);
  testa(rota + ' atualiza o contador em cada limpeza do compositor', () => {
    const trechos = trechosDeLimpeza(codigo);
    assert.equal(trechos.length, esperadas, 'quantidade auditada de limpezas');
    trechos.forEach((trecho, indice) => {
      const contador = trecho.indexOf('atualizarContador();');
      const primeiraBolha = trecho.indexOf('bolha(');
      assert(contador >= 0, 'limpeza ' + (indice + 1) + ' sem contador');
      assert(primeiraBolha < 0 || contador < primeiraBolha, 'contador após a bolha na limpeza ' + (indice + 1));
    });
  });
  funcoesContador.push(entre(html, 'function atualizarContador() {', '\nfunction lerArquivoDrop'));
}
testa('atualizador do contador é idêntico e não cria I/O nas quatro rotas', () => {
  assert.equal(new Set(funcoesContador).size, 1, 'paridade do atualizador');
  assert.doesNotMatch(funcoesContador[0], /\b(?:fetch|api|localStorage|sessionStorage|XMLHttpRequest|WebSocket|sendBeacon)\b/);
});
console.log(`${certos}/${certos + falhas} testes do contador do compositor passaram`);
process.exitCode = falhas ? 1 : 0;
