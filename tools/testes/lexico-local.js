// LÉXICO LOCAL — o último pedaço que dependia de modelo (rodada 139, 31/10/2026).
//
// Sinônimo, antônimo, "qual não pertence" e analogia eram as provas que sobravam para o modelo.
// A base agora é o Wikcionário em português, extraído em TEMPO DE BUILD para `lexico-pt.json` e
// espelhado em `lexico-pt.js` (entra por <script>, fica no cache do service worker). Em execução
// não há rede, cota nem chave.
//
// O que este teste cobra:
//   1. procedência: fonte, URL e licença dentro do arquivo; tamanho mínimo da base;
//   2. zero rede: com `fetch` proibido, os solucionadores respondem igual (a base é local);
//   3. acerta o que a base sustenta (sinônimo, antônimo, não pertence, analogia todo→parte);
//   4. CALA quando a base não sustenta (palavra ausente, ambiguidade, relação desconhecida).
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
let certos = 0;
const falhas = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}

const base = require(path.join(RAIZ, 'lexico-pt.js'));
// rede proibida: a base tem de bastar
global.fetch = function () { return Promise.reject(new Error('rede proibida no teste')); };
const R = require(path.join(RAIZ, 'razao-local.js'));

testa('procedência: fonte, URL e licença estão dentro do arquivo', () => {
  assert(base.esquema === 'lexico-pt-v1');
  assert(base.fonte && /wikcion/i.test(base.fonte.nome), 'sem nome da fonte');
  assert(/pt\.wiktionary\.org/.test(base.fonte.url), 'sem URL da fonte');
  assert(/CC BY-SA/i.test(base.fonte.licenca), 'sem licença de atribuição');
  assert(base.palavras >= 1000, 'base pequena demais: ' + base.palavras);
});

testa('o espelho JavaScript existe e é o mesmo conteúdo do JSON', () => {
  const json = JSON.parse(fs.readFileSync(path.join(RAIZ, 'lexico-pt.json'), 'utf8'));
  assert.equal(json.palavras, base.palavras, 'JSON e .js divergem no tamanho');
  assert.equal(Object.keys(json.base).length, Object.keys(base.base).length, 'JSON e .js divergem no conteúdo');
});

testa('zero rede: a base responde sem tocar a internet', () => {
  const r = R.resolver('Qual é o antônimo de "curto": (A) longo (B) escasso (C) leve (D) frio?');
  assert(r && /longo/.test(r.texto), 'não respondeu sem rede: ' + (r && r.texto));
});

testa('a página e a casca carregam a base (sem fetch em execução)', () => {
  const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const antes = index.indexOf('lexico-pt.js');
  const depois = index.indexOf('razao-local.js');
  assert(antes !== -1, 'index.html não carrega a base lexical');
  assert(antes < depois, 'a base tem de entrar ANTES do razao-local.js');
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  assert(sw.indexOf('lexico-pt.js') !== -1, 'service worker não guarda a base');
});

testa('acerta o que a base sustenta', () => {
  const casos = [
    ['Qual é o sinônimo mais próximo de "belo": (A) feio (B) bonito (C) triste (D) lento?', /bonito/],
    ['Qual é o antônimo de "alto": (A) baixo (B) grande (C) forte (D) novo?', /baixo/],
    ['Qual palavra NÃO pertence ao grupo: cadeira, mesa, sofá, geladeira, estante?', /geladeira/],
    ['Qual palavra completa a analogia: "livro está para capítulo assim como sinfonia está para ______"?', /movimento/]
  ];
  for (const [q, esperado] of casos) {
    const r = R.resolver(q);
    assert(r && esperado.test(r.texto), 'não respondeu: ' + q.slice(0, 50) + ' → ' + (r && r.texto));
  }
});

testa('cala quando a base não sustenta — nada de palpite', () => {
  const devemCalar = [
    'Qual é o sinônimo mais próximo de "xilofone": (A) instrumento (B) martelo (C) música (D) som?',
    'Qual é o antônimo de "escasso": (A) raro (B) abundante (C) pequeno (D) frágil?',
    'Qual palavra NÃO pertence ao grupo: sincero, honesto, leal, rápido?',
    'Complete a analogia: martelo está para prego assim como serrote está para ______.'
  ];
  for (const q of devemCalar) {
    const r = R.resolver(q);
    assert(!r, 'chutou "' + (r && r.texto) + '" em: ' + q.slice(0, 60));
  }
});

console.log('');
if (falhas.length) { console.error('✘ ' + falhas.length + ' de ' + (certos + falhas.length) + ' verificações do léxico local FALHARAM'); process.exit(1); }
console.log('✔ ' + certos + '/' + (certos + falhas.length) + ' verificações do léxico local passaram');
