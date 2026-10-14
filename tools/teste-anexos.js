// 📄 TESTE DOS ANEXOS DE DOCUMENTO (14/10/2026) — interno
// Três provas: PDF, Word (.docx) e TXT anexados → o chat tem que EXTRAIR o texto e responder sobre o conteúdo.
// Arquivos de prova: anexo-prova.pdf (relatório da horta), anexo-prova.docx (recado), anexo-prova.txt (lista).
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
  const id = '<doc-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0'];
  const b = 'fronteira-doc-' + Date.now();
  const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo, '--' + b,
    'Content-Type: ' + anexoTipo + '; name="' + anexoNome + '"', 'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="' + anexoNome + '"', '', anexoB64.match(/.{1,76}/g).join(CRLF), '--' + b + '--', ''];
  return { bruto: cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF), id };
}

(async () => {
  const arqs = {
    pdf: fs.readFileSync(path.join(__dirname, 'anexo-prova.pdf')).toString('base64'),
    docx: fs.readFileSync(path.join(__dirname, 'anexo-prova.docx')).toString('base64'),
    txt: fs.readFileSync(path.join(__dirname, 'anexo-prova.txt')).toString('base64'),
    scan: fs.readFileSync(path.join(__dirname, 'anexo-prova-scan.pdf')).toString('base64'),
  };
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
          if (!antigo || texto.length > antigo.texto.length) vistas.set(id, { texto, caixa, inReplyTo: m.envelope.inReplyTo || '' });
        }
      } catch (e) {} finally { if (lock) lock.release(); }
    }
  }
  async function envia(assunto, corpo, nome, b64, tipo) {
    const { bruto, id } = monta(assunto, corpo, nome, b64, tipo);
    let lock;
    try { lock = await client.getMailboxLock('INBOX'); await client.append('INBOX', Buffer.from(bruto)); } finally { if (lock) lock.release(); }
    console.log('📤', assunto.replace(MARCA + ' ', ''), '(' + nome + ')');
    return { id, nome };
  }
  const acha = (caso) => { for (const r of vistas.values()) if (r.inReplyTo === caso.id) return r; return null; };

  console.log('== teste dos anexos ==');
  const D1 = await envia(MARCA + ' D1 — PDF da horta', 'Li o relatório que mandei em PDF e preciso de dois números: quantos pés de couve a horta tem e qual é o código do portão do galpão?', 'anexo-prova.pdf', arqs.pdf, 'application/pdf');
  const D2 = await envia(MARCA + ' D2 — Word do recado', 'Me diga o que tem no recado do Word que acabei de mandar — quem eu tenho que pagar e quanto.', 'anexo-prova.docx', arqs.docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const D3 = await envia(MARCA + ' D3 — TXT da lista', 'Leia a listinha em anexo e me diga o que eu preciso comprar.', 'anexo-prova.txt', arqs.txt, 'text/plain');
  const D4 = await envia(MARCA + ' D4 — PDF digitalizado (scan)', 'O anexo é um papel digitalizado (uma foto vira PDF). Leia o recado e me diga: o que eu tenho que pagar e até quando?', 'anexo-prova-scan.pdf', arqs.scan, 'application/pdf');

  const alvos = [D1, D2, D3, D4];
  const limite = Date.now() + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    await sleep(20000); await varre();
    const prontos = alvos.filter(c => acha(c)).length;
    console.log('… respondidos:', prontos, '/', alvos.length, '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (prontos === alvos.length) break;
  }
  await varre();

  function checa(r, regras, rotulo) {
    if (!r) return 'SEM RESPOSTA';
    const t = r.texto;
    if (/n[ãa]o consegui ler o texto|n[ãa]o consegui abrir/i.test(t)) return 'FALHOU (disse que não conseguiu ler)';
    if (/c[ée]rebros est[ãa]o oscilando|motores.*oscilando/i.test(t)) return 'OSCILAÇÃO (motores fora — reenviar)';
    const bateu = regras.filter(k => new RegExp(k, 'i').test(t));
    return bateu.length >= Math.min(2, regras.length) ? 'PASS (citou: ' + bateu.join(', ') + ')' : 'PARCIAL (só: ' + bateu.join(', ') + ')';
  }
  const r1 = acha(D1), r2 = acha(D2), r3 = acha(D3), r4 = acha(D4);
  const c1 = checa(r1, ['12', 'couve', '7[\\s,-]*4[\\s,-]*2|742'], 'PDF');
  const c2 = checa(r2, ['350', 'pedreiro', 'z[ée]'], 'DOCX');
  const c3 = checa(r3, ['caf[ée]', 'arroz', 'couve'], 'TXT');
  const c4 = checa(r4, ['boleto', 's[íi]tio|sitio', 'sexta|zeca'], 'SCAN');

  const L = [];
  L.push('# 📄 Teste dos anexos de documento — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('- D1 (PDF: 12 pés de couve + código 7-4-2) → ' + c1);
  L.push('- D2 (Word: pagar o pedreiro Zé, R$ 350) → ' + c2);
  L.push('- D3 (TXT: café, arroz, mudas de couve) → ' + c3);
  L.push('- D4 (PDF digitalizado: pagar o boleto do sítio até sexta) → ' + c4);
  L.push('');
  for (const [rot, r] of [['D1 — PDF', r1], ['D2 — Word', r2], ['D3 — TXT', r3], ['D4 — PDF digitalizado (scan)', r4]]) {
    if (!r) continue;
    L.push('## ' + rot + ' — resposta (' + r.caixa + ')');
    L.push('```');
    L.push(r.texto.slice(0, 900));
    L.push('```');
    L.push('');
  }
  L.push('---');
  L.push('_Gerado por `tools/teste-anexos.js` (workflow `teste-email.yml`). Arquivos de prova: `tools/anexo-prova.pdf`, `.docx`, `.txt`, `.scan.pdf`._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-anexos-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + L.join(NL));
  console.log('💾 salvo em', destino);
  try { await client.logout(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
