// Contrato: comandos externos especiais levam apenas a entrada escolhida, não contexto local automático.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const proibidos = [/localStorage/, /rebocl_memoria/, /rebocl_persona_ativa/, /Fatos sobre o dono/, /PERSONA ATIVA/];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function bloco(rota, inicio, fim) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert(a >= 0 && b > a, 'ramo ausente: ' + inicio);
  return html.slice(a, b);
}
const enxames = [];
const olhares = [];
for (const rota of rotas) {
  testa(rota + ' enxame não anexa memória ou persona às perguntas explícitas', () => {
    const b = bloco(rota, "if (m.startsWith('!enxame'))", "\n  if (m.startsWith('!varredura'))");
    assert.match(b, /fetch\(c\.base \+ '\/chat\/completions'/);
    assert.match(b, /messages:\s*\[\{ role: 'user', content: pergunta \}\]/);
    for (const proibido of proibidos) assert.doesNotMatch(b, proibido);
    enxames.push(b);
  });
  testa(rota + ' olhar não anexa memória ou persona à foto escolhida', () => {
    const b = bloco(rota, "if (m.startsWith('!olhar'))", "\n  if (m.startsWith('!falar ')");
    assert.match(b, /rd\.readAsDataURL\(f\)/);
    assert.match(b, /image_url/);
    assert.match(b, /messages:\s*\[\{ role: 'user', content: \[\{ type: 'text', text: pergunta \}/);
    for (const proibido of proibidos) assert.doesNotMatch(b, proibido);
    olhares.push(b);
  });
}
testa('memória e persona passam a declarar o limite local com honestidade', () => {
  for (const rota of rotas) {
    const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
    assert.match(html, /anotado só neste navegador; não é anexado automaticamente a motores externos/);
    assert.match(html, /selecionada localmente — não é anexada automaticamente a motores externos/);
    assert.doesNotMatch(html, /todos os motores sabem|todos os motores respondem como ela|persona desligada — respostas neutras|✅ATIVA/);
  }
});
testa('enxame e olhar mantêm paridade entre as quatro rotas', () => {
  for (const grupo of [enxames, olhares]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de contexto explícito passaram`);
process.exitCode = falhas ? 1 : 0;
