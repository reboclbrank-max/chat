// Regressão: uma rota de visão não pode se passar por resposta útil se ela própria disse que não viu a foto.
'use strict';
const assert = require('assert');
const { pareceCego } = require('../email-chat');
let certos = 0, falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('descarta negação com pronome ligado: visualizá-la', () => {
  assert.equal(pareceCego('Vejo que anexou uma foto, mas não consigo visualizá-la aqui. Envie novamente.'), true);
});
ok('descarta variantes normalizadas de não conseguir abrir ou ver a imagem', () => {
  assert.equal(pareceCego('Não posso abrir essa imagem agora.'), true);
  assert.equal(pareceCego('Unable to view the image.'), true);
});
ok('descarta também a negação no pretérito antes de responder a foto', () => {
  assert.equal(pareceCego('Desculpe, não consegui enxergar a foto. Por favor, reenvie a imagem.'), true);
  assert.equal(pareceCego('Não foi possível analisar esta imagem agora.'), true);
});
ok('não descarta uma observação concreta da imagem', () => {
  assert.equal(pareceCego('Na foto há um círculo azul e a data está no canto inferior.'), false);
});

console.log(`${certos}/${certos + falhas} testes de guarda contra resposta cega passaram`);
process.exitCode = falhas ? 1 : 0;
