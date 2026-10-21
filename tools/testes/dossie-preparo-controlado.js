// 🧪 Contrato offline da receita 2B: dossiê estático, ramo reversível e nenhuma promoção.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..', '..');
const dossie = require(path.join(raiz, 'tools', 'dossie-preparo-controlado.js'));

let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function ambiente(extra) {
  return Object.assign({
    GITHUB_SHA: 'a'.repeat(40),
    GITHUB_RUN_ID: '1234567890',
    GITHUB_REF: 'refs/heads/main'
  }, extra || {});
}

ok('aceita exclusivamente o contexto GitHub fechado de main', () => {
  assert.deepEqual(dossie.contextoSeguro(ambiente()), {
    sha: 'a'.repeat(40), runId: '1234567890', ref: 'refs/heads/main'
  });
  for (const parcial of [
    { GITHUB_SHA: 'A'.repeat(40) },
    { GITHUB_SHA: 'a'.repeat(39) },
    { GITHUB_RUN_ID: '0' },
    { GITHUB_RUN_ID: '12\n34' },
    { GITHUB_RUN_ID: '123456789012345678901' },
    { GITHUB_REF: 'refs/heads/outra' },
    { GITHUB_REF: 'refs/tags/v1' }
  ]) assert.throws(() => dossie.contextoSeguro(ambiente(parcial)), /contexto do dossiê inválido/);
});

ok('o texto é sanitizado, estático e declara revisão e rollback', () => {
  const texto = dossie.textoDossie(dossie.contextoSeguro(ambiente()));
  assert.match(texto, /^# Dossiê de revisão controlada da Central/m);
  assert.match(texto, /`a{40}`/);
  assert.match(texto, /`1234567890`/);
  assert.match(texto, /propostas\/central\/dossie-preparo-controlado\.md/);
  assert.match(texto, /Revisão humana obrigatória/);
  assert.match(texto, /Rollback/);
  assert.match(texto, /não é código pronto, não é uma PR e não autoriza promoção/i);
  assert.match(texto, /não há alteração de código, dependência, permissão, infraestrutura, dado, configuração, `main`, tag, release ou pull request/i);
  assert.doesNotMatch(texto, /https?:\/\/|Authorization:|GITHUB_TOKEN|secrets\.|process\.env|exec\(|spawn\(/i);
});

ok('a ferramenta escreve somente o caminho literal sem ler argumento ou acionar Git', () => {
  const chamadas = [];
  const io = {
    mkdirSync: (...args) => chamadas.push(['mkdir', ...args]),
    writeFileSync: (...args) => chamadas.push(['write', ...args])
  };
  const resultado = dossie.gerarDossie(ambiente(), io);
  assert.equal(resultado.caminho, path.join('propostas', 'central', 'dossie-preparo-controlado.md'));
  assert.equal(chamadas.length, 2);
  assert.deepEqual(chamadas[0], ['mkdir', path.join('propostas', 'central'), { recursive: true }]);
  assert.equal(chamadas[1][0], 'write');
  assert.equal(chamadas[1][1], dossie.CAMINHO_DOSSIE);
  assert.equal(chamadas[1][3].encoding, 'utf8');
  const fonte = ler('tools/dossie-preparo-controlado.js');
  const executavel = fonte.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(executavel, /process\.argv|child_process|exec\s*\(|spawn\s*\(|fetch\s*\(|https?:\/\/|git\s+/i);
});

ok('o workflow percorre preflight antes da única escrita e falha fechado fora de main', () => {
  const workflow = ler('.github/workflows/dossie-preparo-controlado.yml');
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m);
  assert.match(workflow, /^permissions:\n  contents: write\s*$/m);
  assert.doesNotMatch(workflow, /^\s*(?:actions|pull-requests):\s*write\s*$/m);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /timeout-minutes: 8/);
  assert.match(workflow, /dossie-preparo-controlado-\$\{\{ github\.ref \}\}/);
  assert.match(workflow, /\[ "\$GITHUB_REF" = 'refs\/heads\/main' \] \|\|/);
  assert.match(workflow, /\[ "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA" \] \|\|/);
  assert.match(workflow, /origem="\$\(git remote get-url origin\)"/);
  assert.match(workflow, /case "\$origem" in https:\/\/github\.com\/reboclbrank-max\/chat\|https:\/\/github\.com\/reboclbrank-max\/chat\.git\)/);
  const iPreflight = workflow.indexOf('node tools/preparo-controlado.js');
  const iGeracao = workflow.indexOf('node tools/dossie-preparo-controlado.js');
  const iRamo = workflow.indexOf('git switch -c "$ramo"');
  const iAdd = workflow.indexOf('git add -- propostas/central/dossie-preparo-controlado.md');
  const iPush = workflow.indexOf('git push origin "HEAD:refs/heads/$ramo"');
  assert(iPreflight >= 0 && iPreflight < iGeracao && iGeracao < iRamo && iRamo < iAdd && iAdd < iPush, 'ordem segura preflight → dossiê → ramo → arquivo → push');
  assert.match(workflow, /case "\$GITHUB_RUN_ID" in ''\|\*\[!0-9\]\*\)/);
  assert.match(workflow, /ramo="central\/dossie-preparo-\$\{GITHUB_RUN_ID\}"/);
  assert.match(workflow, /git diff --cached --quiet/);
  assert.match(workflow, /git commit -m "docs\(central\): dossiê de revisão controlada"/);
  assert.doesNotMatch(workflow, /--force|git push[^\n]*HEAD:main|git push[^\n]*refs\/heads\/main|git merge|gh pr\b|pull_request|git tag\b|gh release\b/i);
  assert.doesNotMatch(workflow, /\$\{\{\s*inputs\.|secrets\.|curl\s|wget\s|npm install/i);
});

ok('a receita mantém checkout e setup-node fixados por SHA e não recebe entradas livres', () => {
  const workflow = ler('.github/workflows/dossie-preparo-controlado.yml');
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/);
  assert.doesNotMatch(workflow, /inputs:|workflow_call:|schedule:|repository_dispatch:/);
  assert.match(workflow, /Não há pull request, merge, tag, release, promoção ou modificação de main/);
});

console.log(`${certos}/${certos + falhas} testes do dossiê controlado passaram`);
process.exitCode = falhas ? 1 : 0;
