// CONTRATO DO MUTADOR: suíte vermelha no código ORIGINAL não pode contar como morte.
//
// Por que existe (17/11/2026): rodei `mutador.js --todos` neste sandbox sem `npm install`, e o
// placar subiu de 36% para 46% sem nenhum contrato novo que justificasse. A causa não era
// teste melhor: `email-chat.js` nem carregava (`Cannot find module 'imapflow'`), então TODA
// suíte morria no require e TODO mutante virava "morto". Placar fabricado por ambiente.
//
// A regra que este contrato prende: antes de contar um kill, o mutador roda as suítes mapeadas
// no código intacto. Suíte que falha ali é DESCARTADA e o descarte aparece no placar — o mutador
// não pode esconder que mediu menos.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { verificaBaseline } = require('./mutador.js');

let total = 0; let okCount = 0;
function ok(nome, fn) {
  total++;
  try { fn(); okCount++; console.log('✔ ' + nome); }
  catch (e) { console.log('✘ ' + nome + ' → ' + e.message.split('\n')[0]); process.exitCode = 1; }
}

// Um "mundo" falso: um módulo trivial e três testes — dois verdes, um que já falha.
function mundo(tipoVermelha) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-'));
  fs.writeFileSync(path.join(dir, 'alvo.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(dir, 'verde.js'), 'console.log("ok");\n');
  fs.writeFileSync(path.join(dir, 'verde2.js'), 'console.log("ok");\n');
  if (tipoVermelha === 'falha') fs.writeFileSync(path.join(dir, 'vermelho.js'), 'process.exit(1);\n');
  else if (tipoVermelha === 'crash') fs.writeFileSync(path.join(dir, 'vermelho.js'), 'require("modulo-que-nao-existe");\n');
  else if (tipoVermelha === 'trava') fs.writeFileSync(path.join(dir, 'vermelho.js'), 'setTimeout(() => {}, 60000);\n');
  return dir;
}

ok('suíte que passa no original continua valendo como leitora', () => {
  const dir = mundo('nenhuma');
  const r = verificaBaseline(['verde.js', 'verde2.js'], { dir });
  assert.deepEqual(r.confiaveis, ['verde.js', 'verde2.js']);
  assert.deepEqual(r.descartadas, []);
});

ok('suíte que JÁ FALHA no original é descartada, com o motivo no placar', () => {
  const dir = mundo('falha');
  const r = verificaBaseline(['verde.js', 'vermelho.js'], { dir });
  assert.deepEqual(r.confiaveis, ['verde.js']);
  assert.deepEqual(r.descartadas.map(d => d.arquivo), ['vermelho.js']);
  assert.match(r.descartadas[0].motivo, /já falha no código original|código 1/);
});

ok('suíte que ESTOURA no require (dependência ausente) é descartada — o caso do imapflow', () => {
  const dir = mundo('crash');
  const r = verificaBaseline(['vermelho.js'], { dir });
  assert.deepEqual(r.confiaveis, []);
  assert.match(r.descartadas[0].motivo, /MODULE_NOT_FOUND|não carrega/);
});

ok('suíte que NÃO TERMINA não é confundida com morte nem com vida', () => {
  const dir = mundo('trava');
  const r = verificaBaseline(['vermelho.js'], { dir, limiteMs: 300 });
  assert.deepEqual(r.confiaveis, []);
  assert.match(r.descartadas[0].motivo, /não terminou/);
});

ok('baseline vazio devolve lista vazia em vez de liberar a varredura', () => {
  const dir = mundo('nenhuma');
  const r = verificaBaseline([], { dir });
  assert.deepEqual(r.confiaveis, []);
  assert.deepEqual(r.descartadas, []);
});

console.log('\n' + okCount + '/' + total + (okCount === total ? ' contratos do baseline do mutador passaram'
  : ' contratos do baseline do mutador passaram'));
if (okCount !== total) process.exitCode = 1;
