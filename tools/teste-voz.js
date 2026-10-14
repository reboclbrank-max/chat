// 🎙️ TESTE DA VOZ (14/10/2026) — interno
// Três provas numa rodada:
//   V1 — comando `voz: ...`      → a resposta TEM que vir com um áudio falado em anexo.
//   V2 — pedido natural ("me manda um bom dia em áudio") → idem.
//   V3 — o robô MANDA um áudio (voz-amostra.mp3: "Amanhã bem cedo, regue a horta e lembre o seu filho do almoço.")
//        → a resposta TEM que mostrar que ouviu (citar o conteúdo), sem cair no aviso de "não consegui ouvir".
// Os áudios recebidos ficam salvos em provas/ como prova de verdade.
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

function monta(assunto, corpo, anexoNome, anexoB64, anexoTipo) {
  const id = '<voz-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0'];
  if (!anexoB64) return { bruto: cab.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF), id };
  const b = 'fronteira-voz-' + Date.now();
  const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo, '--' + b,
    'Content-Type: ' + (anexoTipo || 'audio/mpeg') + '; name="' + anexoNome + '"', 'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="' + anexoNome + '"', '', anexoB64.match(/.{1,76}/g).join(CRLF), '--' + b + '--', ''];
  return { bruto: cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF), id };
}

