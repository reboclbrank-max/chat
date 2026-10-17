// Testes offline da bateria rastreável: seleção, sanitização e deduplicação de evidência.
'use strict';
const assert = require('assert');
const { normalizaAmostra, selecionaQuestoes, atualizaHistorico, respostaAceita, textoUtil, rotasTexto } = require('../evolucao-chat');
let n = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
const banco = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, q: 'q' + (i + 1), g: ['x'] }));
const bancoV2 = require('../../banco-v2.json').questoes;

ok('a mesma amostra sempre seleciona a mesma bateria sem repetir questão', () => {
  const a = selecionaQuestoes(banco, 10, 'auditoria-a').map(x => x.id);
  const b = selecionaQuestoes(banco, 10, 'auditoria-a').map(x => x.id);
  assert.deepEqual(a, b); assert.equal(new Set(a).size, 10);
});
ok('amostras distintas criam ordem diferente', () => {
  const a = selecionaQuestoes(banco, 10, 'auditoria-a').map(x => x.id).join(',');
  const b = selecionaQuestoes(banco, 10, 'auditoria-b').map(x => x.id).join(',');
  assert.notEqual(a, b);
});
ok('identificador de amostra não carrega caracteres de entrada livres', () => {
  assert.equal(normalizaAmostra('  AUDITÓRIA <privada>/1  '), 'audit-ria-privada-1');
  assert.equal(normalizaAmostra('', 'diaria-2026-10-17'), 'diaria-2026-10-17');
});
ok('histórico substitui a mesma amostra e limita retenção', () => {
  const velho = { baterias: [{ amostra: 'a', quando: '2026-01-01T00:00:00Z', ids: [1], total: 1, certos: 0 }] };
  const novo = { amostra: 'a', quando: '2026-01-02T00:00:00Z', ids: [2], total: 1, certos: 1, mudos: 0 };
  const h = atualizaHistorico(velho, novo);
  assert.equal(h.baterias.length, 1); assert.equal(h.baterias[0].certos, 1); assert.match(h.aviso, /sem e-mails/i);
});
ok('texto de cota HTTP 200 não conta como resposta útil', () => {
  assert.equal(textoUtil('The API key used for this request has reached its quota'), false);
  assert.equal(textoUtil('42'), true);
});
ok('gabarito reconhece formulação semântica prevista', () => {
  assert.equal(respostaAceita('Erro que indica página não encontrada.', ['não encontrado', 'página não encontrada']), true);
  assert.equal(respostaAceita('página encontrada', ['não encontrado', 'página não encontrada']), false);
});
ok('bateria cobre as quatro rotas de texto do canal real', () => {
  const rotas = rotasTexto('pergunta pública');
  assert.deepEqual(rotas.map(r => r[0]), ['frota', 'reserva', 'llm7', 'omni']);
  assert(rotas.every(r => /^https:\/\//.test(r[1])));
});
ok('fato geográfico auditado não aceita estado incorreto no gabarito', () => {
  const q = bancoV2.find(x => x.id === 118);
  assert(q); assert.equal(respostaAceita('Bahia', q.g), true); assert.equal(respostaAceita('Minas Gerais', q.g), false);
});

console.log(`${n}/${n + falhas} testes da evolução passaram`);
process.exitCode = falhas ? 1 : 0;
