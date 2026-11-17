// Contratos que MATA(M) os mutantes sutis que sobreviveram à suíte inteira.
//
// Cada caso aqui nasceu de um mutante VIVO apontado por tools/testes/mutador.js:
// o nome do caso diz o módulo e a linha, e o vermelho de cada um está registrado em
// /home/user/evidencias do ciclo 3. A regra é a do instrutor: só é achado quando
// existe o teste que o mata — e o vermelho foi visto ANTES do verde.
'use strict';
const assert = require('assert');
const { lerNivel } = require('../autonomia.js');
const diagnostico = require('../../chat-diagnostico.js');
const { uniao, sobreposicoes } = require('../prova-ciclos.js');

const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

// ── tools/autonomia.js:32 — `lerNivel(conteudo, agora = Date.now())` ─────────
// Mutante vivo: congelar o padrão em 1700000000000. Os testes existentes sempre passavam
// `agora` de fora, então o caminho de PRODUÇÃO (sem argumento) nunca era exercitado.
const T = Date.parse('2026-11-17T12:00:00.000Z');
function comDataFalsa(instante, fn) {
  const antes = Date.now;
  Date.now = () => instante;
  try { return fn(); } finally { Date.now = antes; }
}

ok('autonomia.js:32 — sem `agora`, o prazo é comparado com o relógio do sistema', () => {
  const dentro = JSON.stringify({ nivel: 'codigo', expira_em: new Date(T + 86400000).toISOString() });
  const fora = JSON.stringify({ nivel: 'codigo', expira_em: new Date(T - 86400000).toISOString() });
  const r1 = comDataFalsa(T, () => lerNivel(dentro));
  const r2 = comDataFalsa(T, () => lerNivel(fora));
  assert.equal(r1.nivel, 'codigo', 'prazo de amanhã não pode expirar hoje');
  assert.equal(!!r1.expirado, false);
  assert.equal(r2.expirado, true, 'prazo de ontem tem de expirar');
  assert.equal(r2.nivel, 'desligado', 'nível vencido volta ao padrão');
});

ok('autonomia.js:32 — o prazo vence no instante marcado, não um segundo antes', () => {
  const noInstante = JSON.stringify({ nivel: 'codigo', expira_em: new Date(T).toISOString() });
  const r = comDataFalsa(T, () => lerNivel(noInstante));
  assert.equal(!!r.expirado, false, 'no exato instante do prazo ainda não venceu');
  const umMsDepois = comDataFalsa(T + 1, () => lerNivel(noInstante));
  assert.equal(umMsDepois.expirado, true, '1 ms depois já venceu');
});

// ── chat-diagnostico.js:53/54 — `codigo >= 400` e `codigo >= 500` ────────────
ok('chat-diagnostico.js:53 — 400 exato é falha de formato, 500 exato é do servidor', () => {
  const d = diagnostico.motivoDeFalha;
  assert.equal(d(null, 400), 'formato', '400 é o primeiro código de formato');
  assert.equal(d(null, 500), 'servidor', '500 é o primeiro código de servidor');
  assert.equal(d(null, 499), 'formato');
  assert.equal(d(null, 501), 'servidor');
  assert.equal(d(null, 429), 'limite', 'limite vem antes de servidor');
  assert.equal(d(null, 200), 'outro', 'sucesso não é falha');
});

// ── tools/prova-ciclos.js:59/86 — bordas de `uniao` e `sobreposicoes` ───────
ok('prova-ciclos.js:59 — trechos que se tocam na borda são UM trecho só', () => {
  const t = uniao([{ inicio: 0, fim: 60000 }, { inicio: 60000, fim: 120000 }]);
  assert.equal(t.length, 1, 'fim de um == início do outro: mesma janela contínua');
  assert.equal(t[0].fim, 120000);
  const separado = uniao([{ inicio: 0, fim: 60000 }, { inicio: 60001, fim: 120000 }]);
  assert.equal(separado.length, 2, '1 ms de diferença já são dois trechos');
});

ok('prova-ciclos.js:86 — execução que começa no fim da outra não é sobreposição', () => {
  const MIN = 60000;
  const encostada = [
    { id: 'a', inicio: 0, fim: 30 * MIN },
    { id: 'b', inicio: 30 * MIN, fim: 60 * MIN },
  ];
  assert.deepEqual(sobreposicoes(encostada), [], 'começar exatamente no fim não sobrepõe');
  const sobreposta = [
    { id: 'a', inicio: 0, fim: 30 * MIN },
    { id: 'b', inicio: 20 * MIN, fim: 60 * MIN },
  ];
  const achados = sobreposicoes(sobreposta);
  assert.equal(achados.length, 1, '10 min simultâneos passam do mínimo de 5');
  assert.equal(achados[0].minutos, 10);
});

(async () => {
  let falhas = 0;
  for (const c of casos) {
    try { await c.fn(); console.log('✔ ' + c.nome); }
    catch (e) { falhas++; console.log('✘ ' + c.nome + ' → ' + e.message); }
  }
  console.log(casos.length - falhas + '/' + casos.length + ' mutantes vivos agora mortos');
  if (falhas) process.exit(1);
})();
