const Module = require('module'); const orig = Module._load;
Module._load = function (p) { if (p === 'imapflow') return { ImapFlow: class {} }; if (p === 'nodemailer') return { createTransport: () => ({}) }; return orig.apply(this, arguments); };
const alvo = process.argv[2];
const s = require('fs').readFileSync(alvo, 'utf8');
eval(s.slice(s.indexOf('function autenticidade'), s.indexOf('const avisadosNoTurno')));
const AR = 'Authentication-Results: mx.google.com;\r\n       ';
const casos = [
  ['dono pelo Gmail (dmarc=pass)', AR + 'dkim=pass header.i=@gmail.com header.s=20230601 header.b=abc;\r\n       spf=pass (google.com: domain of x@gmail.com designates 1.2.3.4 as permitted sender) smtp.mailfrom=x@gmail.com;\r\n       dmarc=pass (p=NONE sp=QUARANTINE dis=NONE) header.from=gmail.com\r\nFrom: Dono <reboclbrank@gmail.com>', 'reboclbrank@gmail.com', true],
  ['só dkim=pass do mesmo domínio', AR + 'dkim=pass header.i=@gmail.com header.s=20230601; spf=neutral smtp.mailfrom=x@gmail.com\r\nFrom: x', 'reboclbrank@gmail.com', true],
  ['FALSIFICADO (dmarc=fail)', AR + 'dkim=fail header.i=@gmail.com; spf=softfail smtp.mailfrom=x@gmail.com; dmarc=fail (p=NONE) header.from=gmail.com\r\nFrom: Dono <reboclbrank@gmail.com>', 'reboclbrank@gmail.com', false],
  ['FALSIFICADO com carimbo falso "pass" escondido embaixo', AR + 'spf=fail smtp.mailfrom=evil.com; dmarc=fail header.from=gmail.com\r\nReceived: from evil\r\nAuthentication-Results: mx.google.com; dmarc=pass header.from=gmail.com\r\nFrom: Dono <reboclbrank@gmail.com>', 'reboclbrank@gmail.com', false],
  ['dkim=pass de OUTRO domínio', AR + 'dkim=pass header.i=@evil.com; spf=pass smtp.mailfrom=evil.com; dmarc=fail header.from=gmail.com\r\nFrom: x', 'reboclbrank@gmail.com', false],
  ['1º carimbo não é do Gmail', 'Authentication-Results: evil.example; dmarc=pass\r\nAuthentication-Results: mx.google.com; dmarc=fail\r\nFrom: x', 'reboclbrank@gmail.com', false],
  ['posta por dentro (robô, sem carimbo)', 'From: "Teste da Casa" <casa+teste@gmail.com>\r\nSubject: [TESTE-REBOCL] R3-1', 'casa+teste@gmail.com', true],
];
let ok = 0;
for (const [n, cab, de, esp] of casos) { const r = autenticidade(cab, de); if (r.ok === esp) ok++; console.log((r.ok === esp ? '✔ ' : '✘ ') + n + ' → ' + (r.ok ? 'aceito' : 'recusado') + ' (' + r.motivo + ')'); }
// planilha
const chat = require(alvo);
const { execFileSync } = require('child_process');
execFileSync('python3', ['-c', 'import openpyxl; wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Materiais"; [ws.append(r) for r in [["Item", "Quantidade", "Preço"], ["Cimento 50 kg", 10, 38.9], ["Areia (m³)", 3, 120], ["Tijolo", 500, 0.85]]]; wb.save("/tmp/materiais.xlsx")']);
const b64 = require('fs').readFileSync('/tmp/materiais.xlsx').toString('base64');
const msg = ['Subject: q', 'Content-Type: multipart/mixed; boundary="X1"', '', '--X1', 'Content-Type: text/plain', '', 'Veja a planilha.', '--X1', 'Content-Type: application/octet-stream; name="materiais.xlsx"', 'Content-Disposition: attachment; filename="materiais.xlsx"', 'Content-Transfer-Encoding: base64', '', b64.match(/.{1,76}/g).join('\r\n'), '--X1--'].join('\r\n');
const doc = chat.extraiAnexoTexto(msg);
chat.docTexto(doc).then(t => {
  const certo = /Tijolo \| 500/.test(t) && /Cimento 50 kg \| 10 \| 38\.9/.test(t);
  if (certo) ok++;
  console.log((certo ? '✔ ' : '✘ ') + 'planilha .xlsx (tipo genérico) → ' + JSON.stringify(t.slice(0, 120)));
  console.log(ok + '/' + (casos.length + 1) + ' certos');
  if (ok !== casos.length + 1) process.exitCode = 1;
});
