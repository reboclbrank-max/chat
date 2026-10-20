// Contrato: a sonda de !varredura só testa o motor; não leva memória ou persona local.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function blocoVarredura(rota) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  const inicio = "if (m.startsWith('!varredura'))";
  const fim = "\n  if (m.startsWith('!imagem ')";
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert(a >= 0 && b > a, 'bloco !varredura ausente');
  return html.slice(a, b);
}
const blocos = [];
for (const rota of rotas) {
  testa(rota + ' sonda novos modelos com ping mínimo', () => {
    const bloco = blocoVarredura(rota);
    assert.match(bloco, /fetch\(base \+ '\/models'/);
    assert.match(bloco, /fetch\(base \+ '\/chat\/completions'/);
    assert.match(bloco, /messages:\s*\[\{ role: 'user', content: 'ping' \}\]/);
    for (const proibido of [/localStorage/, /rebocl_memoria/, /rebocl_persona_ativa/, /Fatos sobre o dono/, /PERSONA ATIVA/]) {
      assert.doesNotMatch(bloco, proibido);
    }
    blocos.push(bloco);
  });
}
testa('a varredura mínima mantém paridade entre as quatro rotas', () => {
  assert.equal(new Set(blocos.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
});
console.log(`${certos}/${certos + falhas} testes de privacidade da varredura passaram`);
process.exitCode = falhas ? 1 : 0;
