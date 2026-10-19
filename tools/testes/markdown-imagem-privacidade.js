// Renderização de conversa não pode buscar imagem remota automaticamente.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function renderizador(nome, entrada) {
  const fonte = fs.readFileSync(path.join(raiz, nome), 'utf8');
  const inicio = fonte.indexOf('function escapar(');
  const fim = fonte.indexOf('const DONO_GITHUB', inicio);
  assert(inicio >= 0 && fim > inicio, 'bloco markdown não encontrado em ' + nome);
  return vm.runInNewContext(fonte.slice(inicio, fim) + '\nmarkdown(' + JSON.stringify(entrada) + ');');
}

const imagem = '![<não confiar>](https://imagem.exemplo.test/pixel.png)';
const resultados = new Map();
for (const rota of rotas) {
  ok(rota + ' não carrega imagem remota ao renderizar', () => {
    const html = renderizador(rota, imagem);
    resultados.set(rota, html);
    assert(!/<img\b/i.test(html), 'img remoto não pode ser criado automaticamente');
    assert.match(html, /^<a href="https:\/\/imagem\.exemplo\.test\/pixel\.png"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /referrerpolicy="no-referrer"/);
    assert.match(html, /&lt;não confiar&gt;/);
    assert.match(html, /Abrir imagem:/);
  });
}
ok('as quatro rotas preservam a mesma proteção de imagem', () => {
  const unicos = new Set([...resultados.values()]);
  assert.equal(unicos.size, 1, 'renderizadores divergentes entre rotas');
});
for (const rota of rotas) {
  ok(rota + ' mantém link textual como ação explícita e isolada', () => {
    const html = renderizador(rota, '[fonte](https://exemplo.test/recurso) https://outro.exemplo.test/pagina');
    assert.match(html, /<a href="https:\/\/exemplo\.test\/recurso" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">fonte<\/a>/);
    assert.match(html, /<a href="https:\/\/outro\.exemplo\.test\/pagina" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">https:\/\/outro\.exemplo\.test\/pagina<\/a>/);
    assert(!/<img\b/i.test(html));
  });
}

console.log(`${certos}/${certos + falhas} testes de privacidade de imagem passaram`);
process.exitCode = falhas ? 1 : 0;
