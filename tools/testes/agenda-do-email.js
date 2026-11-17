// Contrato da AGENDA do pulso de e-mail.
//
// Mutante de fixture que sobreviveu à suíte inteira (ciclo 3, mutador-fixture):
// `.github/workflows/email.yml` com o cron trocado — "7 */6 * * *" → "8 */6 * * *" e
// "17,47 * * * *" → "*/7 * * * *" — passava verde. Mudar a cadência do pulso de e-mail
// é mudar produção: quem espera resposta em minutos não recebe, ou o GitHub é acordado
// 12 vezes por hora em vez de 2.
//
// Regra do contrato: os valores são LITERAIS aqui. Importar do YAML transformaria o teste
// em tautologia — ele compararia o arquivo com ele mesmo e nunca ficaria vermelho.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const yml = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'email.yml'), 'utf8');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }
function crons(texto) {
  return [...texto.matchAll(/cron:\s*['"]?([^'"\n]+)['"]?/g)].map(m => m[1].trim());
}

ok('email.yml declara exatamente dois agendamentos, e são estes', () => {
  assert.deepEqual(crons(yml), ['7 */6 * * *', '17,47 * * * *'],
    'a agenda do pulso de e-mail não pode mudar em silêncio');
});

ok('o pulso roda de 6 em 6 horas, no minuto 7', () => {
  const [deSeisEmSeis, meioDeles] = crons(yml);
  const [minuto, hora] = deSeisEmSeis.split(' ');
  assert.equal(hora, '*/6', 'a varredura de 6 h é o pulso principal');
  assert.equal(minuto, '7', 'o minuto 7 evita a fila do :00');
  assert.equal(meioDeles, '17,47 * * * *', 'o aviso intermediário é 2× por hora, nos minutos 17 e 47');
});

ok('nenhum outro workflow roubou a cadência do e-mail', () => {
  const pasta = path.join(raiz, '.github', 'workflows');
  const outros = fs.readdirSync(pasta).filter(f => f.endsWith('.yml') && f !== 'email.yml');
  for (const outro of outros) {
    const texto = fs.readFileSync(path.join(pasta, outro), 'utf8');
    for (const c of crons(texto)) {
      assert.ok(c !== '7 */6 * * *', outro + ' repetiu a agenda do pulso de e-mail');
    }
  }
});

ok('o workflow do e-mail continua disparando pelo concurrency certo', () => {
  // O grupo de concorrência é o que impede duas reservas do mesmo turno.
  assert.match(yml, /concurrency:\s*\n\s+group:\s+.*email-reserva.*email-casa/is,
    'email.yml precisa separar a reserva (email-reserva) da casa (email-casa) no concurrency');
  assert.match(yml, /cancel-in-progress:\s*false/,
    'cancelar em andamento descartaria um turno pela metade');
});

let falhas = 0;
for (const c of casos) {
  try { c.fn(); console.log('✔ ' + c.nome); }
  catch (e) { falhas++; console.log('✘ ' + c.nome + ' → ' + e.message); }
}
console.log(casos.length - falhas + '/' + casos.length + ' contratos da agenda do e-mail passaram');
if (falhas) process.exit(1);
