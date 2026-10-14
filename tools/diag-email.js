// 🩺 DIAGNÓSTICO DA CAIXA DE E-MAIL (interno da casa)
// 1) roda UM ciclo do chat com o código em produção (mostra erros se houver);
// 2) inspeciona as mensagens [TESTE-REBOCL] (lidas? de quem? quando?).
// Só imprime dados das mensagens de teste — nada de mensagem do dono. Endereços mascarados.
const { processOnce } = require('./email-chat.js');
const { ImapFlow } = require('imapflow');
const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const mascarar = a => {
  const s = String(a || '');
  const i = s.indexOf('@');
  if (i < 3) return '***';
  return s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i);
};

(async () => {
  console.log('=== 0) sanidade do código em produção ===');
  try {
    const ec = require('./email-chat.js');
    console.log('  funções:', ['processOnce', 'ferramenta', 'cerebro', 'limpaAssunto', 'citacaoDoEmail', 'memoria'].map(f => f + '=' + (typeof ec[f])).join(' · '));
  } catch (e) { console.log('  ERRO ao carregar:', e.message); }

  console.log('\n=== 1) um ciclo do chat (é o mesmo que o turno faz) ===');
  try {
    const n = await processOnce();
    console.log('  ciclo concluído · respondidos:', n);
  } catch (e) {
    console.log('  ❌ ERRO NO CICLO:', e.message);
    if (e.stack) console.log(e.stack.split('\n').slice(0, 8).join('\n'));
  }

  console.log('\n=== 2) estado das mensagens [TESTE-REBOCL] ===');
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    console.log('  INBOX tem', client.mailbox && client.mailbox.exists, 'mensagens');
    const uids = await client.search({ subject: 'TESTE-REBOCL' });
    console.log('  mensagens com [TESTE-REBOCL] no assunto:', (uids || []).length);
    for (const uid of (uids || []).slice(-24)) {
      const m = await client.fetchOne(uid, { envelope: true, flags: true });
      if (!m) continue;
      const f = m.flags || new Set();
      const de = mascarar((m.envelope.from || [{}])[0].address);
      const para = mascarar((m.envelope.to || [{}])[0].address);
      console.log('   uid', uid, '·', f.has('\\Seen') ? 'LIDA ' : 'não lida', '· de', de, '· para', para, '·', String(m.envelope.subject || '').slice(0, 55), '·', m.envelope.date ? new Date(m.envelope.date).toISOString().slice(11, 16) : '?');
    }
  } finally { lock.release(); try { await client.logout(); } catch (e) {} }
})().catch(e => { console.log('DIAG ERRO:', e.message); process.exit(0); });
