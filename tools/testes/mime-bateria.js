// 🧪 bateria do leitor de MIME (v12.14): e-mails montados como os clientes reais montam
const Module = require('module');
const orig = Module._load;
Module._load = function (p) { if (p === 'imapflow') return { ImapFlow: class {} }; if (p === 'nodemailer') return { createTransport: () => ({}) }; return orig.apply(this, arguments); };
const chat = require(process.argv[2]);
const fs = require('fs');
const P = require('path').join(__dirname, '..') + '/';
const b64 = (buf) => buf.toString('base64').match(/.{1,76}/g).join('\r\n');
const png = b64(fs.readFileSync(P + 'teste-visao3.png'));
const pdf = b64(fs.readFileSync(P + 'anexo-prova.pdf'));
const grande = b64(Buffer.alloc(6 * 1024 * 1024, 7));        // 6 MB "de foto"
const logo = b64(Buffer.alloc(3000, 1));                      // ícone de assinatura (3 KB)
const heic = b64(Buffer.alloc(40000, 9));   // conteúdo não importa: o teste confere a extração
const L = a => a.join('\r\n');
const casos = [];
const add = (nome, msg, esperado) => casos.push({ nome, msg, esperado });
// 1) Gmail: texto dentro de multipart/alternative + foto anexada
add('Gmail · foto anexada', L(['Subject: q', 'Content-Type: multipart/mixed; boundary="AAA0000000000000"', '', '--AAA0000000000000', 'Content-Type: multipart/alternative; boundary="BBB0000000000000"', '', '--BBB0000000000000', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: quoted-printable', '', 'Qual a data escrita na imagem? Obrigado=21', '', '--BBB0000000000000', 'Content-Type: text/html; charset="UTF-8"', '', '<div>Qual a data escrita na imagem?</div>', '--BBB0000000000000--', '--AAA0000000000000', 'Content-Type: image/png; name="IMG_1.png"', 'Content-Disposition: attachment; filename="IMG_1.png"', 'Content-Transfer-Encoding: base64', '', png, '--AAA0000000000000--', '']),
  { texto: /Qual a data escrita na imagem\? Obrigado!/, fotos: 1 });
// 2) iPhone: texto base64 (cabeçalho quebrado) + foto inline dentro de multipart/related
add('iPhone · texto base64 + foto aninhada', L(['Subject: q', 'Content-Type: multipart/alternative;', '\tboundary=Apple-Mail-AAA', '', '--Apple-Mail-AAA', 'Content-Type: text/plain;', '\tcharset=utf-8', 'Content-Transfer-Encoding: base64', '', Buffer.from('O que tem nesta foto? É do meu quintal.').toString('base64'), '', '--Apple-Mail-AAA', 'Content-Type: multipart/related;', '\ttype="text/html";', '\tboundary=Apple-Mail-BBB', '', '--Apple-Mail-BBB', 'Content-Type: text/html; charset=utf-8', '', '<html>O que tem nesta foto?<img src="cid:x"></html>', '--Apple-Mail-BBB', 'Content-Type: image/jpeg;', '\tname=IMG_0001.jpeg', 'Content-Disposition: inline;', '\tfilename=IMG_0001.jpeg', 'Content-Transfer-Encoding: base64', 'Content-Id: <x>', '', png, '--Apple-Mail-BBB--', '', '--Apple-Mail-AAA--', '']),
  { texto: /O que tem nesta foto\? É do meu quintal\./, fotos: 1 });
// 3) Outlook: texto em base64 UTF-8 dentro de alternative
add('Outlook · texto base64', L(['Subject: q', 'Content-Type: multipart/alternative; boundary="_000_X_"', '', '--_000_X_', 'Content-Type: text/plain; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', Buffer.from('Bom dia! Quanto custa um saco de cimento?').toString('base64'), '', '--_000_X_', 'Content-Type: text/html; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', Buffer.from('<p>Bom dia!</p>').toString('base64'), '', '--_000_X_--', '']),
  { texto: /Bom dia! Quanto custa um saco de cimento\?/, fotos: 0 });
// 4) Latin-1 quoted-printable, parte única
add('Latin-1 · quoted-printable', L(['Subject: q', 'Content-Type: text/plain; charset=ISO-8859-1', 'Content-Transfer-Encoding: quoted-printable', '', 'Voc=EA pode me ajudar com a horta? Est=E1 seca.']),
  { texto: /Você pode me ajudar com a horta\? Está seca\./, fotos: 0 });
// 5) formatos do robô (não podem regredir)
add('robô · texto simples', L(['Subject: [TESTE-REBOCL] R3-1', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', 'Quais recursos você tem? Cite foto e WhatsApp.']), { texto: /Quais recursos você tem\?/, fotos: 0 });
add('robô · só HTML', L(['Subject: [TESTE-REBOCL] R3-11', 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', '<html><body><p>Oi! <b>Pergunta:</b> quantos dias tem o m&ecirc;s de outubro?</p></body></html>']), { texto: /quantos dias tem o mês de outubro/, fotos: 0 });
add('robô · foto + PDF', L(['Subject: [TESTE-REBOCL] R3-12', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="fronteira-teste-1"', '', '--fronteira-teste-1', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', 'Anexei uma FOTO e um PDF juntos.', '--fronteira-teste-1', 'Content-Type: image/png; name="teste-visao3.png"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="teste-visao3.png"', '', png, '--fronteira-teste-1', 'Content-Type: application/pdf; name="anexo-prova.pdf"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="anexo-prova.pdf"', '', pdf, '--fronteira-teste-1--']),
  { texto: /Anexei uma FOTO e um PDF juntos\./, fotos: 1, doc: 'anexo-prova.pdf' });
// 6) HEIC como octet-stream (iPhone) + foto de 6 MB + logo de assinatura
add('HEIC genérico + foto 6 MB + logo', L(['Subject: q', 'Content-Type: multipart/mixed; boundary="M1"', '', '--M1', 'Content-Type: text/plain; charset=utf-8', '', 'Seguem as fotos.', '--M1', 'Content-Type: application/octet-stream; name="IMG_4455.HEIC"', 'Content-Disposition: attachment; filename="IMG_4455.HEIC"', 'Content-Transfer-Encoding: base64', '', heic, '--M1', 'Content-Type: image/jpeg; name="grande.jpg"', 'Content-Disposition: attachment; filename="grande.jpg"', 'Content-Transfer-Encoding: base64', '', grande, '--M1', 'Content-Type: image/png; name="logo.png"', 'Content-Disposition: inline; filename="logo.png"', 'Content-Transfer-Encoding: base64', '', logo, '--M1--']),
  { texto: /Seguem as fotos\./, fotos: 2, tipos: ['image/heic', 'image/jpeg'] });
// 7) Gmail: PDF anexado + texto aninhado; áudio m4a genérico; anexo .txt sem base64
add('Gmail · PDF + áudio m4a genérico', L(['Subject: q', 'Content-Type: multipart/mixed; boundary="G1"', '', '--G1', 'Content-Type: multipart/alternative; boundary="G2"', '', '--G2', 'Content-Type: text/plain; charset="UTF-8"', '', 'Resuma o PDF, por favor.', '--G2--', '--G1', 'Content-Type: application/pdf; name="relatorio.pdf"', 'Content-Disposition: attachment; filename="relatorio.pdf"', 'Content-Transfer-Encoding: base64', '', pdf, '--G1', 'Content-Type: application/octet-stream; name="nota.m4a"', 'Content-Disposition: attachment; filename="nota.m4a"', 'Content-Transfer-Encoding: base64', '', b64(Buffer.alloc(5000, 3)), '--G1--']),
  { texto: /Resuma o PDF, por favor\./, fotos: 0, doc: 'relatorio.pdf', audio: 'audio/mp4' });
add('anexo .txt sem base64', L(['Subject: q', 'Content-Type: multipart/mixed; boundary="T1"', '', '--T1', 'Content-Type: text/plain; charset=utf-8', '', 'Veja a lista anexa.', '--T1', 'Content-Type: text/plain; charset=utf-8; name="lista.txt"', 'Content-Disposition: attachment; filename="lista.txt"', 'Content-Transfer-Encoding: 7bit', '', 'arroz, feijão, cimento, areia, tijolo, cal', '--T1--']),
  { texto: /Veja a lista anexa\./, fotos: 0, doc: 'lista.txt', docTexto: /feijão, cimento/ });
let ok = 0;
for (const c of casos) {
  const t = chat.pegaTexto(c.msg, 'ASSUNTO');
  const f = chat.extraiAnexos(c.msg);
  const d = chat.extraiAnexoTexto(c.msg);
  const a = chat.extraiAudio(c.msg);
  const erros = [];
  if (!c.esperado.texto.test(t)) erros.push('texto=' + JSON.stringify(String(t).slice(0, 60)));
  if (f.length !== c.esperado.fotos) erros.push('fotos=' + f.length);
  if (c.esperado.tipos && JSON.stringify(f.map(x => x.tipo)) !== JSON.stringify(c.esperado.tipos)) erros.push('tipos=' + f.map(x => x.tipo));
  if (c.esperado.doc && (!d || d.nome !== c.esperado.doc)) erros.push('doc=' + (d && d.nome));
  if (c.esperado.docTexto && !(d && c.esperado.docTexto.test(Buffer.from(d.b64, 'base64').toString('utf-8')))) erros.push('docTexto');
  if (c.esperado.audio && (!a || a.tipo !== c.esperado.audio)) erros.push('audio=' + (a && a.tipo));
  if (!erros.length) ok++;
  console.log((erros.length ? '✘ ' : '✔ ') + c.nome + (erros.length ? ' → ' + erros.join(' · ') : ''));
}
console.log(ok + '/' + casos.length + ' certos');
if (ok !== casos.length) process.exitCode = 1;
