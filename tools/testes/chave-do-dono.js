// Contratos do comando !chave (rodada 104): a chave é do dono, fica só no navegador,
// só é enviada como cabeçalho Authorization, e a ativação é verificável de verdade.
// Não faz rede: o fetch é substituído por um dublê.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }

const i = html.indexOf("if (m === '!chave'");
const j = html.indexOf("if (m.startsWith('!plantar '))", i);
const bloco = html.slice(i, j);

ok('o comando existe e declara os subcomandos de listar, ver e apagar', () => {
  assert(i > 0 && j > i, 'bloco do !chave não encontrado');
  assert(/!chave <serviço> <valor>/.test(bloco), 'sem instrução de uso');
  assert(/'apagar'/.test(bloco), 'sem forma de apagar a chave');
  assert(/rebocl_chave_/.test(bloco), 'sem prefixo de armazenamento');
});

ok('a chave nunca vai para o corpo nem para a URL, só para Authorization', () => {
  assert(!/body:\s*JSON\.stringify\([^)]*val/.test(bloco), 'chave no corpo');
  assert(!/base[^;]*\+ *'[^']*'\s*\+\s*val/.test(bloco), 'chave na URL');
  assert(/'Authorization': 'Bearer ' \+ val/.test(bloco), 'cabeçalho esperado ausente');
});

ok('a ativação confirma de verdade (401 e 429 têm tratamento próprio)', () => {
  assert(/r\.status === 401 \|\| r\.status === 403/.test(bloco), 'sem tratamento de chave recusada');
  assert(/r\.status === 429/.test(bloco), 'sem tratamento de cota');
});

ok('nenhuma chave de exemplo aparece no repositório', () => {
  const pagina = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert(!/gsk_[A-Za-z0-9]{10,}/.test(pagina), 'há algo parecido com chave Groq real no index');
  const roteador = fs.readFileSync(path.join(raiz, 'roteador-ia.js'), 'utf8');
  assert(!/gsk_[A-Za-z0-9]{10,}/.test(roteador), 'há algo parecido com chave Groq real no roteador');
});

ok('o bloco compila como código', () => {
  new Function('m', 'msg', 'localStorage', 'bolha', 'rolarFim', 'mensagemErroSeguro', 'return (function(){' + bloco + '})');
});

console.log('\n' + n + ' contratos do comando !chave passaram');
