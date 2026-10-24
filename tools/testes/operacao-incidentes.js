// Contrato offline para incidente sanitizado, revisão humana e retenção sem expurgo cego.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const ler = nome => fs.readFileSync(path.join(raiz, nome), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('duplicidade de turno vira causa sanitizada sem cancelamento automático', () => {
  const vigia = ler('tools/vigia-casa.js');
  const chat = ler('tools/email-chat.js');
  assert.match(vigia, /'turnos-duplicados'/);
  assert.match(vigia, /falhaVigia\('turnos-duplicados'/);
  assert.doesNotMatch(vigia, /actions\/runs\/.*\/cancel|method:\s*'POST'[^\n]*\/cancel/, 'vigia ainda cancela execução automaticamente');
  assert.match(chat, /'turnos-duplicados':\s*\{ texto: 'mais de um turno ativo — revisão humana necessária'/);
});
ok('manual proíbe intervenção cega e delimita exceção humana pontual', () => {
  const manual = ler('OPERACAO-INCIDENTES.md');
  for (const trecho of ['Não abrir:', 'fila-estagnada', 'turnos-duplicados', 'não cancelar nenhum', 'não criar trabalho adicional', 'autorização humana excepcional']) {
    assert(manual.includes(trecho), 'manual sem guarda: ' + trecho);
  }
});
ok('retenção preserva por padrão e mede sem abrir conteúdo', () => {
  const politica = ler('POLITICA-RETENCAO-OPERACIONAL.md');
  assert.match(politica, /Não há expurgo, arquivamento externo ou exclusão automática/);
  assert.match(politica, /não acessa rede, não faz `fetch`, não escreve no Git e não lê conteúdo/);
  assert.match(politica, /Remoção detectada/);
  assert.match(politica, /Sem esses dados, a regra segura é \*\*preservar e não apagar\*\*/);
});
ok('template exige revisão humana sem inventar proprietário ou bypass', () => {
  const template = ler('.github/PULL_REQUEST_TEMPLATE.md');
  assert.match(template, /revisor humano real/);
  assert.match(template, /não inventar `CODEOWNERS` ou identidades/);
  assert.match(template, /Não há auto-merge, bypass, force-push, promoção cega/);
});
ok('protocolo humano preserva a única nota literal sem completar jornadas', () => {
  const humano = ler('AVALIACAO-HUMANA-PILOTO.md');
  assert.match(humano, /Foi bom o uso/);
  assert.match(humano, /não preenche H1–H5/i);
  assert.match(humano, /não solicitar nota, tarefa, contexto ou escala/i);
});

console.log(`${certos}/${certos + falhas} testes de operação segura passaram`);
process.exitCode = falhas ? 1 : 0;
