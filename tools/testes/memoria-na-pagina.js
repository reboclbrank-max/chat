// MEMÓRIA DE CONVERSA NA PÁGINA (31/10/2026) — contrato estático + execução do recorte.
//
// Antes: o roteador só era usado quando a conversa tinha UMA mensagem; na segunda pergunta a
// página esquecia tudo. Agora o histórico (até 6 falas) acompanha o pedido.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0; const falhas = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}
function fonte(r) { return fs.readFileSync(path.join(raiz, r), 'utf8'); }

for (const rota of rotas) {
  const src = fonte(rota);
  testa(rota + ': o roteador recebe o histórico (memória ligada)', () => {
    assert.match(src, /function historicoParaRoteador\(historico, maximo\)/);
    assert.match(src, /historico: historicoParaRoteador\(historico\)/);
  });
  testa(rota + ': !melhor também usa a memória local', () => {
    assert.match(src, /historico: historicoParaRoteador\(await historicoLocal\(\)\)/);
  });
  testa(rota + ': o roteador não é mais só de conversa de uma mensagem', () => {
    assert.doesNotMatch(src, /historico\.length === 1 && historico\[0\]\.role === 'user'/);
    assert.match(src, /const ultimaFala = Array\.isArray\(historico\)/);
  });
  testa(rota + ': system prompt não entra como fala do dono', () => {
    const inicio = src.indexOf('function historicoParaRoteador(');
    const fim = src.indexOf('async function pensarStream(', inicio);
    const bloco = src.slice(inicio, fim);
    assert.match(bloco, /m\.role === 'user' \|\| m\.role === 'assistant'/);
    assert.match(bloco, /slice\(0, -1\)/, 'a última fala é a pergunta atual e sai do contexto');
  });
}

// execução do recorte, com o histórico de verdade
function runtime(src) {
  const inicio = src.indexOf('function historicoParaRoteador(');
  const fim = src.indexOf('async function pensarStream(', inicio);
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src.slice(inicio, fim) + '\nglobalThis.h = historicoParaRoteador;', ctx);
  return ctx;
}
const r = runtime(fonte('index.html'));
testa('a última fala sai do contexto (ela é a pergunta) e o resto entra', () => {
  const h = r.h([
    { role: 'user', content: 'eu moro em Tobias Barreto' },
    { role: 'assistant', content: 'anotado' },
    { role: 'user', content: 'onde eu moro?' }
  ]);
  assert.equal(h.length, 2);
  assert.equal(h[1].content, 'anotado');
  assert(!h.some((m) => m.content === 'onde eu moro?'));
});
testa('system prompt e falas vazias são descartados', () => {
  const h = r.h([
    { role: 'system', content: 'Você é a Assistente Rebocl…' },
    { role: 'user', content: '   ' },
    { role: 'user', content: 'primeira pergunta' },
    { role: 'user', content: 'segunda pergunta' }
  ]);
  assert.deepEqual(h.map((m) => m.content), ['primeira pergunta']);
  assert(!h.some((m) => m.role === 'system'));
});
testa('o histórico enviado é curto (memória, não arrasto de tudo)', () => {
  const falas = [];
  for (let i = 0; i < 20; i++) { falas.push({ role: i % 2 ? 'assistant' : 'user', content: 'fala ' + i }); }
  falas.push({ role: 'user', content: 'pergunta atual' });
  const h = r.h(falas);
  assert(h.length <= 6, 'mandou ' + h.length + ' falas');
  assert.equal(h[h.length - 1].content, 'fala 19');
});
console.log('');
if (falhas.length) { console.error(falhas.length + ' de ' + (certos + falhas.length) + ' FALHARAM'); process.exit(1); }
console.log(certos + '/' + certos + ' verificações da memória na página passaram');
