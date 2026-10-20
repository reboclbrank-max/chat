// Contrato: estudos do caderno não acompanham automaticamente a conversa remota.
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
function entre(html, inicio, fim) {
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return html.slice(a, b);
}
const sistemas = [];
const estudos = [];
for (const rota of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  testa(rota + ' não monta caderno local no prompt remoto geral', () => {
    const sistema = entre(html, "const system = { role: 'system'", '\n  for (const m of ouroFiltrado())');
    assert.equal(/cadernoSys|rebocl_caderno|CADERNO DA CASA/.test(sistema), false, 'caderno local no prompt geral');
    sistemas.push(sistema);
  });
  testa(rota + ' não mantém helper de caderno para injeção automática', () => {
    assert.equal(/window\.cadernoSys/.test(html), false, 'helper automático ainda presente');
  });
  testa(rota + ' declara que estudo local só entra por escolha explícita', () => {
    const estudo = entre(html, "(function () { const CHAVE = 'rebocl_caderno';", '\n\n;\n');
    assert.equal(/alimenta todas as respostas/.test(estudo), false, 'mensagem ainda promete injeção automática');
    assert.match(estudo, /fica neste navegador; comandos explícitos da casa podem usar quando você os escolhe/);
    for (const comando of ["if (m.startsWith('!hibrido '))", "if (m.startsWith('!unico'))", "if (m.startsWith('!core '))", "if (m.startsWith('!uniao '))"]) assert.notEqual(html.indexOf(comando), -1, comando);
    estudos.push(estudo);
  });
}
testa('contrato de caderno mantém paridade nas quatro rotas', () => {
  for (const grupo of [sistemas, estudos]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de caderno com contexto explícito passaram`);
process.exitCode = falhas ? 1 : 0;
