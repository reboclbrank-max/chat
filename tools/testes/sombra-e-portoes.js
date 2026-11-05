// Contratos do modo sombra e dos quatro portões.
// O sombra é a peça que transforma "acho que a máquina acerta" em número; os portões são o
// que impede esse número de ser lido com otimismo.
'use strict';
const assert = require('assert');
const { vereditoSombra, registroDe, resumoDoRegistro, dentroDaFaixaHipotetica } = require('../sombra.js');
const { avaliaPortoes, aplicarMerges, incidentesObservados, CRITERIOS } = require('../portoes.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

const prOk = { numero: 7, estado: 'open', rascunho: false, deFork: false };
const arqs = lista => lista.map(f => ({ filename: f }));

// ---- sombra ----
ok('sombra separa o que acontece hoje do que aconteceria no degrau 4', () => {
  const v = vereditoSombra({ pr: prOk, arquivos: arqs(['tools/socorro.js']) });
  assert.equal(v.hoje.decidiria, 'recusar', 'hoje só texto entra');
  assert.equal(v.degrau4.decidiria, 'mesclar', 'no degrau 4 um arquivo não essencial entraria');
  assert.deepEqual(v.essenciais, []);
});

ok('sombra respeita o mapa de risco: essencial não entra nem no exercício', () => {
  const v = vereditoSombra({ pr: prOk, arquivos: arqs(['tools/email-chat.js']) });
  assert.equal(v.degrau4.decidiria, 'recusar');
  assert.deepEqual(v.essenciais, ['tools/email-chat.js']);
  assert.equal(dentroDaFaixaHipotetica('tools/email-chat.js'), false);
});

ok('PR só de texto entra hoje e entraria no degrau 4', () => {
  const v = vereditoSombra({ pr: prOk, arquivos: arqs(['docs/x.md']) });
  assert.equal(v.hoje.decidiria, 'mesclar');
  assert.equal(v.degrau4.decidiria, 'mesclar');
});

ok('registro guarda o que é preciso para julgar depois, inclusive o merge', () => {
  const r = registroDe({
    quando: '2026-11-05T05:00:00.000Z',
    pr: Object.assign({}, prOk, { mesclada: true, mergeSha: 'abc123' }),
    sha: 'sha-da-pr', titulo: 'exemplo', arquivos: arqs(['tools/socorro.js']), barreira: 'success'
  });
  assert.equal(r.barreira, 'success');
  assert.equal(r.mesclada, true);
  assert.equal(r.mergeSha, 'abc123');
  assert.equal(r.degrau4.decidiria, 'mesclar');
});

ok('resumo do registro conta o que interessa e nada além', () => {
  const base = { barreira: 'success', degrau4: { decidiria: 'mesclar' }, essenciais: [] };
  const registros = [
    base,
    Object.assign({}, base, { degrau4: { decidiria: 'recusar' }, essenciais: ['tools/email-chat.js'] }),
    Object.assign({}, base, { barreira: 'failure' })
  ];
  const r = resumoDoRegistro(registros);
  assert.equal(r.total, 3);
  assert.equal(r.verdes, 2);
  assert.equal(r.mesclariaDegrau4, 2);
  assert.equal(r.bloqueadasPorEssencial, 1);
  assert.deepEqual(r.essenciaisMaisFrequentes[0], ['tools/email-chat.js', 1]);
});

// ---- portões ----
const termometroOk = { aprovado: true, motivos: [] };
const termometroRuim = { aprovado: false, motivos: ['passo instável'] };
const semDeclaracao = { reversaoExercitada: false, ensaioComPrazo: false, mesSemIncidente: false };

ok('portão 1 segue o termômetro, sem interpretação', () => {
  const a = avaliaPortoes({ termometro: termometroOk, registros: [], falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(a.portoes[0].aberto, true);
  const b = avaliaPortoes({ termometro: termometroRuim, registros: [], falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(b.portoes[0].aberto, false);
  assert.match(b.portoes[0].porque, /passo instável/);
});

ok('portão 2 exige volume de registros E zero incidente', () => {
  const poucos = Array.from({ length: 5 }, () => ({ degrau4: { decidiria: 'mesclar' }, mergeSha: 'x' }));
  const a = avaliaPortoes({ termometro: termometroOk, registros: poucos, falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(a.portoes[1].aberto, false);
  assert.match(a.portoes[1].porque, /poucos registros/);

  const muitos = Array.from({ length: CRITERIOS.minimoDeRegistros }, () => ({ degrau4: { decidiria: 'mesclar' }, mergeSha: 'a' }));
  const b = avaliaPortoes({ termometro: termometroOk, registros: muitos, falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(b.portoes[1].aberto, true, b.portoes[1].porque);
});

ok('histórico sozinho não abre o portão 2: falta operação ao vivo', () => {
  const historicos = Array.from({ length: 40 }, (_, i) => ({ pr: i, origem: 'historico', degrau4: { decidiria: 'mesclar' }, mergeSha: 'h' + i }));
  const a = avaliaPortoes({ termometro: termometroOk, registros: historicos, falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(a.portoes[1].aberto, false);
  assert.match(a.portoes[1].porque, /ao vivo/);
  // Com 10 ao vivo no meio, o mesmo conjunto abre.
  const misto = historicos.slice(0, 30).concat(Array.from({ length: 10 }, (_, i) => ({ pr: 100 + i, degrau4: { decidiria: 'recusar' } })));
  const b = avaliaPortoes({ termometro: termometroOk, registros: misto, falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(b.portoes[1].aberto, true, b.portoes[1].porque);
  assert.equal(b.portoes[1].numeros.aoVivo, 10);
});

ok('um incidente derruba o portão 2 mesmo com muitos registros', () => {
  const registros = Array.from({ length: 40 }, (_, i) => ({ pr: i, degrau4: { decidiria: 'mesclar' }, mergeSha: 'sha' + i }));
  const a = avaliaPortoes({ termometro: termometroOk, registros, falhasNaMain: ['sha3'], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(a.portoes[1].aberto, false);
  assert.equal(a.incidentes.total, 1);
  assert.match(a.portoes[1].porque, /incidente/);
});

ok('incidente só conta quando a main vermelha é o commit que o degrau 4 teria mesclado', () => {
  const registros = [
    { degrau4: { decidiria: 'mesclar' }, mergeSha: 'meu' },
    { degrau4: { decidiria: 'recusar' }, mergeSha: 'nao-entraria' }
  ];
  assert.equal(incidentesObservados({ registros, falhasNaMain: ['nao-entraria'] }).total, 0);
  assert.equal(incidentesObservados({ registros, falhasNaMain: ['meu'] }).total, 1);
});

ok('o merge é resolvido na leitura: sem isso o portão 2 abriria sem evidência', () => {
  // O sombra grava no instante em que a barreira termina — antes do merge existir.
  const registros = [{ pr: 97, degrau4: { decidiria: 'mesclar' }, mergeSha: null, mesclada: false }];
  const comMerge = aplicarMerges(registros, [{ number: 97, merged_at: '2026-11-05T12:40:00Z', merge_commit_sha: 'abc999' }]);
  assert.equal(comMerge[0].mesclada, true);
  assert.equal(comMerge[0].mergeSha, 'abc999');
  // E agora o incidente é visível, como tem de ser.
  assert.equal(incidentesObservados({ registros: comMerge, falhasNaMain: ['abc999'] }).total, 1);
});

ok('PR não mesclada nunca conta como incidente, mesmo com sha parecido', () => {
  const comMerge = aplicarMerges([{ pr: 5, degrau4: { decidiria: 'mesclar' }, mergeSha: 'sha-de-teste' }],
    [{ number: 5, merged_at: null, merge_commit_sha: 'sha-de-teste' }]);
  assert.equal(comMerge[0].mergeSha, null);
  assert.equal(incidentesObservados({ registros: comMerge, falhasNaMain: ['sha-de-teste'] }).total, 0);
});

ok('portão 3 só abre com faixa, ensaio e volta — e hoje falta a volta', () => {
  const a = avaliaPortoes({ termometro: termometroOk, registros: [], falhasNaMain: [], autonomia: { nivel: 'texto' }, declarado: semDeclaracao });
  assert.equal(a.portoes[2].aberto, false);
  // A lista já tem o primeiro arquivo (portão 3, 05/11); o que falta é a reversão exercitada.
  assert.match(a.portoes[2].porque, /reversão nunca exercitada/);
  assert.equal(a.portoes[3].aberto, false);
  assert.equal(a.abertos, 1);
});

ok('nível código sem os portões abertos é ilegítimo — e o desligado é sempre legítimo', () => {
  const codigo = avaliaPortoes({ termometro: termometroRuim, registros: [], falhasNaMain: [], autonomia: { nivel: 'codigo' }, declarado: semDeclaracao });
  assert.equal(codigo.nivelLegitimo, false);
  const desligado = avaliaPortoes({ termometro: termometroRuim, registros: [], falhasNaMain: [], autonomia: { nivel: 'desligado' }, declarado: semDeclaracao });
  assert.equal(desligado.nivelLegitimo, true);
  const inventado = avaliaPortoes({ autonomia: { nivel: 'turbo' }, declarado: semDeclaracao });
  assert.equal(inventado.nivelLegitimo, false);
});

(async () => {
  let certos = 0, falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} contratos do sombra e dos portões passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
