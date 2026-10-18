// Regressão do teste controlado do retorno assíncrono do navegador.
// Confere o contrato de segurança sem usar Gmail, endereço de produção ou rede.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const fonte = fs.readFileSync(path.join(raiz, 'tools', 'teste-navegador-pareado.js'), 'utf8');
const workflow = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'teste-email.yml'), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('usa uma única URL pública inofensiva e marca a origem sintética', () => {
  assert.match(fonte, /URL_PUBLICA\s*=\s*'https:\/\/example\.com\/'/);
  assert.match(fonte, /MARCA\s*=\s*'\[TESTE-REBOCL\]'/);
  assert.match(fonte, /navegar:\s*' \+ URL_PUBLICA/);
});
ok('exige o pareamento pela thread exata, não apenas pelo assunto', () => {
  assert.match(fonte, /function inReplyToExato/);
  assert.match(fonte, /inReplyToExato\(x\.inReplyTo, origem\)/);
  assert.match(fonte, /In-Reply-To/);
  assert.match(fonte, /client\.search\(\{ subject: MARCA \+ ' N1' \}/);
  assert.match(fonte, /pegaTexto\([\s\S]{0,180}\{ preservaUrls: true \}/);
});
ok('o relatório é sanitizado e declara o limite da evidência controlada', () => {
  assert.match(fonte, /omite endereços, Message-IDs, referências opacas, cabeçalhos e corpos/);
  assert.match(fonte, /Não mede satisfação humana, uso espontâneo, disponibilidade contínua nem SLA/);
  assert.doesNotMatch(fonte, /L\.push\([^\n]*(?:\+\s*(?:USER|PASS|origem|alias|texto)\b|\b(?:USER|PASS|origem|alias|texto)\s*\+)/);
});
ok('o workflow aceita o script explicitamente, sem abrir execução arbitrária', () => {
  assert.match(workflow, /tools\/teste-navegador-pareado\.js/);
  assert.match(workflow, /case "\$SCRIPT" in/);
  assert.match(workflow, /\*\) SCRIPT=tools\/teste-email\.js/);
});

console.log(`${certos}/${certos + falhas} testes do navegador pareado passaram`);
process.exitCode = falhas ? 1 : 0;
