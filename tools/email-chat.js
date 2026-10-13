// 📧 CHAT POR EMAIL — o dono escreve pra boges1413@gmail.com, o chat responde por email (3 rotas de cérebro)
const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const USER = process.env.GMAIL_CHAT_ADDR, PASS = process.env.GMAIL_CHAT_PASS;
if (!USER || !PASS) { console.error('sem credenciais'); process.exit(0); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cerebro(pergunta) {
  const rotas = [
    ['frota', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true],
    ['reserva', 'https://text.pollinations.ai/openai/chat/completions', { model: 'openai-fast', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, false],
    ['omni', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true]
  ];
  for (let rodada = 0; rodada < 2; rodada++) {
    for (const [nome, url, corpo, bearer] of rotas) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (bearer) headers['Authorization'] = 'Bearer unused';
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(corpo), signal: AbortSignal.timeout(60000) });
        if (!r.ok) continue;
        const j = await r.json();
        const t = ((((j.choices || [])[0] || {}).message || {}).content) || '';
        if (t.trim()) return { texto: t.trim().slice(0, 2500), via: nome };
      } catch (e) {}
    }
    if (!rodada) await sleep(10000);
  }
  return null;
}
(async () => {
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const uids = await client.search({ seen: false });
    const alvo = (uids || []).slice(-5);
    console.log('emails não lidos:', (uids || []).length, '| processando até', alvo.length);
    for (const uid of alvo) {
      const msg = await client.fetchOne(uid, { source: true, envelope: true, bodyStructure: false });
      if (!msg || !msg.envelope) continue;
      const de = (msg.envelope.from || []).map(f => f.address).join(',').toLowerCase();
      const assunto = (msg.envelope.subject || '(sem assunto)');
      if (!de || de.includes(USER.toLowerCase())) { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); continue; }
      const texto = (msg.source || '').toString();
      const corpo = texto.replace(/-----BEGIN PGP[\s\S]*?-----END PGP SIGNATURE-----/g, '').replace(/--\s*$/gm, '').replace(/https?:\/\/\S+/g, '').slice(0, 3000) || assunto;
      console.log('📨 de', de, '| assunto:', assunto.slice(0, 60));
      const r = await cerebro('Você é a Assistente Rebocl, do Brasil, direta e calorosa. Responda este e-mail em português claro (máx 15 linhas):\n\n' + assunto + '\n\n' + corpo);
      const transporte = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS } });
      const resposta = r ? r.texto : 'travei agora — reenvie que eu respondo (casa Rebocl).';
      await transporte.sendMail({ from: '"Assistente Rebocl" <' + USER + '>', to: de, subject: 'Re: ' + assunto, text: resposta + '\n\n— Assistente Rebocl (casa Rebocl Brank)', inReplyTo: msg.envelope.messageId, references: msg.envelope.messageId });
      console.log('✉️ respondido via', r ? r.via : 'sem cérebro');
      const fs = require('fs');
      fs.appendFileSync('email-log.md', '- ' + new Date().toISOString().slice(0, 16) + ' UTC — ' + de + ' | "' + assunto.slice(0, 40) + '" → respondido via ' + (r ? r.via : 'fallback') + '\n');
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      await sleep(2000);
    }
  } finally { lock.release(); await client.logout(); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
