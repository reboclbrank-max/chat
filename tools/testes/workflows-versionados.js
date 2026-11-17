// Contratos de FIXTURE — o que os workflows e as páginas prometem e ninguém prendia.
//
// Nasceu do mutador de fixture (tools/testes/mutador-fixture.js): 12 mutantes de YAML/JSON/HTML
// sobreviveram à suíte inteira, incluindo `contents: read → write` num workflow e
// `node-version: 22 → 20` em todos. O mutador de código é cego para eles — este arquivo é o
// contrato que os mata.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const pastaWorkflows = path.join(raiz, '.github', 'workflows');
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const workflows = fs.readdirSync(pastaWorkflows).filter(f => /\.ya?ml$/i.test(f)).sort();
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

// ── o runtime da CI é o mesmo que o package.json exige ──────────────────────
ok('todo workflow roda na MESMA versão de Node que o package.json exige (>=22)', () => {
  const engines = JSON.parse(ler('package.json')).engines || {};
  const menor = Number(String(engines.node || '').replace(/[^0-9]/g, '')) || 0;
  assert.ok(menor >= 22, 'package.json devia exigir Node >= 22; declara ' + JSON.stringify(engines));
  const errados = [];
  for (const w of workflows) {
    const texto = ler(path.join('.github', 'workflows', w));
    const versoes = [...texto.matchAll(/node-version:\s*['"]?(\d+)/g)].map(m => Number(m[1]));
    for (const v of versoes) if (v < menor) errados.push(w + ' usa ' + v);
  }
  assert.deepEqual(errados, [], 'workflow abaixo do mínimo do engines: ' + errados.join(', '));
});

// ── privilégio mínimo: workflow de teste não escreve no repositório ─────────
ok('o workflow da barreira declara `contents: read` e não pede escrita', () => {
  const texto = ler('.github/workflows/testes-rapidos.yml');
  const bloco = (texto.match(/^permissions:\n((?:\s{2}\S+:.*\n)+)/m) || [])[1] || '';
  assert.match(bloco, /contents:\s*read/, 'permissions do testes-rapidos.yml devia declarar contents: read');
  const escritas = bloco.split('\n').filter(l => /:\s*write\s*$/.test(l));
  assert.deepEqual(escritas, [], 'barreira não precisa de escrita: ' + escritas.join(' '));
});

// ── o agendamento existe e é um cron de cinco campos ────────────────────────
ok('todo cron declarado tem cinco campos e um minuto válido', () => {
  const ruins = [];
  for (const w of workflows) {
    const texto = ler(path.join('.github', 'workflows', w));
    for (const m of texto.matchAll(/cron:\s*['"]?([^'"\n]+)['"]?/g)) {
      const campos = m[1].trim().split(/\s+/);
      if (campos.length !== 5) { ruins.push(w + ' → "' + m[1] + '"'); continue; }
      // minutos válidos: número, lista (17,47), faixa (1-5), passo (*/6) ou *
      for (const c of campos) {
        if (!/^[0-9*/,\-]+$/.test(c)) ruins.push(w + ' campo "' + c + '"');
      }
    }
  }
  assert.deepEqual(ruins, [], 'cron malformado: ' + ruins.join(' | '));
});

// ── as páginas continuam com a política de segurança escrita por extenso ────
ok('toda página servida declara Content-Security-Policy com o nome exato', () => {
  const paginas = fs.readdirSync(raiz).filter(f => f.endsWith('.html'));
  const semPolitica = [];
  for (const p of paginas) {
    const texto = ler(p);
    if (!/http-equiv=["']Content-Security-Policy["']|Content-Security-Policy/i.test(texto)) continue;
    // o token tem de estar grafado como o navegador entende: qualquer variação de caixa
    // em "PolicY" é token ignorado em silêncio, e a página roda sem política.
    const ocorrencias = [...texto.matchAll(/Content-Security-Polic[a-z]*/gi)].map(m => m[0]);
    const tortas = ocorrencias.filter(o => o !== 'Content-Security-Policy');
    if (tortas.length) semPolitica.push(p + ' → ' + tortas[0]);
  }
  assert.deepEqual(semPolitica, [], 'política de segurança grafada errada (vira token ignorado): ' + semPolitica.join(', '));
});

let falhas = 0;
for (const c of casos) {
  try { c.fn(); console.log('✔ ' + c.nome); }
  catch (e) { falhas++; console.log('✘ ' + c.nome + ' → ' + e.message); }
}
console.log(casos.length - falhas + '/' + casos.length + ' contratos de fixture passaram');
if (falhas) process.exit(1);