// anexos de áudio da RESPOSTA do chat
function anexosAudio(bruto) {
  const achados = [];
  const mB = String(bruto).match(/content-type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n;]+)"?/i);
  if (!mB) return achados;
  const sep = '--' + mB[1].replace(/^--/, '');
  for (const p of String(bruto).split(sep)) {
    const iCab = p.search(/\r?\n\r?\n/);
    if (iCab < 0) continue;
    const cab = p.slice(0, iCab);
    if (!/content-type:\s*audio\//i.test(cab)) continue;
    const nome = (cab.match(/name="?([^"\r\n;]+)"?/i) || [])[1] || 'audio';
    const tipo = (cab.match(/content-type:\s*(audio\/[a-z0-9.+-]+)/i) || [])[1] || '';
    const corpo = p.slice(iCab).replace(/^\r?\n\r?\n/, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (corpo.length < 400) continue;
    achados.push({ nome, tipo, b64: corpo, bytes: Math.floor(corpo.length * 3 / 4) });
  }
  return achados;
}
function somValido(b64) {
  try {
    const d = Buffer.from(b64.slice(0, 400), 'base64');
    if (d.slice(0, 3).toString() === 'ID3') return true;
    if (d[0] === 0xFF && (d[1] & 0xE0) === 0xE0) return true;   // mp3
    if (d.slice(0, 4).toString() === 'RIFF') return true;        // wav
    if (d.slice(0, 4).toString() === 'OggS') return true;        // ogg/opus
    return false;
  } catch (e) { return false; }
}

(async () => {
  const amostra = fs.existsSync(path.join(__dirname, 'voz-amostra.mp3')) ? fs.readFileSync(path.join(__dirname, 'voz-amostra.mp3')).toString('base64') : null;
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
          const fonte = (m.source || '').toString();
          const texto = pegaTexto(fonte, String(m.envelope.subject || ''));
          const antigo = vistas.get(id);
          if (!antigo || texto.length > antigo.texto.length) vistas.set(id, { texto, fonte, caixa, inReplyTo: m.envelope.inReplyTo || '' });
        }
      } catch (e) {} finally { if (lock) lock.release(); }
    }
  }
  async function envia(assunto, corpo, anexoNome, anexoB64, anexoTipo) {
    const { bruto, id } = monta(assunto, corpo, anexoNome, anexoB64, anexoTipo);
    let lock;
    try { lock = await client.getMailboxLock('INBOX'); await client.append('INBOX', Buffer.from(bruto)); } finally { if (lock) lock.release(); }
    console.log('📤', assunto.replace(MARCA + ' ', ''), anexoNome ? '(com áudio)' : '');
    return { id, assunto, corpo };
  }
  const acha = (caso) => { for (const r of vistas.values()) if (r.inReplyTo === caso.id) return r; for (const r of vistas.values()) if (r.assunto === undefined && false) return r; return null; };

  console.log('== teste da voz ==');
  const V1 = await envia(MARCA + ' V1 — voz: comando', 'voz: A casa Rebocl agradece e deseja um bom dia de trabalho.');
  const V2 = await envia(MARCA + ' V2 — voz: pedido natural', 'Me manda um bom dia em áudio, por favor. Diga que a horta está de pé.');
  const V3 = amostra
    ? await envia(MARCA + ' V3 — ouvir áudio do dono', 'Ouvi meu áudio e me diga o que eu pedi.', 'voz-amostra.mp3', amostra, 'audio/mpeg')
    : (console.log('⚠️ sem voz-amostra.mp3 ao lado do script — pulo o V3'), null);

  const alvos = [V1, V2].concat(V3 ? [V3] : []);
  const limite = Date.now() + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    await sleep(20000); await varre();
    const prontos = alvos.filter(c => acha(c)).length;
    console.log('… respondidos:', prontos, '/', alvos.length, '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (prontos === alvos.length) break;
  }
  await varre();

  const r1 = acha(V1), r2 = acha(V2), r3 = V3 ? acha(V3) : null;
  function vereditoAudio(r, nome) {
    if (!r) return { v: 'SEM RESPOSTA', det: '' };
    const as = anexosAudio(r.fonte);
    if (!as.length) return { v: 'FALHOU (sem anexo)', det: r.texto.slice(0, 160).split(NL).join(' ') };
    const a = as[0];
    const ok = a.bytes > 5000 && somValido(a.b64);
    try { fs.writeFileSync(path.join(__dirname, '..', 'provas', nome + '.mp3'), Buffer.from(a.b64, 'base64')); } catch (e) {}
    return { v: ok ? 'PASS (áudio em anexo: ' + a.nome + ', ' + Math.round(a.bytes / 1024) + 'KB, ' + a.tipo + ')' : 'ANEXO SUSPEITO (' + Math.round(a.bytes / 1024) + 'KB)', det: r.texto.slice(0, 200).split(NL).join(' ') };
  }
  const c1 = vereditoAudio(r1, 'voz-resposta-v1');
  const c2 = vereditoAudio(r2, 'voz-resposta-v2');
  let c3 = { v: 'SEM RESPOSTA', det: '' };
  if (V3) {
    if (!r3) c3 = { v: 'SEM RESPOSTA', det: '' };
    else {
      const t = r3.texto;
      const mudo = /n[ãa]o consegui ouvi/i.test(t);
      const chaves = ['horta', 'filho', 'almo[çc]o', 'cedo', 'manh[ãa]', 'amanh[ãa]', 'regue', 'rega'];
      const bateu = chaves.filter(k => new RegExp(k, 'i').test(t));
      const oscilou = /c[ée]rebros est[ãa]o oscilando/i.test(t);
      c3 = {
        v: mudo ? 'FALHOU (disse que não conseguiu ouvir)' : (oscilou ? 'OSCILAÇÃO (motores fora — reenviar)' : (bateu.length >= 2 ? 'PASS (ouviu: ' + bateu.join(', ') + ')' : 'PARCIAL (não citou o conteúdo: ' + bateu.join(', ') + ')')),
        det: t.slice(0, 300).split(NL).join(' ')
      };
    }
  }

  const L = [];
  L.push('# 🎙️ Teste da voz (falar e ouvir) — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('- V1 (comando voz:) → ' + c1.v);
  L.push('- V2 (pedido natural "me manda em áudio") → ' + c2.v);
  L.push('- V3 (robô mandou áudio; o chat devia OUVIR) → ' + c3.v);
  L.push('');
  for (const [rot, r, c] of [['V1', r1, c1], ['V2', r2, c2], ['V3', r3, c3]]) {
    if (!r) continue;
    L.push('## ' + rot + ' — resposta (' + r.caixa + ')');
    L.push('```');
    L.push(r.texto.slice(0, 900));
    L.push('```');
    L.push('');
  }
  L.push('---');
  L.push('_Gerado por `tools/teste-voz.js` (workflow `teste-email.yml`). Áudios recebidos salvos em `provas/voz-resposta-v1.mp3` e `v2.mp3`._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-voz-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + L.join(NL));
  console.log('💾 salvo em', destino);
  try { await client.logout(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
