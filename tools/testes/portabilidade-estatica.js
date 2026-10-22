// Contrato offline: a casca pública continua copiável, íntegra e sem CDN/script externo.
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
  return typeof valor === 'string' &&
    !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(valor) &&
    !valor.includes('\\');
}
function referenciaLocal(valor, contexto) {
  assert(local(valor), contexto + ' aponta ativo externo ou absoluto: ' + valor);
  assert(!/[?#]/.test(valor), contexto + ' não pode depender de query ou fragmento: ' + valor);
  const relativa = valor.replace(/^\.\//, '') || '.';
  const destino = path.resolve(raiz, relativa);
  assert(destino === raiz || destino.startsWith(raiz + path.sep), contexto + ' escapa da casca local');
  return { relativa, destino };
}
function cascaDoWorker() {
  const sw = ler('sw.js');
  const bloco = /const\s+CASCA\s*=\s*\[([\s\S]*?)\];/.exec(sw);
  assert(bloco, 'service worker perdeu a lista estática CASCA');
  const referencias = [...bloco[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert(referencias.length >= 8, 'lista de precache insuficiente ou dinâmica');
  return { sw, referencias };
}
function conjuntoCacheado() {
  return new Set(cascaDoWorker().referencias.map(valor => referenciaLocal(valor, 'precache').relativa));
}

ok('ativos de script e estilo das entradas são relativos/same-origin', () => {
  for (const entrada of entradas) {
    const ativos = ativosDaMarcacao(ler(entrada));
    assert(ativos.length || entrada === 'console.html', entrada + ' sem ativos esperados');
    for (const ativo of ativos) referenciaLocal(ativo, entrada);
  }
});
ok('quatro entradas conversacionais preservam a mesma casca local', () => {
  const conjuntos = ativosDasQuatro.map(entrada => ativosDaMarcacao(ler(entrada)).filter(x => /^(?:chat-|manifest\.json|icone-)/.test(x)).sort());
  for (const conjunto of conjuntos.slice(1)) assert.deepEqual(conjunto, conjuntos[0], 'casca divergiu entre entradas');
});
ok('precache estático só contém caminhos locais existentes', () => {
  const { referencias } = cascaDoWorker();
  const normalizadas = new Set();
  for (const referencia of referencias) {
    const localizada = referenciaLocal(referencia, 'precache');
    assert(!normalizadas.has(localizada.relativa), 'precache repete ativo: ' + localizada.relativa);
    normalizadas.add(localizada.relativa);
    assert(fs.existsSync(localizada.destino), 'precache aponta arquivo ausente: ' + localizada.relativa);
    if (localizada.relativa !== '.') assert(fs.statSync(localizada.destino).isFile(), 'precache não aponta arquivo regular: ' + localizada.relativa);
  }
});
ok('toda casca declarada nas entradas públicas entra no precache', () => {
  const cacheados = conjuntoCacheado();
  for (const entrada of entradas) {
    assert(cacheados.has(entrada), entrada + ' não entra no precache');
    for (const ativo of ativosDaMarcacao(ler(entrada))) {
      const relativa = referenciaLocal(ativo, entrada).relativa;
      assert(cacheados.has(relativa), entrada + ' usa ativo fora do precache: ' + relativa);
    }
  }
});
ok('manifesto e ícones continuam locais, existentes e cacheáveis', () => {
  const manifesto = JSON.parse(ler('manifest.json'));
  for (const campo of ['start_url', 'scope']) referenciaLocal(manifesto[campo], 'manifesto.' + campo);
  assert(Array.isArray(manifesto.icons) && manifesto.icons.length, 'manifesto sem ícones');
  const cacheados = conjuntoCacheado();
  for (const icone of manifesto.icons) {
    const localizada = referenciaLocal(icone && icone.src, 'manifesto.ícone');
    assert(fs.existsSync(localizada.destino) && fs.statSync(localizada.destino).isFile(), 'ícone ausente: ' + localizada.relativa);
    assert(cacheados.has(localizada.relativa), 'ícone fora do precache: ' + localizada.relativa);
  }
});
ok('service worker não importa nem precacheia endereço externo', () => {
  const { sw } = cascaDoWorker();
  assert.doesNotMatch(sw, /https?:\/\/|importScripts\s*\(/, 'service worker depende de origem externa');
  assert.match(sw, /url\.origin !== self\.location\.origin/, 'service worker não limita cache à própria origem');
});
ok('documentação separa casca portátil de integrações configuradas', () => {
  const doc = ler('PORTABILIDADE-ESTATICA.md');
  assert.match(doc, /casca pública/i);
  assert.match(doc, /não é transferido automaticamente/i);
  assert.match(doc, /cada caminho local existe e que toda casca declarada entra no precache estático/i);
  assert.match(doc, /não criar conta, domínio, cartão, serviço pago/i);
});

console.log(`${certos}/${certos + falhas} testes de portabilidade estática passaram`);
process.exitCode = falhas ? 1 : 0;
