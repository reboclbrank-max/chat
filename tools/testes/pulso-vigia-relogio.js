// Contrato de TEMPO do pulso do vigia — o molde da classe "carimbo tratado como dado".
//
// O defeito que este arquivo fecha: o padrão `agora = Date.now()` era o único trecho do
// módulo que nenhum teste prendia. Todos os casos existentes passavam `AGORA` de fora, então
// congelar a hora no padrão (`Date.now()` → `1700000000000`) deixava a suíte inteira verde.
//
// Regra do contrato: a hora é INJETADA, nunca lida do ambiente aqui dentro. Nenhuma chamada
// a Date.now() para descobrir "que horas são" — o teste diz que horas são.
'use strict';
const assert = require('assert');
const { performance } = require('perf_hooks');
const {
  JANELA_VIGIA_RECENTE_MS, relogio, haVigiaRecente, coordenaPulsoVigia,
} = require('../pulso-vigia.js');

const T = Date.parse('2026-11-17T12:00:00.000Z'); // a hora do teste, dada e fixa
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }
function runEm(instante, status = 'completed', conclusion = 'success') {
  return { created_at: new Date(instante).toISOString(), status, conclusion };
}

// injeta a hora no relógio do módulo e devolve ao original no finally
function comHora(instante, fn) {
  const antes = relogio.agora;
  relogio.agora = () => instante;
  try { return fn(); } finally { relogio.agora = antes; }
}

ok('o padrão do relógio é o relógio do sistema, não uma constante', () => {
  // Compara com outra fonte de tempo DO SISTEMA (performance), sem Date.now() no teste.
  // Um `Date.now()` congelado em 1700000000000 fica ~3 anos fora desta janela.
  const agoraDoSistema = performance.timeOrigin + performance.now();
  const desvio = Math.abs(relogio.agora() - agoraDoSistema);
  assert.ok(desvio < 60000, 'relógio padrão devia estar a menos de 60 s do tempo real; desvio ' + desvio + ' ms');
});

ok('sem hora explícita, o pulso usa o relógio injetado (padrão de produção)', () => {
  const recente = comHora(T, () => haVigiaRecente([runEm(T - 1000)]));
  assert.equal(recente, true, 'vigia de 1 s atrás tem de contar como recente quando a hora vem do relógio');
  const futuro = comHora(T, () => haVigiaRecente([runEm(T + 1000)]));
  assert.equal(futuro, false, 'carimbo no futuro não é saúde');
});

ok('a borda da janela é INCLUSIVA: exatos 20 min ainda é recente', () => {
  const naBorda = comHora(T, () => haVigiaRecente([runEm(T - JANELA_VIGIA_RECENTE_MS)]));
  const umMsDepois = comHora(T, () => haVigiaRecente([runEm(T - JANELA_VIGIA_RECENTE_MS - 1)]));
  assert.equal(naBorda, true, 'exatos JANELA ms ainda estão dentro da janela');
  assert.equal(umMsDepois, false, 'JANELA + 1 ms já está fora');
});

ok('idade zero conta como recente (carimbo do exato instante não é futuro)', () => {
  assert.equal(comHora(T, () => haVigiaRecente([runEm(T)])), true);
});

ok('coordenaPulsoVigia sem hora explícita também lê o relógio injetado', async () => {
  const antes = relogio.agora;
  relogio.agora = () => T;
  try {
    const resultado = await coordenaPulsoVigia({
      consultaRuns: async () => [runEm(T - 30 * 1000)],
      pedirVigia: async () => { throw new Error('não devia despachar'); },
    });
    assert.equal(resultado.decisao, 'preservar');
    assert.equal(resultado.despachado, false);
  } finally { relogio.agora = antes; }
});

ok('quando coordenaPulsoVigia resolve, o pedido ao vigia JÁ foi feito', async () => {
  // Prende a ordem: sem o `await` no despacho, a função resolveria antes de o pedido
  // terminar e o retorno diria "despachado" mentindo.
  let terminou = false;
  const resultado = await coordenaPulsoVigia({
    consultaRuns: async () => [],
    pedirVigia: async () => { await new Promise(r => setTimeout(r, 5)); terminou = true; },
    agora: T,
  });
  assert.equal(resultado.despachado, true);
  assert.equal(terminou, true, 'o pedido tem de ter terminado antes de coordenaPulsoVigia resolver');
});

(async () => {
  let falhas = 0;
  for (const c of casos) {
    try {
      await c.fn();
      console.log('✔ ' + c.nome);
    } catch (e) {
      falhas++;
      console.log('✘ ' + c.nome + ' → ' + e.message);
    }
  }
  console.log(casos.length - falhas + '/' + casos.length + ' contratos de tempo do pulso passaram');
  if (falhas) process.exit(1);
})();
