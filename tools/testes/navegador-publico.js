// Teste offline do navegador público: valida a barreira antes de qualquer consulta web.
'use strict';
const assert = require('assert');
const nav = require('../navegador-publico');
let n = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { console.error('✘ ' + nome + ' — ' + e.message); process.exitCode = 1; } }
function bloqueia(url) { assert.throws(() => nav.urlPublica(url)); }

ok('aceita HTTPS público e remove fragmento', () => {
  assert.equal(nav.urlPublica('https://example.com/p?q=1#nao').toString(), 'https://example.com/p?q=1');
});
ok('aceita HTTP público na porta padrão', () => assert.equal(nav.urlPublica('http://example.org:80/').hostname, 'example.org'));
ok('bloqueia esquemas não web', () => { bloqueia('file:///etc/passwd'); bloqueia('javascript:alert(1)'); });
ok('bloqueia URL com credencial ou segredo em query', () => {
  bloqueia('https://usuario:senha@example.com/');
  bloqueia('https://example.com/?access_token=nao-publicar');
  bloqueia('https://example.com/?signature=nao-publicar');
});
ok('bloqueia localhost, domínios internos e portas incomuns', () => {
  bloqueia('http://localhost/'); bloqueia('https://api.internal/'); bloqueia('https://example.com:8080/');
});
ok('bloqueia IPv4 privado, loopback e link-local', () => {
  for (const u of ['http://127.0.0.1/', 'http://10.0.0.1/', 'http://172.16.0.1/', 'http://192.168.1.1/', 'http://169.254.169.254/']) bloqueia(u);
});
ok('limpa tags e scripts do resumo', () => {
  assert.equal(nav.tiraHtml('<title>T</title><script>segredo()</script><p>Olá &amp; mundo</p>'), 'T Olá & mundo');
});
ok('detecta faixa privada sem depender da rede', () => {
  assert.equal(nav.ipPrivado('8.8.8.8'), false); assert.equal(nav.ipPrivado('::1'), true); assert.equal(nav.ipPrivado('fc00::1'), true);
  assert.equal(nav.ipPrivado('100.64.0.1'), true); assert.equal(nav.ipPrivado('::ffff:192.168.1.1'), true);
});
ok('Chrome fica preso ao IP público aprovado e bloqueia outros hosts', () => {
  const regra = nav.regraResolverChrome('https://example.com/', ['93.184.216.34']);
  assert.match(regra, /^MAP example\.com 93\.184\.216\.34, MAP \* 0\.0\.0\.0$/);
  assert.throws(() => nav.regraResolverChrome('https://example.com/', ['2001:db8::1']));
});
console.log(`${n}/9 testes do navegador público passaram`);
