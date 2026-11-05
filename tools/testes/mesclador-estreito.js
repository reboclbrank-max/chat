// Contrato do mesclador estreito (degrau 3): a faixa é estreita de propósito, e tudo
// que não é texto em docs/ ou posts/ reprova. Nenhum teste aqui usa rede.
'use strict';
const assert = require('assert');
const { caminhoPermitido, avalia, mergeDoMesclador, planoDeReversao, ramoDeReversao, MARCA } = require('../mesclador-estreito.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

const prOk = { numero: 1, estado: 'open', rascunho: false, deFork: false };
const arquivos = lista => lista.map(f => ({ filename: f }));

ok('texto em docs/ e posts/ está na faixa', () => {
  assert.equal(caminhoPermitido('docs/RODADA-1.md'), true);
  assert.equal(caminhoPermitido('posts/devlog/x.json'), true);
  assert.equal(caminhoPermitido('docs/sub/pasta/nota.md'), true);
});

ok('código, workflow, dependência e raiz estão fora da faixa', () => {
  for (const fora of ['tools/email-chat.js', '.github/workflows/x.yml', 'package.json',
    'package-lock.json', '.env', 'index.html', 'AGENTS.md', 'CONTINUIDADE.md',
    'tools/socorro.js', 'docs/executa.sh', 'posts/x.js']) {
    assert.equal(caminhoPermitido(fora), false, fora + ' deveria estar fora da faixa');
  }
});

ok('o turno de e-mail, os segredos e o postador são inalcançáveis por construção', () => {
  for (const critico of ['tools/email-poll.js', 'tools/email-chat.js', 'tools/vigia-casa.js',
    '.github/workflows/email.yml', 'tools/vigia-postador.js']) {
    assert.equal(caminhoPermitido(critico), false, critico + ' não pode ser mesclável sozinho');
  }
});

ok('PR só de texto pode entrar sozinha', () => {
  const d = avalia({ pr: prOk, arquivos: arquivos(['docs/nota.md', 'posts/p.md']) });
  assert.equal(d.pode, true);
  assert.equal(d.arquivos.length, 2);
});

ok('um único arquivo fora da faixa reprova a PR inteira', () => {
  const d = avalia({ pr: prOk, arquivos: arquivos(['docs/nota.md', 'tools/email-chat.js']) });
  assert.equal(d.pode, false);
  assert.match(d.motivo, /fora da faixa/);
  assert.deepEqual(d.fora, ['tools/email-chat.js']);
});

ok('fork, rascunho, PR fechada e PR grande ficam de fora', () => {
  assert.equal(avalia({ pr: Object.assign({}, prOk, { deFork: true }), arquivos: arquivos(['docs/a.md']) }).pode, false);
  assert.equal(avalia({ pr: Object.assign({}, prOk, { rascunho: true }), arquivos: arquivos(['docs/a.md']) }).pode, false);
  assert.equal(avalia({ pr: Object.assign({}, prOk, { estado: 'closed' }), arquivos: arquivos(['docs/a.md']) }).pode, false);
  const muitos = Array.from({ length: 25 }, (_, i) => 'docs/n' + i + '.md');
  assert.match(avalia({ pr: prOk, arquivos: arquivos(muitos) }).motivo, /grande demais/);
});

ok('PR sem arquivo identificado não é mesclada às cegas', () => {
  assert.equal(avalia({ pr: prOk, arquivos: [] }).pode, false);
  assert.equal(avalia({ pr: {}, arquivos: arquivos(['docs/a.md']) }).pode, false);
});

ok('só o merge marcado pelo mesclador é revertido', () => {
  const semMarca = [{ sha: 'aaa', commit: { message: 'docs: nota (#90)' } }];
  assert.equal(planoDeReversao({ commits: semMarca, arquivosDoMerge: arquivos(['docs/a.md']) }).reverter, false);
  const comMarca = [{ sha: 'bbb', commit: { message: MARCA + ' docs: nota (#90)' } }];
  assert.equal(planoDeReversao({ commits: comMarca, arquivosDoMerge: arquivos(['docs/a.md']) }).reverter, true);
});

ok('reversão também respeita a faixa', () => {
  const comMarca = [{ sha: 'bbb', commit: { message: MARCA + ' x' } }];
  const plano = planoDeReversao({ commits: comMarca, arquivosDoMerge: arquivos(['tools/email-chat.js']) });
  assert.equal(plano.reverter, false);
  assert.match(plano.motivo, /fora da faixa/);
});

ok('o ramo de reversão tem nome previsível e sem espaço', () => {
  assert.equal(ramoDeReversao('abcdef1234567'), 'reversao/mesclador-abcdef1234');
  assert(!/\s/.test(ramoDeReversao('x y')));
});

(async () => {
  let certos = 0;
  let falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} contratos do mesclador passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
