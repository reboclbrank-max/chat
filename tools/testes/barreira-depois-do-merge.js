// 🕳️ O buraco de 06/11: merge do robô não gera evento de push, então a barreira não rodava
// na main depois de um merge do mesclador. Medido na API: o merge [mesclador] 6cec24c20d não
// tem execução de push nenhuma. Sem a barreira, a main podia ficar quebrada em silêncio e a
// reversão automática — que escuta falha de main — nunca teria o que escutar.
'use strict';
const assert = require('assert');
const { avaliar } = require('../mesclador-estreito.js');

const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

const PR = { number: 7, state: 'open', draft: false, title: 'nota', head: { sha: 'abc1234567', repo: { full_name: 'o/r' } } };

function githubFalso({ dispatchFalha = false } = {}) {
  const chamadas = [];
  const api = async (rota, opcoes = {}) => {
    chamadas.push({ rota, metodo: opcoes.metodo || 'GET', corpo: opcoes.corpo });
    if (/\/pulls\?state=open/.test(rota)) return [PR];
    if (/\/pulls\/\d+\/files/.test(rota)) return [{ filename: 'docs/nota.md' }];
    if (/\/pulls\/\d+\/merge$/.test(rota)) return { merged: true };
    if (/\/actions\/workflows\/.*\/dispatches$/.test(rota)) {
      if (dispatchFalha) throw new Error('HTTP 403 na dispatch');
      return {};
    }
    throw new Error('rota inesperada: ' + rota);
  };
  return { api, chamadas };
}

ok('depois de mesclar, o mesclador pede a barreira na main', async () => {
  const falso = githubFalso();
  await avaliar({ token: 'x', repo: 'o/r', sha: 'abc1234567', dono: 'eu', api: falso.api });
  const dispatch = falso.chamadas.find(c => /\/dispatches$/.test(c.rota));
  assert.ok(dispatch, 'sem a dispatch, a main fica sem barreira depois de um merge do robô');
  assert.equal(dispatch.metodo, 'POST');
  assert.equal(dispatch.corpo.ref, 'main', 'a barreira tem de olhar a main, não o ramo da PR');
  assert.match(dispatch.rota, /testes-rapidos/, 'é a barreira que precisa rodar');
  // E a ordem importa: primeiro o merge, depois o pedido.
  const iMerge = falso.chamadas.findIndex(c => /\/merge$/.test(c.rota));
  const iDispatch = falso.chamadas.findIndex(c => /\/dispatches$/.test(c.rota));
  assert.ok(iMerge < iDispatch, 'pedir a barreira antes do merge testaria a main velha');
});

ok('barreira que não pôde ser pedida não desfaz o merge nem mente', async () => {
  const falso = githubFalso({ dispatchFalha: true });
  let errore = null;
  try { await avaliar({ token: 'x', repo: 'o/r', sha: 'abc1234567', dono: 'eu', api: falso.api }); }
  catch (e) { errore = e; }
  assert.equal(errore, null, 'o merge já aconteceu: derrubar o job depois disso não conserta nada');
  assert.ok(falso.chamadas.some(c => /\/merge$/.test(c.rota)), 'o merge não é desfeito pela falha do pedido');
});

ok('PR recusada não pede barreira nenhuma', async () => {
  const falso = githubFalso();
  const apiRecusa = async (rota, opcoes = {}) => {
    if (/\/pulls\/\d+\/files/.test(rota)) return [{ filename: 'tools/vigia-casa.js' }];
    return falso.api(rota, opcoes);
  };
  await avaliar({ token: 'x', repo: 'o/r', sha: 'abc1234567', dono: 'eu', api: apiRecusa });
  assert.equal(falso.chamadas.some(c => /\/dispatches$/.test(c.rota)), false,
    'recusa não gasta execução de barreira');
});

ok('nível desligado não mescla nem pede barreira', async () => {
  const falso = githubFalso();
  // nivelLocal lê autonomia.json do repositório; aqui ele está em 'texto', então a PR
  // de documento entraria. O contrato do desligado é coberto em autonomia-e-risco.
  await avaliar({ token: 'x', repo: 'o/r', sha: 'nao-existe', dono: 'eu', api: falso.api });
  assert.equal(falso.chamadas.some(c => /\/dispatches$/.test(c.rota)), false,
    'PR que não existe não gera pedido de barreira');
});

(async () => {
  let falhas = 0;
  for (const c of casos) {
    try { await c.fn(); }
    catch (e) { falhas++; console.error('✘ ' + c.nome + ' → ' + (e && e.message)); }
  }
  if (falhas) { console.error(falhas + '/' + casos.length + ' falharam'); process.exitCode = 1; return; }
  console.log('✔ ' + casos.length + '/' + casos.length + ' contratos da barreira depois do merge passaram');
})();
