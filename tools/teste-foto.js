// 📷 TESTE RÁPIDO DA FOTO (14/10/2026) — interno
// Manda UMA foto (imagem v3, com o texto medido dentro da borda) e confere o que volta:
// o texto exato e as formas/cores. Serve para provar a visão E a lupa de texto (OCR) quando ela entra.
const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { pegaTexto } = require('./email-chat.js');
const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ARROBA = USER.indexOf('@');
const ALIAS = ARROBA > 0 ? USER.slice(0, ARROBA) + '+teste' + USER.slice(ARROBA) : 'x@y';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 7);
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MARCA = '[TESTE-REBOCL]';
const IMAGEM = 'teste-visao3.png';

function monta(assunto, corpo, imgB64) {
  const id = '<foto-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0'];
  const b = 'fronteira-foto-' + Date.now();
  const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo, '--' + b,
    'Content-Type: image/png; name="' + IMAGEM + '"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="' + IMAGEM + '"', '',
    imgB64.match(/.{1,76}/g).join(CRLF), '--' + b + '--', ''];
  return { bruto: cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF), id };
}

(async () => {
  const imgB64 = fs.existsSync(path.join(__dirname, IMAGEM)) ? fs.readFileSync(path.join(__dirname, IMAGEM)).toString('base64') : null;
  if (!imgB64) { console.error('imagem ' + IMAGEM + ' não encontrada ao lado do script'); process.exit(1); }
  let client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  // Uma conexão IMAP caída não pode consumir todo o timeout do workflow nem transformar falta de prova em verde.
  const comTeto = (p, ms, rotulo) => { Promise.resolve(p).catch(() => {}); return Promise.race([p, new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('teto ' + Math.round(ms / 1000) + 's: ' + rotulo)), ms))]); };
  async function reconecta(motivo) {
    try { client.close(); } catch (e) {}
    client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
    await comTeto(client.connect(), 45000, 'reconexão');
    console.log('🔌 reconectado (' + motivo + ')');
  }
  await comTeto(client.connect(), 45000, 'conexão inicial');
  const t0 = Date.now();
  const vistas = new Map();
  const caixas = ['INBOX'];
  try { for (const m of await comTeto(client.list(), 20000, 'lista de caixas')) if (/enviad|sent|todos|all mail|spam/i.test(m.path)) caixas.push(m.path); } catch (e) {}

  async function varre() {
    let caixasOk = 0;
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
          if (!antigo || texto.length > antigo.texto.length) vistas.set(id, { texto, caixa, inReplyTo: m.envelope.inReplyTo || '' });
        }
        caixasOk++;
      } catch (e) {} finally { if (lock) lock.release(); }
    }
    if (!caixasOk) throw new Error('nenhuma caixa respondeu');
  }
  async function varreSegura() {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        await comTeto(client.status('INBOX', { uidNext: true }), 15000, 'sonda');
        await comTeto(varre(), 60000, 'varredura');
        return true;
      } catch (e) {
        console.log('⚠️ varredura falhou (' + String(e.message || e).slice(0, 70) + ')');
        try { await reconecta('varredura'); } catch (e2) {}
      }
    }
    return false;
  }
  console.log('== teste da foto ==');
  const { bruto, id } = monta(MARCA + ' F1 — foto v3', 'Anexei a foto do laboratório. Leia TODO o texto exatamente como aparece e liste as formas e cores.', imgB64);
  let lock;
  try {
    lock = await comTeto(client.getMailboxLock('INBOX'), 30000, 'envio');
    await comTeto(client.append('INBOX', Buffer.from(bruto)), 60000, 'append');
  } finally { if (lock) lock.release(); }
  console.log('📤 enviado com', IMAGEM);
  let r = null;
  const limite = Date.now() + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    await sleep(20000); await varreSegura();
    for (const v of vistas.values()) if (v.inReplyTo === id) r = v;
    console.log('… respondeu?', r ? '✔ (' + r.caixa + ')' : '—', '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (r) break;
  }
  const texto = r ? r.texto : '';
  const temTexto = /REBOC[lI1|]/i.test(texto) && /2026/.test(texto);
  const temFormas = /quadrado/i.test(texto) && /c[íi]rculo/i.test(texto) && /tri[âa]ngulo/i.test(texto);
  const cores = /azul/i.test(texto) && /vermelh/i.test(texto) && /verde/i.test(texto);
  const veredito = !r ? 'SEM RESPOSTA' : (temTexto && temFormas && cores ? 'PASS (texto + formas + cores)' : (temTexto ? 'PARCIAL (texto ok; formas/cores não)' : 'FALHOU'));
  const L = [];
  L.push('# 📷 Teste da foto (v3) — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('- veredito: ' + veredito);
  L.push('- texto lido certo: ' + temTexto + ' · formas: ' + temFormas + ' · cores: ' + cores);
  L.push('');
  if (r) { L.push('## Resposta (' + r.caixa + ')'); L.push('```'); L.push(texto.slice(0, 1200)); L.push('```'); }
  L.push('');
  L.push('---');
  L.push('_Gerado por `tools/teste-foto.js` (workflow `teste-email.yml`)._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-foto-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + L.join(NL));
  console.log('💾 salvo em', destino);
  try { await comTeto(client.logout(), 15000, 'logout'); } catch (e) {}
  process.exit(veredito.indexOf('PASS') === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
