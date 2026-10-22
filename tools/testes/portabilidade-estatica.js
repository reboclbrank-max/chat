// Contrato offline: a casca pública continua copiável sem CDN/script externo.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const entradas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html', 'console.html'];
const ativosDasQuatro = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function ativosDaMarcacao(texto) {
  return [...texto.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
}
function local(valor) {
  return !/^(?:https?:)?\/\//i.test(valor) && !/^data:/i.test(valor) && !/^\//.test(valor);
}

ok('ativos de script e estilo das entradas são relativos/same-origin', () => {
  for (const entrada of entradas) {
    const ativos = ativosDaMarcacao(ler(entrada));
    assert(ativos.length || entrada === 'console.html', entrada + ' sem ativos esperados');
    for (const ativo of ativos) assert(local(ativo), entrada + ' aponta ativo externo: ' + ativo);
  }
});
ok('quatro entradas conversacionais preservam a mesma casca local', () => {
  const conjuntos = ativosDasQuatro.map(entrada => ativosDaMarcacao(ler(entrada)).filter(x => /^(?:chat-|manifest\.json|icone-)/.test(x)).sort());
  for (const conjunto of conjuntos.slice(1)) assert.deepEqual(conjunto, conjuntos[0], 'casca divergiu entre entradas');
});
ok('service worker não importa nem precacheia endereço externo', () => {
  const sw = ler('sw.js');
  assert.doesNotMatch(sw, /https?:\/\/|importScripts\s*\(/, 'service worker depende de origem externa');
  assert.match(sw, /url\.origin !== self\.location\.origin/, 'service worker não limita cache à própria origem');
});
ok('documentação separa casca portátil de integrações configuradas', () => {
  const doc = ler('PORTABILIDADE-ESTATICA.md');
  assert.match(doc, /casca pública/i);
  assert.match(doc, /não é transferido automaticamente/i);
  assert.match(doc, /não criar conta, domínio, cartão, serviço pago/i);
});

console.log(`${certos}/${certos + falhas} testes de portabilidade estática passaram`);
process.exitCode = falhas ? 1 : 0;
