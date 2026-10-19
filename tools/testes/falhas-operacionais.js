// Falhas de configuração/fatais precisam aparecer ao workflow; não usar Gmail, Telegram ou rede.
'use strict';
const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const chat = path.resolve(process.argv[2] || path.join(__dirname, '../email-chat.js'));
const poll = path.join(path.dirname(chat), 'email-poll.js');
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function semCredenciais(arquivo) {
  const env = { ...process.env };
  delete env.GMAIL_CHAT_ADDR;
  delete env.GMAIL_CHAT_PASS;
  return spawnSync(process.execPath, [arquivo], { env, encoding: 'utf8', timeout: 15000 });
}

ok('ciclo avulso recusa ausência de credenciais com falha visível', () => {
  const r = semCredenciais(chat);
  assert.equal(r.status, 1, 'esperava saída 1, recebeu ' + r.status);
  assert.match(String(r.stderr), /ERRO no ciclo único: canal de e-mail indisponível/);
});
ok('turno principal não fica vivo sem conseguir abrir a caixa', () => {
  const r = semCredenciais(poll);
  assert.equal(r.status, 1, 'esperava saída 1, recebeu ' + r.status);
  assert.match(String(r.stderr), /canal de e-mail não iniciou: credenciais ausentes/);
});

console.log(`${certos}/${certos + falhas} falhas operacionais ficaram observáveis`);
process.exitCode = falhas ? 1 : 0;
