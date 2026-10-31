// SEM DEPENDÊNCIA — o guarda do "ilimitado" (rodada 138, 31/10/2026).
//
// O dono pediu algo que "não dependa de ninguém" e que seja "ilimitado". Ilimitado de verdade
// significa: com a rede toda caída, o produto continua respondendo o que ele sabe, na hora, sem
// inventar nada — e quando não sabe, diz que não sabe em vez de esperar.
//
// Este teste cobra cinco coisas medidas, não prometidas:
//   1. queda total: o gabarito é respondido offline (>= 85%) e com ZERO respostas erradas;
//   2. sem rede não se espera: a pior pergunta offline tem de voltar rápido (disjuntor de rede);
//   3. o disjuntor abre depois de falhas de rede seguidas e fecha quando uma rota volta;
//   4. redundância: o catálogo tem vários provedores independentes e nenhum exige chave por padrão;
//   5. a auditoria de dependências roda e não inventa nota (JSON com números).
'use strict';
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
let certos = 0;
const falhas = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}

testa('queda total: responde offline sem inventar, e sem esperar', () => {
  const saida = execFileSync(process.execPath, [path.join(RAIZ, 'tools', 'auditoria-dependencias.js'), '--json', '--rapido'],
    { cwd: RAIZ, encoding: 'utf8', timeout: 300000 });
  const rel = JSON.parse(saida);
  const q = rel.quedaTotal;
  assert.deepEqual(q.erradas, [], 'resposta ERRADA sem rede: ' + q.erradas.join(' | '));
  assert(q.respondidas / q.total >= 0.85, 'offline cobriu só ' + q.respondidas + '/' + q.total);
  assert(q.piorMs < 5000, 'sem rede o produto esperou ' + q.piorMs + ' ms (disjuntor não funcionou)');
  assert(rel.veredito.erradasSemRede === 0, 'veredito contradiz a medição');
});

testa('redundância: vários provedores independentes, nenhum obrigatório com chave', () => {
  const saida = execFileSync(process.execPath, [path.join(RAIZ, 'tools', 'auditoria-dependencias.js'), '--json', '--rapido'],
    { cwd: RAIZ, encoding: 'utf8', timeout: 300000 });
  const inv = JSON.parse(saida).inventario;
  assert(inv.rotasModelo >= 10, 'poucas rotas de modelo: ' + inv.rotasModelo);
  assert(inv.hostsModelo >= 3, 'poucos provedores independentes: ' + inv.hostsModelo);
  assert(inv.comChave <= 1, 'mais de uma rota exige chave do dono: ' + inv.comChave);
});

(async () => {
  const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
  const r = new Roteador({ amostrasAberto: 1, limiteFalhasRede: 3, pausaRedeMs: 60000 });
  let chamadas = 0;
  global.fetch = function () { chamadas++; return Promise.reject(new Error('sem rede (teste)')); };
  // rota ANÔNIMA: a primeira do catálogo pode exigir chave e aí nem chega na rede
  const rota = r.catalogo.find(function (x) { return !x.chaveLS; });
  for (let k = 0; k < 3; k++) await r._chamar(rota, 'oi', 1000);
  const antes = chamadas;
  const curto = await r._chamar(rota, 'oi', 1000);
  const depois = chamadas;
  let ok1 = !!curto.pausada && antes === depois && r.redePausada();
  // e fecha quando a rede volta
  global.fetch = async function () {
    chamadas++;
    return { ok: true, status: 200, headers: { get: () => null },
      text: async () => JSON.stringify({ choices: [{ message: { content: 'ok' } }] }) };
  };
  r.redePausadaAte = 0;                       // simula a pausa vencida
  const bom = await r._chamar(rota, 'oi', 1000);
  const ok2 = !!bom.texto && r.falhasRedeSeguidas === 0 && !r.redePausada();
  if (ok1 && ok2) { certos++; console.log('✔ disjuntor: abre depois de 3 falhas seguidos e fecha quando a rede volta'); }
  else { falhas.push('disjuntor'); console.error('✘ disjuntor — abre=' + ok1 + ' fecha=' + ok2); }

  console.log('');
  if (falhas.length) { console.error('✘ ' + falhas.length + ' de ' + (certos + falhas.length) + ' verificações de independência FALHARAM'); process.exit(1); }
  console.log('✔ ' + certos + '/' + (certos + falhas.length) + ' verificações de independência passaram');
})();
