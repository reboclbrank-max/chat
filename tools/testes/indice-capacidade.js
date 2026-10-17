// Teste determinístico do placar: evita chamar qualidade operacional de "QI" e evita inflar a nota por repetição.
'use strict';
const assert = require('assert');
const { bateria, qualidadeRastreavel, resultadoCanalReal, estadoCanalReal, avaliar, markdown } = require('../indice-capacidade');
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
  assert.equal(p.total_em_100, 100); assert.match(p.aviso, /não (é )?teste de QI/i); assert.equal(p.dimensoes.length, 6);
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
  assert.match(markdown(p), /Limites honestos/); assert.match(markdown(p), /não (é )?teste de QI/i);
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
ok('resultado de canal real é separado do indicador interno', () => {
  const dir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'capacidade-canal-'));
  try {
    require('fs').writeFileSync(require('path').join(dir, 'teste-email-r3-2026-10-17-1510.md'), '# prova\n- enviados: 38 · respondidos: 37 · checagens PASS: 37/38 · falhas: 1\n');
    const r = resultadoCanalReal(dir);
    assert.deepEqual(r, { arquivo: 'provas/teste-email-r3-2026-10-17-1510.md', enviados: 38, respondidos: 37, passou: 37, total: 38, falhas: 1 });
    assert.equal(estadoCanalReal(r).nivel, 'falha');
  } finally { require('fs').rmSync(dir, { recursive: true, force: true }); }
});
ok('falha do canal aparece antes do placar e não é mascarada pelo 100 interno', () => {
  const canal = { arquivo: 'provas/exemplo.md', enviados: 2, respondidos: 1, passou: 1, total: 2, falhas: 1 };
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: estadoVigia, canalReal: canal });
  assert.equal(p.total_em_100, 100);
  assert.equal(p.canal_real.nivel, 'falha');
  assert.match(markdown(p), /Estado do canal real/);
  assert.match(markdown(p), /produto não aprovado integralmente/);
});

console.log(`${n}/${n + falhas} testes do placar passaram`);
process.exitCode = falhas ? 1 : 0;
