// 🔍 DIAGNÓSTICO DO TELEGRAM (16/10/2026) — confere, SEM atrapalhar o turno (não lê o getUpdates): (1) o dono está
// pareado (ID guardado na pasta Rebocl-Config do Gmail)? (2) o bot alcança a conversa dele (getChat)? (3) com
// MANDAR=sim, manda uma mensagem de confirmação para o dono. Log público: ID e nome saem mascarados.
const { ImapFlow } = require('imapflow');
const USER = process.env.GMAIL_CHAT_ADDR, PASS = process.env.GMAIL_CHAT_PASS, TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const tg = async (metodo, corpo) => {
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/' + metodo, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
  return r.json();
};
const mascara = s => { s = String(s || ''); return s ? s.slice(0, 1) + '***' : '?'; };
(async () => {
  const me = await tg('getMe');
  console.log('bot:', me.ok ? '@' + me.result.username + ' ✔' : 'FALHOU (' + me.description + ')');
  const c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await c.connect();
  const pastas = (await c.list()).map(p => p.path);
  let dono = null, lembretes = 0;
  if (pastas.includes('Rebocl-Config')) {
    const lock = await c.getMailboxLock('Rebocl-Config');
    try {
      const u = await c.search({ all: true }, { uid: true });
      if (u && u.length) for await (const m of c.fetch(u, { headers: ['x-rebocl-telegram-dono'], internalDate: true }, { uid: true })) {
        const v = (String(m.headers || '').match(/x-rebocl-telegram-dono:\s*(-?\d+)/i) || [])[1];
        if (v) dono = { id: Number(v), quando: new Date(m.internalDate).toISOString().slice(0, 16).replace('T', ' ') };
      }
    } finally { lock.release(); }
  }
  if (pastas.includes('Rebocl-Lembretes')) { const st = await c.status('Rebocl-Lembretes', { messages: true }); lembretes = st.messages; }
  await c.logout();
  console.log('pasta Rebocl-Config:', pastas.includes('Rebocl-Config') ? 'existe' : 'NÃO existe');
  console.log('dono pareado:', dono ? 'SIM ✔ (conversa ...' + String(dono.id).slice(-3) + ', pareado em ' + dono.quando + ' UTC)' : 'NÃO');
  console.log('lembretes guardados:', lembretes);
  if (!dono) process.exit(0);
  const ch = await tg('getChat', { chat_id: dono.id });
  console.log('o bot alcança a conversa do dono:', ch.ok ? 'SIM ✔ (' + ch.result.type + ', nome ' + mascara(ch.result.first_name) + ')' : 'NÃO (' + ch.description + ')');
  if (process.env.MANDAR === 'sim' && ch.ok) {
    const r = await tg('sendMessage', { chat_id: dono.id, text: '✅ Teste da casa: o chat no Telegram está funcionando. Pode me mandar pergunta, foto, áudio, documento ou vídeo por aqui — e "lembrete: amanhã às 7h …" também vale.\n\n— Assistente Rebocl (casa Rebocl Brank)' });
    console.log('mensagem de confirmação para o dono:', r.ok ? 'ENVIADA ✔ (mensagem nº ' + r.result.message_id + ')' : 'FALHOU (' + r.description + ')');
  }
})().catch(e => { console.log('erro:', e.message); process.exit(1); });
