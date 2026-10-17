// Teste determinístico do placar: evita chamar qualidade operacional de "QI".
'use strict';
const assert = require('assert');
const { bateria, avaliar, markdown } = require('../indice-capacidade');
let n = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { console.error('✘ ' + nome + ' — ' + e.message); process.exitCode = 1; } }
const agora = new Date().toISOString();
const completos = { continuidade: true, testes: true, vigia: true, evolucao: true, navegador: true, pesquisa: true, canais: true };

ok('extrai média das baterias recentes', () => {
  const b = bateria('- 2026 — 10/10 (mudos: 0)\n- 2026 — 8/10 (mudos: 1)');
  assert.equal(b.amostras, 2); assert.equal(b.media, 0.9); assert.equal(b.mudos, 1);
});
ok('placar completo soma 100 sem chamar de QI', () => {
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: { verificado_em: agora, itens: { A: { ok: true }, B: { ok: true } } } });
  assert.equal(p.total_em_100, 100); assert.match(p.aviso, /não teste de QI/i); assert.equal(p.dimensoes.length, 6);
});
ok('falhas do vigia reduzem o placar de confiabilidade', () => {
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: { verificado_em: agora, itens: { A: { ok: true }, B: { ok: false } } } });
  const d = p.dimensoes.find(x => x.nome === 'confiabilidade observada');
  assert(d.pontos < d.maximo);
});
ok('estado ausente continua explícito e finito', () => {
  const p = avaliar({ agora, arquivos: {}, saude: '', vigia: {} });
  assert(Number.isFinite(p.total_em_100)); assert(p.proximas_melhorias.length > 0);
});
ok('painel registra limitações honestas', () => {
  const p = avaliar({ agora, arquivos: completos, saude: '- agora — 10/10 (mudos: 0)', vigia: { verificado_em: agora, itens: { A: { ok: true } } } });
  assert.match(markdown(p), /Limites honestos/); assert.match(markdown(p), /não teste de QI/i);
});
console.log(`${n}/5 testes do placar passaram`);
