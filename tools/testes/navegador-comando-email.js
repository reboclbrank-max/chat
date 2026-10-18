// 🧪 Regressão do comando `navegar:` pelo canal e-mail: URL chega só ao comando,
// é validada e vira despacho com referência opaca; destinatário/thread continuam privados.
'use strict';
const assert = require('assert');
const path = require('path');
const Module = require('module');
const pendencias = [];
class ImapFalso {
  async connect() {}
  async logout() {}
  async mailboxCreate() {}
  async append(pasta, bruto) { pendencias.push({ pasta, bruto: String(bruto) }); }
}
const carregador = Module._load;
Module._load = function (pedido) {
  if (pedido === 'imapflow') return { ImapFlow: ImapFalso };
  if (pedido === 'nodemailer') return { createTransport: () => ({ sendMail: async () => ({}) }) };
  return carregador.apply(this, arguments);
};
process.env.GMAIL_CHAT_ADDR = 'casa@exemplo.com';
process.env.GMAIL_CHAT_PASS = 'x';
process.env.GITHUB_TOKEN = 'teste-sem-valor-real';
let despacho = null;
global.fetch = async (url, opcoes) => {
  assert.match(String(url), /actions\/workflows\/navegador-publico\.yml\/dispatches$/);
  despacho = JSON.parse(String(opcoes && opcoes.body || '{}'));
  return { status: 204 };
};
const chat = require(path.resolve(process.argv[2] || '../email-chat.js'));
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

(async () => {
  const resposta = await chat.ferramenta('navegar: https://8.8.8.8/', {
    canal: 'email', para: 'dono@exemplo.com', msgId: '<origem@exemplo>', assunto: 'consulta', criadoEm: '2026-10-18T00:00:00.000Z'
  });
  ok('aceita somente a URL pública depois da validação local', () => assert.match(resposta, /Pronto: mandei abrir 8\.8\.8\.8/));
  ok('despacha URL e referência opaca, nunca destino ou thread', () => {
    assert.deepEqual(despacho && despacho.ref, 'main');
    assert.equal(despacho && despacho.inputs && despacho.inputs.url, 'https://8.8.8.8/');
    assert.match(String(despacho && despacho.inputs && despacho.inputs.referencia), /^nav-[a-f0-9]{24}$/);
    assert.doesNotMatch(JSON.stringify(despacho), /dono@|origem@|consulta/);
  });
  ok('guarda a correlação em pasta privada sem dados claros', () => {
    assert.equal(pendencias.length, 1);
    assert.equal(pendencias[0].pasta, 'Rebocl-Navegador');
    assert.doesNotMatch(pendencias[0].bruto, /dono@exemplo\.com|origem@exemplo|consulta/);
    assert.match(pendencias[0].bruto, /X-Rebocl-Navegador-Ref: nav-[a-f0-9]{24}/);
  });
  console.log(`${certos}/${certos + falhas} testes do comando de navegador por e-mail passaram`);
  process.exitCode = falhas ? 1 : 0;
})().catch(e => { console.error('✘ comando do navegador — ' + e.message); process.exitCode = 1; });
