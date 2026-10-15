// 🔍 DIAGNÓSTICO DA CAIXA (somente leitura, 15/10/2026) — mostra, para os e-mails de TESTE de hoje, em que pastas
// estão, se estão marcados como lidos (\Seen) e quais etiquetas o Gmail deu. Não lê conteúdo (só envelope, marcações
// e etiquetas) e não altera nada. O log é público: só aparecem assuntos [TESTE-REBOCL] e nenhum endereço.
const { ImapFlow } = require('imapflow');
const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const DESDE = new Date(Date.now() - 6 * 3600 * 1000);
(async () => {
  if (!USER || !PASS) { console.log('sem credenciais'); return; }
  const c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await c.connect();
  const caixas = (await c.list()).map(b => b.path).filter(p => /^INBOX$|Todos|All Mail|Spam|Lixeira|Trash/i.test(p));
  console.log('pastas olhadas:', caixas.join(' | '));
  for (const caixa of caixas) {
    const lock = await c.getMailboxLock(caixa);
    try {
      const uids = await c.search({ subject: 'TESTE-REBOCL', since: DESDE }, { uid: true });
      console.log('\n== ' + caixa + ' — ' + (uids || []).length + ' e-mail(s) de teste nas últimas 6 h');
      if (!uids || !uids.length) continue;
      for await (const m of c.fetch(uids.slice(-60), { envelope: true, flags: true, labels: true, size: true, internalDate: true }, { uid: true })) {
        const assunto = String(m.envelope.subject || '').replace(/^.*?\[TESTE-REBOCL\]\s*/, '').slice(0, 46);
        const deChat = /assistente/i.test(String((m.envelope.from || [{}])[0].name || ''));
        const quando = new Date(m.internalDate || m.envelope.date).toISOString().slice(11, 19);
        const lido = m.flags && m.flags.has('\\Seen') ? 'LIDO    ' : 'não lido';
        const etq = m.labels ? [...m.labels].join(',') : '-';
        console.log('  ' + quando + ' · uid ' + String(m.uid).padStart(6) + ' · ' + lido + ' · ' + (deChat ? 'resposta do chat' : 'teste do robô   ') + ' · ' + String(Math.round(m.size / 1024)).padStart(5) + ' KB · ' + assunto + ' · etiquetas: ' + etq);
      }
    } finally { lock.release(); }
  }
  await c.logout();
})().catch(e => { console.log('erro:', e.message); process.exit(1); });
