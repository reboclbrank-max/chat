const Module = require('module');
const orig = Module._load;
Module._load = function (p) { if (p === 'imapflow') return { ImapFlow: class {} }; if (p === 'nodemailer') return { createTransport: () => ({}) }; return orig.apply(this, arguments); };
const alvo = process.argv[2];
const src = require('fs').readFileSync(alvo, 'utf8');
const NL = '\n';
eval(src.slice(src.indexOf('function escHtml'), src.indexOf('function preparaFoto')));
const resp = 'O PDF indica **12 pés de couve**.\n\n**Formas e cores encontradas:**\n- quadrado azul\n- círculo *vermelho*\n- triângulo verde\n\n1. primeiro passo\n2. segundo passo\n\nUse `trim()` assim:\n```js\nconst s = x.trim();\n```\n<script>alert(1)</script> & 2 * 3 = 6\n\n— Assistente Rebocl (casa Rebocl Brank)';
const h = paraHtml(resp), t = semMarcacao(resp);
const checks = [
  ['negrito vira <b>', /<b>12 pés de couve<\/b>/.test(h)],
  ['lista vira <ul><li>', /<ul[^>]*><li>quadrado azul<\/li><li>círculo <i>vermelho<\/i><\/li>/.test(h)],
  ['numerada vira <ol>', /<ol[^>]*><li>primeiro passo<\/li><li>segundo passo<\/li><\/ol>/.test(h)],
  ['código vira <pre>', /<pre[^>]*>const s = x\.trim\(\);<\/pre>/.test(h)],
  ['HTML do texto é escapado', /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; 2 \* 3 = 6/.test(h) && !/<script>/.test(h)],
  ['assinatura discreta', /color:#777[^>]*>— Assistente Rebocl/.test(h)],
  ['texto puro sem **', !/\*\*/.test(t) && /O PDF indica 12 pés de couve\./.test(t)],
  ['texto puro mantém trim()', /trim\(\)/.test(t) && !/```/.test(t)],
];
let ok = 0;
for (const [n, r] of checks) { if (r) ok++; console.log((r ? '✔ ' : '✘ ') + n); }
// trava de remetentes
process.env.CHAT_DONO = 'Rebocl.Brank@gmail.com'.toLowerCase().replace('.', '');   // dono fictício para o teste: reboclbrank@gmail.com
const USER = 'casa.teste@gmail.com';
eval(src.slice(src.indexOf('function normalizaGmail'), src.indexOf('const avisadosNoTurno')).replace('const AUTORIZADOS', 'var AUTORIZADOS'));
const t2 = [['reboclbrank@gmail.com', true], ['rebocl.brank@gmail.com', true], ['reboclbrank+celular@googlemail.com', true], ['casa.teste+teste@gmail.com', true], ['casa.teste+estranho@gmail.com', false], ['casateste@gmail.com', false], ['reboclbrank@outlook.com', false], ['', false]];
for (const [a, esp] of t2) { const r = ehAutorizado(a); if (r === esp) ok++; console.log((r === esp ? '✔ ' : '✘ ') + 'remetente ' + (a || '(vazio)') + ' → ' + (r ? 'autorizado' : 'não autorizado')); }
console.log(ok + '/' + (checks.length + t2.length) + ' certos');
if (ok !== checks.length + t2.length) process.exitCode = 1;
