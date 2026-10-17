// Teste determinístico do placar: evita chamar qualidade operacional de "QI" e evita inflar a nota por repetição.
'use strict';
const assert = require('assert');
const { bateria, qualidadeRastreavel, avaliar, markdown } = require('../indice-capacidade');
let n = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
const agora = new Date().toISOString();
const completos = { continuidade: true, testes: true, vigia: true, evolucao: true, navegador: true, pesquisa: true, canais: true };
function registro(amostra, minutosAtras, ids, certos = 10) {
  return { quando: new Date(Date.now() - minutosAtras * 60000).toISOString(), amostra, banco: 'v2', ids, total: 10, certos, mudos: 0, rotas: { frota: 10 } };
}
const estadoVigia = { verificado_em: agora, itens: { A: { ok: true }, B: { ok: true } } };

ok('extrai média das baterias recentes', () => {
  const b = bateria('- 2026 — 10/10 (mudos: 0)\n- 2026 — 8/10 (mudos: 1)');
  assert.equal(b.amostras, 2); assert.equal(b.media, 0.9); assert.equal(b.mudos, 1);
});
ok('placar completo soma 100 sem chamar de QI', () => {
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: estadoVigia });
  assert.equal(p.total_em_100, 100); assert.match(p.aviso, /não teste de QI/i); assert.equal(p.dimensoes.length, 6);
});
ok('falhas do vigia reduzem o placar de confiabilidade', () => {
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: { verificado_em: agora, itens: { A: { ok: true }, B: { ok: false } } } });
  const d = p.dimensoes.find(x => x.nome === 'confiabilidade observada');
  assert(d.pontos < d.maximo);
});
ok('estado ausente continua explícito e finito', () => {
  const p = avaliar({ agora, arquivos: {}, saude: '', vigia: {}, qualidade: {} });
  assert(Number.isFinite(p.total_em_100)); assert(p.proximas_melhorias.length > 0);
});
ok('painel registra limitações honestas', () => {
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: estadoVigia });
  assert.match(markdown(p), /Limites honestos/); assert.match(markdown(p), /não teste de QI/i);
});
ok('amostras repetidas não certificam qualidade rastreável', () => {
  const h = { baterias: [
    registro('igual', 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    registro('igual', 2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    registro('igual', 3, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  ] };
  const q = qualidadeRastreavel(h, agora);
  assert.equal(q.valida, false); assert.equal(q.amostras, 1);
});
ok('três amostras recentes, distintas e amplas certificam qualidade', () => {
  const h = { baterias: [
    registro('a', 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    registro('b', 2, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
    registro('c', 3, [21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
  ] };
  const q = qualidadeRastreavel(h, agora);
  assert.equal(q.valida, true); assert.equal(q.cobertura, 30); assert.equal(q.media, 1);
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 8/10 (mudos: 0)', vigia: estadoVigia, qualidade: h });
  assert.equal(p.total_em_100, 100); assert.equal(p.sinais.qualidade_rastreavel, true);
});
ok('erro recente rastreável reduz a nota em vez de esconder a regressão', () => {
  const h = { baterias: [
    registro('a', 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 8),
    registro('b', 2, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
    registro('c', 3, [21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
  ] };
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: estadoVigia, qualidade: h });
  const d = p.dimensoes.find(x => x.nome === 'qualidade de respostas');
  assert(d.pontos < 20); assert.equal(p.total_em_100, 99);
});

console.log(`${n}/${n + falhas} testes do placar passaram`);
process.exitCode = falhas ? 1 : 0;
