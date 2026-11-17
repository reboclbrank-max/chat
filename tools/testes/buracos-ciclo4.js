// Contratos que fecham dois BURACOS triados no ciclo 3 (mutantes vivos, comportamento
// muda, nenhum teste via). Cada caso aqui foi escrito para ficar VERMELHO no código de
// antes — o vermelho está colado em /home/user/evidencia-buracos-ciclo4-2026-11-17.txt.
'use strict';
const assert = require('assert');
const { consultaComRetry } = require('../reserva-turno.js');
// O valor é LITERAL aqui de propósito: o contrato prende o backoff, não o repete do módulo.
// Importar a constante do próprio código faria o teste comparar o arquivo com ele mesmo.
const ESPERA_BASE_MS = 400;
const { avaliaTermometro, LIMITES } = require('../termometro-barreira.js');

const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

// ── tools/reserva-turno.js:109 — `await dormir(...)` entre tentativas ────────
// Mutante vivo: sem o await, as três tentativas viram rajada — o motivo de existir a
// espera é não martelar a API do GitHub com três GETs no mesmo milissegundo.
ok('reserva-turno:109 — a espera entre tentativas ACONTECE antes da consulta seguinte', async () => {
  const ordem = [];
  let esperasConcluidas = 0;
  let chamadas = 0;
  const buscar = async () => {
    chamadas++;
    ordem.push('busca:' + esperasConcluidas);
    if (chamadas < 3) return { erro: 'rede caiu', status: 503 };
    return { runs: [] };
  };
  const esperar = (ms) => new Promise((resolve) => {
    // a espera só conta como concluída quando o timer dispara de verdade
    setTimeout(() => { esperasConcluidas++; ordem.push('espera:' + ms); resolve(); }, Math.min(ms, 5));
  });
  const r = await consultaComRetry({ buscar, esperar, registrar: () => {} });
  assert.equal(r.tentativas, 3, 'as três tentativas têm de acontecer');
  assert.deepEqual(ordem, ['busca:0', 'espera:' + ESPERA_BASE_MS, 'busca:1',
    'espera:' + (ESPERA_BASE_MS * 2), 'busca:2'],
  'cada tentativa nova só pode começar depois de a espera anterior terminar — sem o await vira rajada');
});

ok('reserva-turno:109 — a espera cresce a cada tentativa', async () => {
  const atrasos = [];
  const esperar = (ms) => { atrasos.push(ms); return Promise.resolve(); };
  await consultaComRetry({ buscar: async () => ({ erro: 'rede', status: 503 }), esperar, registrar: () => {} });
  assert.deepEqual(atrasos, [ESPERA_BASE_MS, ESPERA_BASE_MS * 2],
    'backoff linear: 1× na primeira repetição, 2× na segunda');
});

// ── tools/termometro-barreira.js:107 — janela recente de 5 execuções ────────
// Mutante vivo: `recentes.length >= 5` → `> 5`. Com exatamente 5 execuções recentes o
// termômetro deixa de olhar instabilidade e a barreira fica verde com suíte instável.
function execucoes(conclusoes) {
  return conclusoes.map((conclusion, i) => ({
    conclusion,
    created_at: new Date(Date.UTC(2026, 10, 17, 12, i)).toISOString(),
  }));
}

ok('termometro:107 — 5 execuções recentes com falha DENTRO da janela são acusadas', () => {
  // 5 no total: o histórico é curto e a taxa é baixa de propósito — o que se prende aqui
  // é o motivo específico da janela recente, não o veredito geral.
  const veredito = avaliaTermometro({
    execucoes: execucoes(['success', 'success', 'success', 'success', 'failure']),
    passosFalhos: {},
  });
  const motivos = (veredito.motivos || []).join(' | ');
  assert.match(motivos, /1 falha\(s\) nas últimas 5 execuções/,
    'com exatamente 5 execuções a janela recente ainda vale; motivos: ' + motivos);
});

ok('termometro:107 — zero falha recente não gera motivo de instabilidade', () => {
  const limpo = avaliaTermometro({
    execucoes: execucoes(['success', 'success', 'success', 'success', 'success']),
    passosFalhos: {},
  });
  assert.doesNotMatch((limpo.motivos || []).join(' | '), /falha\(s\) nas últimas/);
  assert.equal(LIMITES.falhasRecentesPermitidas, 0, 'o limite declarado é zero falha na janela');
});

(async () => {
  let falhas = 0;
  for (const c of casos) {
    try { await c.fn(); console.log('✔ ' + c.nome); }
    catch (e) { falhas++; console.log('✘ ' + c.nome + ' → ' + e.message); }
  }
  console.log(casos.length - falhas + '/' + casos.length + ' buracos de comportamento agora presos');
  if (falhas) process.exit(1);
})();
