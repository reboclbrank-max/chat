// Contrato: fatos da memória profunda ficam no navegador e não entram no prompt remoto automaticamente.
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
const helpers = [];
const sistemas = [];
const lembretes = [];
for (const rota of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  testa(rota + ' não monta memória profunda no prompt do cérebro remoto', () => {
    const sistema = entre(html, "const system = { role: 'system'", '\n  for (const m of ouroFiltrado())');
    assert.doesNotMatch(sistema, /profundaSys|rebocl_profunda|MEMÓRIA PROFUNDA/);
    assert.doesNotMatch(html, /window\.profundaSys/);
    sistemas.push(sistema);
  });
  testa(rota + ' reconhece lembrar, criar e fábrica na porta privada local', () => {
    const helper = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const fn = new Function(helper + '\nreturn ehComandoPrivadoLocal;')();
    for (const entrada of ['!lembrar fato privado', '!lembrar', '!criar !minha ferramenta descrição', '!criar', '!fabrica']) assert.equal(fn(entrada), true, entrada);
    for (const entrada of ['!lembrancax', '!criatura tema', '!fabricante']) assert.equal(fn(entrada), false, entrada);
    const criar = entre(html, "if (m === '!criar' || m.startsWith('!criar '))", "\n  if (m === '!fabrica' || m.startsWith('!fabrica '))");
    const fabrica = entre(html, "if (m === '!fabrica' || m.startsWith('!fabrica '))", "\n  if (m.startsWith('!painel'))");
    assert.match(criar, /rebocl_fabrica/);
    assert.doesNotMatch(criar + fabrica, /fetch\s*\(|api\s*\(/);
    helpers.push(helper);
  });
  testa(rota + ' lembrar armazena localmente e declara o limite honesto', () => {
    const lembrar = entre(html, "if (m === '!lembrar' || m.startsWith('!lembrar '))", "\n  if (m.startsWith('!core '))");
    assert.match(lembrar, /rebocl_profunda/);
    assert.match(lembrar, /não são anexados automaticamente a motores externos/);
    assert.doesNotMatch(lembrar, /fetch\s*\(|api\s*\(/);
    lembretes.push(lembrar);
  });
}
testa('contrato de memória profunda mantém paridade nas quatro rotas', () => {
  for (const grupo of [helpers, sistemas, lembretes]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de memória profunda privada passaram`);
process.exitCode = falhas ? 1 : 0;
