// 🧪 Fluxo local do retorno: caixa privada → estado público sanitizado → resposta no e-mail.
'use strict';
const assert = require('assert');
const path = require('path');
const Module = require('module');
const enviados = [], marcacoes = [];
let marcador = '';
class ImapFalso {
  async connect() {}
  async logout() {}
  async list() { return [{ path: 'Rebocl-Navegador' }]; }
  async getMailboxLock() { return { release() {} }; }
  async search() { return marcador ? [7] : []; }
  async *fetch() { if (marcador) yield { uid: 7, source: Buffer.from(marcador), flags: new Set() }; }
  async messageFlagsAdd(uid, flags, opcoes) { marcacoes.push({ uid, flags, opcoes }); }
}
const originalLoad = Module._load;
Module._load = function (pedido) {
  if (pedido === 'imapflow') return { ImapFlow: ImapFalso };
  if (pedido === 'nodemailer') return { createTransport: () => ({ sendMail: async opcoes => { enviados.push(opcoes); } }) };
  return originalLoad.apply(this, arguments);
};
global.fetch = async url => {
  assert.match(String(url), /navegador-estado\.json/);
  return { ok: true, json: async () => ({ referencia: 'nav-0123456789abcdef01234567', consultado_em: '2026-10-17T01:00:00Z', url: 'https://example.com/', via: 'chrome', titulo: 'Example Domain', trecho_publico: 'Example Domain é uma página pública.' }) };
};
process.env.GMAIL_CHAT_ADDR = 'casa@exemplo.com';
process.env.GMAIL_CHAT_PASS = 'x';
const chat = require(path.resolve(process.argv[2] || '../email-chat.js'));
marcador = chat.serializaPendenciaNavegacao({ referencia: 'nav-0123456789abcdef01234567', canal: 'email', para: 'dono@exemplo.com', msgId: '<pedido@exemplo>', assunto: 'pesquisa', criadoEm: '2026-10-17T00:59:00.000Z' });
(async () => {
  const n = await chat.entregaNavegacoes();
  assert.equal(n, 1);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, 'dono@exemplo.com');
  assert.equal(enviados[0].inReplyTo, '<pedido@exemplo>');
  assert.match(enviados[0].text, /Example Domain/);
  assert.equal(marcacoes.length, 1);
  assert.deepEqual(marcacoes[0].flags, ['$ReboclNavegadorEntregue', '\\Deleted']);
  console.log('7/7 verificações do fluxo de retorno passaram');
})().catch(e => { console.error('✘ fluxo de retorno — ' + e.message); process.exitCode = 1; });
