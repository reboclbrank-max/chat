// 🧠 MINI-TESTE DA MEMÓRIA + RETESTE DA FOTO (14/10/2026) — interno
// Prova o conserto do v4: a segunda mensagem NÃO cita nada; o lembrete interno (memoria do turno)
// é o único caminho possível. Também reenvia a foto nova (visão) com o texto inteiro.
const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { pegaTexto } = require('./email-chat.js');
const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ARROBA = USER.indexOf('@');
const ALIAS = ARROBA > 0 ? USER.slice(0, ARROBA) + '+teste' + USER.slice(ARROBA) : 'x@y';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 9);
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MARCA = '[TESTE-REBOCL]';
const mascarar = a => { const s = String(a || ''); const i = s.indexOf('@'); return i < 3 ? '***' : s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i); };

function monta(assunto, corpo, imgB64) {
  const id = '<mini-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0'];
  if (!imgB64) return { bruto: cab.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF), id };
  const b = 'fronteira-mini-' + Date.now();
  const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo, '--' + b,
    'Content-Type: image/png; name="teste-visao2.png"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="teste-visao2.png"', '',
    imgB64.match(/.{1,76}/g).join(CRLF), '--' + b + '--', ''];
  return { bruto: cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF), id };
}

(async () => {
  const { ImapFlow } = require('imapflow');
  const imgB64 = fs.existsSync(path.join(__dirname, 'teste-visao2.png')) ? fs.readFileSync(path.join(__dirname, 'teste-visao2.png')).toString('base64') : null;
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const t0 = Date.now();
  const vistas = new Map();
  const caixas = ['INBOX'];
  try { for (const m of await client.list()) if (/enviad|sent|todos|all mail|spam/i.test(m.path)) caixas.push(m.path); } catch (e) {}

  async function varre() {
    for (const caixa of caixas) {
      let lock;
      try {
        lock = await client.getMailboxLock(caixa);
        const uids = await client.search({ subject: 'TESTE-REBOCL' });
        for (const uid of (uids || [])) {
          const m = await client.fetchOne(uid, { source: true, envelope: true });
          if (!m || !m.envelope) continue;
          const de = (m.envelope.from || [{}])[0].address || '';
          if (de.toLowerCase().indexOf(ALIAS.toLowerCase()) >= 0) continue;
          const id = m.envelope.messageId || (caixa + '|' + uid);
          const quando = m.envelope.date ? new Date(m.envelope.date).getTime() : 0;
          if (quando < t0 - 180000) continue;
          const texto = pegaTexto((m.source || '').toString(), String(m.envelope.subject || ''));
          const antigo = vistas.get(id);
          if (!antigo || texto.length > antigo.texto.length) vistas.set(id, { texto, caixa, quando, assunto: String(m.envelope.subject || ''), inReplyTo: m.envelope.inReplyTo || '' });
        }
      } catch (e) {} finally { if (lock) lock.release(); }
    }
  }
  async function envia(assunto, corpo, foto) {
    const { bruto, id } = monta(assunto, corpo, foto ? imgB64 : null);
    let lock;
    try { lock = await client.getMailboxLock('INBOX'); await client.append('INBOX', Buffer.from(bruto)); } finally { if (lock) lock.release(); }
    console.log('📤', assunto.replace(MARCA + ' ', ''), foto ? '(com foto)' : '');
    return { id, enviadoEm: Date.now(), assunto, corpo };
  }
  const acha = (caso) => { for (const r of vistas.values()) if (r.inReplyTo === caso.id) return r; for (const r of vistas.values()) if (r.assunto.indexOf(caso.assunto.replace('Re: ', '').replace(MARCA + ' ', '')) >= 0) return r; return null; };

  console.log('== memória, passo 1 (sem citação no passo 2) ==');
  const A = await envia(MARCA + ' R4-1 — memória (1/2)', 'Guarde uma palavra-chave para a próxima mensagem: JATOBÁ é o nome da horta. Responda só confirmado.');
  let rA = null;
  const limiteA = Date.now() + 6 * 60 * 1000;
  while (!rA && Date.now() < limiteA) { await sleep(20000); await varre(); rA = acha(A); }
  console.log(rA ? '📥 passo 1 respondido' : '⚠️ passo 1 SEM resposta (sigo mesmo assim)');
  await sleep(1500);
  const B = await envia('Re: ' + MARCA + ' R4-1 — memória (1/2)', 'Seguindo a nossa conversa: qual era a palavra-chave que combinei com você? Uma linha só.');
  const F = await envia(MARCA + ' R4-2 — foto nova', 'Anexei a foto nova do laboratório. Leia TODO o texto exatamente como aparece e liste as formas e cores.', true);

  const limite = Date.now() + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    await varre();
    const okB = !!acha(B), okF = !!acha(F);
    console.log('… memória:', okB ? '✔' : '—', '· foto:', okF ? '✔' : '—', '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (okB && okF) break;
    await sleep(20000);
  }
  await varre();
  const rB = acha(B), rF = acha(F);
  const checkM = rB ? (/JATOB[ÁA]/i.test(rB.texto) ? 'PASS (lembrou JATOBÁ sem citação)' : 'FALHOU (não lembrou)') : 'SEM RESPOSTA';
  const checkF = rF ? ((/quadrado|square/i.test(rF.texto) && /c[íi]rculo|circle/i.test(rF.texto) && /2026/.test(rF.texto)) ? 'PASS (formas + data completa)' : 'PARCIAL/FALHOU: ' + rF.texto.slice(0, 200).split(NL).join(' ')) : 'SEM RESPOSTA';

  const L = [];
  L.push('# 🧠 Mini-teste: memória (sem citação) + foto nova — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('- memória (parte 1, resposta): ' + (rA ? 'sim' : 'não'));
  L.push('- memória (parte 2, sem citar nada): ' + checkM);
  L.push('- foto nova (visão): ' + checkF);
  L.push('');
  if (rA) { L.push('## Parte 1 — resposta'); L.push('```'); L.push(rA.texto.slice(0, 800)); L.push('```'); L.push(''); }
  if (rB) { L.push('## Parte 2 — resposta (caminho do lembrete interno)'); L.push('```'); L.push(rB.texto.slice(0, 1200)); L.push('```'); L.push(''); }
  if (rF) { L.push('## Foto — resposta'); L.push('```'); L.push(rF.texto.slice(0, 1200)); L.push('```'); L.push(''); }
  L.push('---');
  L.push('_Gerado por `tools/teste-memoria.js` (workflow `teste-email.yml`). Endereços mascarados: ' + mascarar(USER) + '._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-memoria-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + L.join(NL).slice(0, 3000));
  console.log('💾 salvo em', destino);
  try { await client.logout(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
