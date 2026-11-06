// Contrato do caminho que o repositório nos obrigou a ter — 05/11/2026.
//
// Quando a main ficou vermelha de verdade, o job de reversão morreu em
// "HTTP 403 GitHub Actions is not permitted to create or approve pull requests".
// A trava existia, estava testada e não funcionava. A correção cai para `POST /merges`
// quando a PR é proibida — e é isso que este contrato prova, com um GitHub de mentira:
// nenhum token, nenhuma rede, nenhuma conta.
'use strict';
const assert = require('assert');
const { reverter, MARCA } = require('../mesclador-estreito.js');

const MERGE = 'aaaabbbbccccddddeeeeffff0000111122223333';
const PAI = '9999888877776666555544443333222211110000';

// GitHub falso: guarda as chamadas e responde o mínimo que o fluxo precisa.
function githubFalso({ proibePR }) {
  const chamadas = [];
  return {
    chamadas,
    api: async (rota, { metodo = 'GET', corpo } = {}) => {
      chamadas.push({ rota, metodo, corpo });
      if (rota.includes('/commits?sha=main')) {
        return [{ sha: MERGE, commit: { message: MARCA + ' docs: algo (#1)' } }];
      }
      if (rota === '/repos/o/r/commits/' + MERGE) {
        return { sha: MERGE, parents: [{ sha: PAI }], files: [{ filename: 'docs/x.md' }] };
      }
      if (rota.includes('/git/ref/heads/')) { const e = new Error('HTTP 404'); e.status = 404; throw e; }
      if (rota.includes('/contents/') && rota.includes('?ref=' + PAI)) return { content: 'Y29udGV1ZG8gYW50ZXJpb3I=' };
      if (rota.includes('/contents/') && rota.includes('?ref=')) return { sha: 'sha-do-arquivo', content: 'bm92bw==' };
      if (rota === '/repos/o/r/pulls') {
        if (proibePR) throw new Error('/repos/o/r/pulls -> HTTP 403 GitHub Actions is not permitted to create or approve pull requests.');
        return { number: 7 };
      }
      if (rota === '/repos/o/r/merges') return { sha: 'fffeeedd' };
      return {};
    }
  };
}

const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

ok('quando a PR é proibida, a reversão vai por merge do ramo na main', async () => {
  const falso = githubFalso({ proibePR: true });
  await reverter({ token: 'x', repo: 'o/r', shaVermelho: MERGE, api: falso.api });
  const fusao = falso.chamadas.find(c => c.rota === '/repos/o/r/merges');
  assert.ok(fusao, 'deveria ter chamado POST /merges');
  assert.equal(fusao.metodo, 'POST');
  assert.equal(fusao.corpo.base, 'main');
  assert.match(fusao.corpo.head, /^reversao\/mesclador-/);
  assert.match(fusao.corpo.commit_message, /reversão automática|reversao automatica/);
  // E nunca tentou empurrar nada direto na main.
  assert.equal(falso.chamadas.some(c => c.metodo === 'PUT' && String(c.rota).includes('contents/docs/x.md') && c.corpo && c.corpo.branch === 'main'), false);
});

ok('quando a PR é permitida, o caminho normal continua sendo PR', async () => {
  const falso = githubFalso({ proibePR: false });
  await reverter({ token: 'x', repo: 'o/r', shaVermelho: MERGE, api: falso.api });
  assert.ok(falso.chamadas.some(c => c.rota === '/repos/o/r/pulls' && c.metodo === 'POST'));
  assert.equal(falso.chamadas.some(c => c.rota === '/repos/o/r/merges'), false);
});

ok('recusa que não seja o 403 do GitHub não vira merge silencioso', async () => {
  const falso = githubFalso({ proibePR: true });
  const apiComFalha = async (rota, opcoes) => {
    if (rota === '/repos/o/r/pulls') throw new Error('/repos/o/r/pulls -> HTTP 500 servidor explodiu');
    return falso.api(rota, opcoes);
  };
  let errore = null;
  try { await reverter({ token: 'x', repo: 'o/r', shaVermelho: MERGE, api: apiComFalha }); } catch (e) { errore = e; }
  assert.ok(errore, 'erro que não é 403 tem de subir, não ser engolido');
  assert.match(String(errore.message), /HTTP 500/);
  assert.equal(falso.chamadas.some(c => c.rota === '/repos/o/r/merges'), false, 'não pode mascarar erro alheio com merge');
});

ok('a reversão não repete tentativa já feita', async () => {
  const falso = githubFalso({ proibePR: true });
  const apiOriginal = falso.api;
  falso.api = async (rota, opcoes) => {
    if (rota.includes('/git/ref/heads/')) return { ref: 'refs/heads/reversao/mesclador-' + MERGE.slice(0, 10) };
    return apiOriginal(rota, opcoes);
  };
  const antes = falso.chamadas.length;
  await reverter({ token: 'x', repo: 'o/r', shaVermelho: MERGE, api: falso.api });
  const novas = falso.chamadas.slice(antes);
  assert.equal(novas.some(c => c.metodo === 'POST' && c.rota.endsWith('/pulls')), false);
  assert.equal(novas.some(c => c.rota === '/repos/o/r/merges'), false);
});

ok('depois de reverter por merge, a reversão pede a barreira na main', async () => {
  // Medido no ensaio de 06/11: o merge do robô não gera evento de push, então a main
  // revertida ficava sem barreira — justo no momento em que alguém precisa saber se ela
  // voltou sã.
  const falso = githubFalso({ proibePR: true });
  await reverter({ token: 'x', repo: 'o/r', shaVermelho: MERGE, api: falso.api });
  const dispatch = falso.chamadas.find(c => /\/actions\/workflows\/.*\/dispatches$/.test(c.rota));
  assert.ok(dispatch, 'a reversão precisa pedir a barreira depois de mesclar');
  assert.equal(dispatch.corpo.ref, 'main');
  const iMerge = falso.chamadas.findIndex(c => c.rota === '/repos/o/r/merges');
  const iDispatch = falso.chamadas.findIndex(c => /\/dispatches$/.test(c.rota));
  assert.ok(iMerge >= 0 && iMerge < iDispatch, 'primeiro mescla, depois pede');
});

ok('reversão que não aconteceu não pede barreira', async () => {
  const falso = githubFalso({});
  await reverter({ token: 'x', repo: 'o/r', shaVermelho: 'nao-existe', api: falso.api });
  assert.equal(falso.chamadas.some(c => /\/dispatches$/.test(c.rota)), false);
});

(async () => {
  let certos = 0, falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} contratos do caminho de reversão passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
