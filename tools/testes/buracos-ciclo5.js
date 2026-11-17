// BURACOS DO CICLO 5 — dois sítios que estavam na lista dos 12 e ninguém prendia.
//
// Escolha declarada (relatório §5.5): os de maior risco ENTRE os que dá para medir sem
// inventar um harness novo às pressas. `chat-workspace.js` tem 4 dos 12 e é o pior por
// consequência, mas é IIFE de navegador sem export: prendê-lo exige IndexedDB + DOM falsos,
// e harness escrito com pressa prova o harness, não o produto. Fica declarado em aberto.
//
// Caso 1 — tools/mesclador-estreito.js:213
//   `const jaTentado = await chamar(.../git/ref/heads/<ramo>)`
//   Sem o await, `jaTentado` é uma Promise — objeto sempre verdadeiro. O código conclui
//   "essa reversão já foi tentada antes — não repito" e SAI. Resultado: quando a main fica
//   vermelha por um merge do próprio mesclador, a reversão automática nunca acontece, e o
//   log diz que ela já tinha acontecido. Mentira silenciosa no pior momento possível.
//
// Caso 2 — roteador-ia.js:3023
//   `var leve = await this._responderNucleo({... resgate: true ...})`
//   Sem o await, `leve` é a promessa. `textoDe(promessa)` devolve vazio, a checagem de eco
//   reprova, e o resgate desce para a 2ª tentativa — que com nenhuma rota viva devolve null.
//   O caminho que existe justamente para quando tudo caiu é o que para de funcionar.
'use strict';
const assert = require('assert');
const path = require('path');

let total = 0; let certos = 0;
function ok(nome, fn) {
  total++;
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { console.log('✘ ' + nome + ' → ' + String(e.message).split('\n')[0]); process.exitCode = 1; }
}
function okAsync(nome, fn) {
  total++;
  return fn().then(() => { certos++; console.log('✔ ' + nome); })
    .catch((e) => { console.log('✘ ' + nome + ' → ' + String(e.message).split('\n')[0]); process.exitCode = 1; });
}

const RAIZ = path.resolve(__dirname, '..', '..');

// ── Caso 1: a reversão do mesclador acontece de verdade ──────────────────────
function apiFalsa(registro) {
  const MERGE = 'ab12cd34ef56aa11bb22cc33dd44ee55ff66aa77';
  const PAI = 'pai0000000000000000000000000000000000000';
  const RAMO = 'reversao/mesclador-ab12cd34ef';
  const respostas = {
    ['/repos/rebo/chat/commits?sha=main&per_page=10']: [
      { sha: MERGE, commit: { message: '[mesclador] docs: entrada de texto' } }
    ],
    ['/repos/rebo/chat/commits/' + MERGE]: {
      sha: MERGE, parents: [{ sha: PAI }], files: [{ filename: 'docs/nota.md' }]
    },
    ['/repos/rebo/chat/contents/docs/nota.md?ref=' + PAI]: { content: 'dGV4dG8gYW50aWdv' },
    ['/repos/rebo/chat/contents/docs/nota.md?ref=' + RAMO]: { sha: 'blob-atual' }
  };
  async function api(url, opcoes) {
    registro.push(((opcoes && opcoes.metodo) || 'GET') + ' ' + url);
    if (respostas[url] !== undefined) return respostas[url];
    if (url.endsWith('/pulls')) return { number: 77 };
    if (url.endsWith('/git/refs')) return { ref: 'refs/heads/' + RAMO };
    if (url.startsWith('/repos/rebo/chat/contents/')) return { content: { sha: 'ok' } };
    // o ramo de reversão ainda não existe: 404 é o caminho normal, e o código trata com catch
    const erro = new Error('Not Found');
    erro.status = 404;
    throw erro;
  }
  return { api, MERGE, RAMO };
}

// ── Caso 2: o resgate do roteador usa o caminho leve de verdade ───────────────
function roteadorComLeve(registro) {
  const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
  const r = new Roteador({ catalogo: [], lerChave: () => null });
  r._responderNucleo = async function (pedido) {
    registro.push('nucleo:' + (pedido && pedido.dificuldade));
    return { texto: 'O resultado da conta é sete.', rota: 'leve-teste' };
  };
  return r;
}

(async () => {
  // 1 ────────────────────────────────────────────────────────────────────────
  await okAsync('mesclador:213 — a reversão automática ACONTECE (ramo criado e arquivo reposto)', async () => {
    const { reverter } = require(path.join(RAIZ, 'tools', 'mesclador-estreito.js'));
    const registro = [];
    const { api, MERGE, RAMO } = apiFalsa(registro);
    await reverter({ token: 'x', repo: 'rebo/chat', shaVermelho: MERGE, api });

    const posto = registro.filter(l => l.startsWith('PUT /repos/rebo/chat/contents/docs/nota.md'));
    assert.equal(posto.length, 1, 'esperava exatamente um PUT repondo docs/nota.md; veio ' + posto.length +
      ' · chamadas: ' + registro.join(' | '));
    const criouRamo = registro.filter(l => l === 'POST /repos/rebo/chat/git/refs');
    assert.equal(criouRamo.length, 1, 'esperava criar o ramo de reversão');
    assert.ok(registro.some(l => l.includes('/git/ref/heads/' + RAMO)), 'esperava a checagem "já tentado"');
    const iPull = registro.findIndex(l => l.endsWith('/pulls'));
    assert.ok(iPull > 0, 'esperava abrir a PR de reversão; chamadas: ' + registro.join(' | '));
  });

  // 2 ────────────────────────────────────────────────────────────────────────
  await okAsync('roteador:3023 — o resgate entrega a resposta do caminho leve, não uma promessa', async () => {
    const registro = [];
    const r = roteadorComLeve(registro);
    const resposta = await r._resgate({ pergunta: 'quanto é três mais quatro?' });
    assert.ok(resposta && typeof resposta === 'object', 'o resgate devolveu ' + String(resposta));
    assert.equal(resposta.texto, 'O resultado da conta é sete.',
      'o caminho leve devolveu promessa em vez de texto — o resgate caiu para a 2ª tentativa');
    assert.equal(resposta.resgate, true, 'a resposta do caminho leve tem de vir marcada como resgate');
    assert.deepEqual(registro, ['nucleo:leve'], 'esperava UMA tentativa leve, na dificuldade "leve"; veio ' + registro.join(','));
  });

  console.log('\n' + certos + '/' + total + ' buracos do ciclo 5 presos');
})();
