// 📥 COLETA E SONDA DAS RESPOSTAS DO TESTE DE E-MAIL (interno)
// 1) sonda por que o robô de teste não capturou (compara buscas IMAP);
// 2) coleta as respostas [TESTE-REBOCL] (INBOX + Spam + Todas as mensagens);
// 3) reenvia 3 provas novas (conversa, ajuda, reapresentação) e espera as respostas;
// 4) grava provas/coleta-email-<ts>.md. Endereços sempre mascarados; nada de mensagem do dono.
const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ARROBA = USER.indexOf('@');
const ALIAS = ARROBA > 0 ? USER.slice(0, ARROBA) + '+teste' + USER.slice(ARROBA) : 'x@y';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 8);
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mascarar = a => { const s = String(a || ''); const i = s.indexOf('@'); return i < 3 ? '***' : s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i); };
const CAIXAS = ['INBOX', '[Gmail]/Spam', '[Gmail]/All Mail'];

function corpoTexto(bruto) {
  const p = String(bruto).split(CRLF + CRLF);
  for (let i = 1; i < p.length; i++) {
    if (p[i - 1].toLowerCase().indexOf('text/plain') >= 0) {
      let x = p[i];
      const corte = x.indexOf('--');
      if (corte > 0) x = x.slice(0, corte);
      return x.trim().slice(0, 2500);
    }
  }
  return p.slice(1).join(CRLF + CRLF).trim().slice(0, 2500);
}
function mensagem(caso) {
  const id = '<nova-' + caso.n + '-' + Date.now() + '@rebocl.local>';
  return ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + caso.assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', caso.corpo].join(CRLF);
}

(async () => {
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const rel = [];
  const P = s => { console.log(s); rel.push(s); };
  P('# 📥 Coleta e sonda — ' + new Date().toISOString().slice(0, 16) + ' UTC');

  // ---- 1) sonda do robô ----
  {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const t0 = Date.now();
      const a = await client.search({ since: new Date(t0 - 86400000) });
      const b = await client.search({ subject: 'TESTE-REBOCL' });
      const c = await client.search({ all: true });
      P('');
      P('## Sonda do robô de teste');
      P('- `search({since})` → ' + (a || []).length + ' uids');
      P('- `search({subject})` → ' + (b || []).length + ' uids');
      P('- `search({all:true})` → ' + (c || []).length + ' uids');
      let comEnvelope = 0, comSource = 0;
      for (const uid of (a || []).slice(-10)) {
        const m = await client.fetchOne(uid, { source: true, envelope: true });
        if (m && m.envelope) comEnvelope++;
        if (m && m.source) comSource++;
      }
      P('- fetch dos últimos 10 uids: envelope ' + comEnvelope + '/10 · source ' + comSource + '/10');
    } finally { lock.release(); }
  }

  // ---- 2) coleta das respostas ----
  const achados = new Map();
  const P2 = [];
  for (const caixa of CAIXAS) {
    try {
      const lock = await client.getMailboxLock(caixa);
      try {
        const uids = await client.search({ subject: 'TESTE-REBOCL' });
        P2.push('caixa ' + caixa + ': ' + (uids || []).length + ' mensagens [TESTE-REBOCL]');
        for (const uid of (uids || [])) {
          const m = await client.fetchOne(uid, { source: true, envelope: true, flags: true });
          if (!m || !m.envelope) continue;
          const de = (m.envelope.from || [{}])[0].address || '';
          const assunto = String(m.envelope.subject || '');
          const mm = assunto.match(/\[TESTE-REBOCL\]\s*(\d+R?)/i);
          if (!mm) continue;
          const ehResposta = de.toLowerCase().indexOf(ALIAS.toLowerCase()) < 0;
          if (!ehResposta) continue;
          const chave = mm[1] + '|' + assunto;
          if (achados.has(chave) && caixa !== 'INBOX') continue;
          achados.set(chave, { num: mm[1], assunto, quando: m.envelope.date, texto: corpoTexto((m.source || '').toString()), caixa });
        }
      } finally { lock.release(); }
    } catch (e) { P2.push('caixa ' + caixa + ': erro ' + e.message); }
  }
  P('');
  P('## Coleta');
  P2.forEach(l => P(l));
  P('- respostas encontradas: ' + achados.size);
  for (const [k, v] of [...achados.entries()].sort()) {
    P('');
    P('### ✔ resposta ' + v.num + ' · ' + v.assunto + ' · ' + (v.quando ? new Date(v.quando).toISOString().slice(11, 16) + ' UTC' : '?') + ' · caixa ' + v.caixa);
    P('```');
    P(v.texto.slice(0, 1500));
    P('```');
  }

  // ---- 3) provas novas ----
  const NOVOS = [
    { n: '1R', assunto: '[TESTE-REBOCL] 1R — reapresentação', corpo: 'Oi! Repetindo o teste da casa, porque a primeira tentativa ficou sem resposta. Quem é você, o que faz por aqui e o que NÃO consegue fazer? Sem enfeite.' },
    { n: 'aj', assunto: '[TESTE-REBOCL] aj — ajuda', corpo: 'ajuda' },
    { n: 'cv', assunto: '[TESTE-REBOCL] cv — conversa', corpo: 'Conversa rápida de gente: qual é a sua parte favorita de trabalhar nesta casa? Duas linhas, com sinceridade.' }
  ];
  {
    const lock = await client.getMailboxLock('INBOX');
    try {
      for (const c of NOVOS) { await client.append('INBOX', Buffer.from(mensagem(c))); console.log('📤 reenvio', c.assunto); await sleep(1200); }
    } finally { lock.release(); }
  }
  const t1 = Date.now();
  const limite = t1 + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ subject: 'TESTE-REBOCL' });
      for (const uid of (uids || [])) {
        const m = await client.fetchOne(uid, { source: true, envelope: true });
        if (!m || !m.envelope) continue;
        const de = (m.envelope.from || [{}])[0].address || '';
        if (de.toLowerCase().indexOf(ALIAS.toLowerCase()) >= 0) continue;
        const assunto = String(m.envelope.subject || '');
        const chave = assunto;
        if (achados.has(chave)) continue;
        achados.set(chave, { num: (assunto.match(/\[TESTE-REBOCL\]\s*(\d+R?|aj|cv)/i) || [])[1] || '?', assunto, quando: m.envelope.date, texto: corpoTexto((m.source || '').toString()), caixa: 'INBOX' });
        console.log('📥 nova resposta:', assunto.slice(0, 60));
      }
    } finally { lock.release(); }
    if (achados.size >= 8) break;
    await sleep(20000);
  }
  P('');
  P('## Depois dos reenvios — total de respostas: ' + achados.size);
  for (const [k, v] of [...achados.entries()].sort()) {
    P('');
    P('### ✔ ' + v.num + ' · ' + v.assunto + ' · ' + (v.quando ? new Date(v.quando).toISOString().slice(11, 16) + ' UTC' : '?'));
    P('```');
    P(v.texto.slice(0, 1500));
    P('```');
  }
  try { await client.logout(); } catch (e) {}

  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'coleta-email-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, rel.join(NL));
  console.log('💾 salvo em', destino);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
