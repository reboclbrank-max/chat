// 🧪 Contrato offline da receita 2B: dossiê estático, ramo reversível e nenhuma promoção.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
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
function raizTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dossie-controlado-'));
}
function alvo(pasta) { return path.join(pasta, dossie.CAMINHO_DOSSIE); }

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

ok('gera somente o dossiê literal em diretórios reais e ausentes', () => {
  const pasta = raizTemporaria();
  try {
    const resultado = dossie.gerarDossie(ambiente(), fs, pasta);
    assert.equal(resultado.caminho, path.join('propostas', 'central', 'dossie-preparo-controlado.md'));
    assert.equal(fs.readFileSync(alvo(pasta), 'utf8'), resultado.texto);
    assert.deepEqual(fs.readdirSync(path.join(pasta, 'propostas', 'central')), ['dossie-preparo-controlado.md']);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

ok('dossiê preexistente bloqueia sem sobrescrever o artefato', () => {
  const pasta = raizTemporaria();
  try {
    fs.mkdirSync(path.dirname(alvo(pasta)), { recursive: true });
    fs.writeFileSync(alvo(pasta), 'sentinela-controlada\n', 'utf8');
    assert.throws(() => dossie.gerarDossie(ambiente(), fs, pasta), /dossiê já existe/);
    assert.equal(fs.readFileSync(alvo(pasta), 'utf8'), 'sentinela-controlada\n');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

ok('cada diretório literal bloqueia link simbólico antes de escrever fora da raiz', () => {
  for (const componente of ['propostas', 'central']) {
    const pasta = raizTemporaria();
    const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'dossie-controlado-fora-'));
    try {
      if (componente === 'propostas') {
        fs.symlinkSync(fora, path.join(pasta, 'propostas'));
      } else {
        fs.mkdirSync(path.join(pasta, 'propostas'));
        fs.symlinkSync(fora, path.join(pasta, 'propostas', 'central'));
      }
      assert.throws(() => dossie.gerarDossie(ambiente(), fs, pasta), /caminho do dossiê/);
      const externo = componente === 'propostas'
        ? path.join(fora, 'central', 'dossie-preparo-controlado.md')
        : path.join(fora, 'dossie-preparo-controlado.md');
      assert.equal(fs.existsSync(externo), false);
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true });
      fs.rmSync(fora, { recursive: true, force: true });
    }
  }
});

ok('arquivo-alvo simbólico bloqueia sem tocar o destino externo', () => {
  const pasta = raizTemporaria();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'dossie-controlado-fora-'));
  try {
    const externo = path.join(fora, 'dossie-preparo-controlado.md');
    fs.mkdirSync(path.dirname(alvo(pasta)), { recursive: true });
    fs.writeFileSync(externo, 'sentinela-externa\n', 'utf8');
    fs.symlinkSync(externo, alvo(pasta));
    assert.throws(() => dossie.gerarDossie(ambiente(), fs, pasta), /dossiê já existe/);
    assert.equal(fs.readFileSync(externo, 'utf8'), 'sentinela-externa\n');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

ok('a ferramenta não recebe argumento/caminho livre, reserva o alvo e não aciona Git', () => {
  const fonte = ler('tools/dossie-preparo-controlado.js');
  const executavel = fonte.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(executavel, /process\.argv|child_process|exec\s*\(|spawn\s*\(|fetch\s*\(|https?:\/\/|git\s+/i);
  assert.match(fonte, /io\.lstatSync\(alvo\)/);
  assert.match(fonte, /prepararDestinoDossie\(io, raiz\)/);
  assert.match(fonte, /flag: 'wx'/);
  const iDestino = fonte.indexOf('const destino = prepararDestinoDossie(io, raiz)');
  const iTexto = fonte.indexOf('const texto = textoDossie(contexto)');
  const iEscrita = fonte.indexOf('io.writeFileSync(destino, texto');
  assert(iDestino >= 0 && iDestino < iTexto && iTexto < iEscrita, 'destino é validado e reservado antes da escrita');
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
