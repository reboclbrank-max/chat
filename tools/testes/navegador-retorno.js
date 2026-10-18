// 🧪 Retorno assíncrono do navegador: referência opaca pública, destino privado na caixa.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const chat = require(path.resolve(process.argv[2] || '../email-chat.js'));
let n = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { console.error('✘ ' + nome + ' — ' + e.message); process.exitCode = 1; } }

const ref = chat.novaReferenciaNavegacao();
ok('referência é aleatória, opaca e sem destino', () => assert.match(ref, /^nav-[a-f0-9]{24}$/));
ok('URL de navegar é preservada só para o parser de comando, não para texto livre', () => {
  const brutoComando = ['From: teste@exemplo.com', 'To: casa@exemplo.com', 'Subject: comando', 'Content-Type: text/plain; charset=UTF-8', '', 'navegar: https://example.com/'].join('\r\n');
  assert.equal(chat.pegaTexto(brutoComando, ''), 'navegar:');
  assert.equal(chat.pegaTexto(brutoComando, '', { preservaUrls: true }), 'navegar: https://example.com/');
  const fonte = fs.readFileSync(path.resolve(__dirname, '../email-chat.js'), 'utf8');
  assert.match(fonte, /const corpoComando = pegaTexto\(bruto, assunto, \{ preservaUrls: true \}\)/);
  assert.match(fonte, /ferramenta\(corpoComando, \{ canal: 'email'/);
});
const bruto = chat.serializaPendenciaNavegacao({ referencia: ref, canal: 'email', para: 'dono@exemplo.com', msgId: '<origem@exemplo>', assunto: 'consulta privada', criadoEm: '2026-10-17T00:00:00.000Z' });
ok('marcador privado não deixa e-mail/assunto em texto claro', () => {
  assert.ok(bruto.includes('X-Rebocl-Navegador-Para: '));
  assert.ok(!bruto.includes('dono@exemplo.com'));
  assert.ok(!bruto.includes('consulta privada'));
});
const pendente = chat.lePendenciaNavegacao(bruto, 42);
ok('marcador privado recompõe canal, destino e thread', () => assert.deepEqual(pendente, { uid: 42, referencia: ref, canal: 'email', para: 'dono@exemplo.com', msgId: '<origem@exemplo>', assunto: 'consulta privada', criadoEm: '2026-10-17T00:00:00.000Z' }));
ok('resultado de outra referência não é entregue ao pedido errado', () => assert.equal(chat.retornoNavegacaoPendente(pendente, { referencia: 'nav-aaaaaaaaaaaaaaaaaaaaaaaa', consultado_em: '2026-10-17T00:01:00Z', url: 'https://example.com/', titulo: 'Outra', trecho_publico: 'não usar' }, Date.parse('2026-10-17T00:02:00Z')), ''));
ok('resultado correspondente devolve só resumo público sanitizado', () => {
  const texto = chat.retornoNavegacaoPendente(pendente, { referencia: ref, consultado_em: '2026-10-17T00:01:00Z', url: 'https://example.com/', titulo: 'Página\nPública', trecho_publico: 'Trecho\tlegível', aviso: '' }, Date.parse('2026-10-17T00:02:00Z'));
  assert.match(texto, /Resultado da página pública/);
  assert.match(texto, /Página Pública/);
  assert.ok(!texto.includes('\nPública'));
});
ok('pendência expirada avisa sem repetir navegação', () => assert.match(chat.retornoNavegacaoPendente(pendente, {}, Date.parse('2026-10-17T00:16:00Z')), /não devolveu resultado/));
ok('workflow mantém isolamento e aceita somente referência opaca', () => {
  const yml = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/navegador-publico.yml'), 'utf8');
  assert.match(yml, /referencia:/);
  assert.match(yml, /\^nav-\[a-f0-9\]\{24\}\$/);
  assert.match(yml, /resultados_recentes/);
  assert.ok(!/GMAIL_CHAT_PASS|TELEGRAM_BOT_TOKEN|CHAT_DONO/.test(yml));
});
console.log(`${n}/8 testes de retorno do navegador passaram`);
