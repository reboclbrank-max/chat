// 🧪 Contrato offline da receita 3A: patch literal, três caminhos e ramo revisável.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const reforco = require(path.join(raiz, 'tools', 'reforco-dossie-controlado.js'));

let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function ler(relativo) { return fs.readFileSync(path.join(raiz, relativo), 'utf8'); }
function ambiente(extra) {
  return Object.assign({
    GITHUB_SHA: 'b'.repeat(40),
    GITHUB_RUN_ID: '2345678901',
    GITHUB_REF: 'refs/heads/main'
  }, extra || {});
}
function prepararRaizTemporaria() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-'));
  for (const relativo of reforco.RECEITA.caminhos.slice(0, 2)) {
    const destino = path.join(pasta, relativo);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(path.join(raiz, relativo), destino);
  }
  return pasta;
}

ok('catálogo é único, congelado e limitado a três caminhos literais', () => {
  assert(Object.isFrozen(reforco.RECEITA));
  assert(Object.isFrozen(reforco.RECEITA.caminhos));
  assert.deepEqual(reforco.RECEITA, {
    id: 'reforco_dossie_escopo_v1',
    repositorio: 'reboclbrank-max/chat',
    ref: 'refs/heads/main',
    prefixoRamo: 'central/reforco-dossie-',
    caminhos: [
      '.github/workflows/dossie-preparo-controlado.yml',
      'tools/testes/dossie-preparo-controlado.js',
      'propostas/central/reforco-dossie-controlado.md'
    ]
  });
});

ok('aceita somente contexto GitHub fechado de main', () => {
  assert.deepEqual(reforco.contextoSeguro(ambiente()), {
    sha: 'b'.repeat(40), runId: '2345678901', ref: 'refs/heads/main'
  });
  for (const parcial of [
    { GITHUB_SHA: 'B'.repeat(40) },
    { GITHUB_SHA: 'b'.repeat(39) },
    { GITHUB_RUN_ID: '0' },
    { GITHUB_RUN_ID: '23\n45' },
    { GITHUB_RUN_ID: '234567890123456789012' },
    { GITHUB_REF: 'refs/heads/outra' }
  ]) assert.throws(() => reforco.contextoSeguro(ambiente(parcial)), /contexto do reforço inválido/);
});

ok('aplica somente o patch literal, a regressão correspondente e o relatório sanitizado', () => {
  const pasta = prepararRaizTemporaria();
  try {
    const arquivoWorkflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const arquivoTeste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const modoWorkflow = fs.statSync(arquivoWorkflow).mode & 0o777;
    const modoTeste = fs.statSync(arquivoTeste).mode & 0o777;
    const resultado = reforco.prepararReforco(ambiente(), pasta);
    assert.deepEqual(resultado.caminhos, reforco.RECEITA.caminhos);
    const workflow = fs.readFileSync(arquivoWorkflow, 'utf8');
    const teste = fs.readFileSync(arquivoTeste, 'utf8');
    const relatorio = fs.readFileSync(path.join(pasta, reforco.RECEITA.caminhos[2]), 'utf8');
    assert.match(workflow, /alterados="\$\(git diff --cached --name-only\)"/);
    assert.match(workflow, /\[ "\$alterados" = 'propostas\/central\/dossie-preparo-controlado\.md' \] \|\|/);
    assert.match(teste, /alterados="\\\$\\\(git diff --cached --name-only\\\)"/);
    assert(teste.includes("propostas\\/central\\/dossie-preparo-controlado\\.md"));
    assert.match(relatorio, /^# Reforço revisável do escopo do dossiê/m);
    assert.match(relatorio, /`b{40}`/);
    assert.match(relatorio, /`2345678901`/);
    assert.match(relatorio, /três caminhos permitidos/);
    assert.doesNotMatch(relatorio, /https?:\/\/|Authorization:|GITHUB_TOKEN|secrets\.|process\.env|exec\(|spawn\(/i);
    assert.equal(fs.statSync(arquivoWorkflow).mode & 0o777, modoWorkflow);
    assert.equal(fs.statSync(arquivoTeste).mode & 0o777, modoTeste);
    assert.equal(fs.existsSync(path.join(pasta, reforco.RECEITA.caminhos[0]) + '.reforco-temporario'), false);
    assert.equal(fs.existsSync(path.join(pasta, reforco.RECEITA.caminhos[1]) + '.reforco-temporario'), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

ok('base incompatível falha antes de escrever qualquer arquivo', () => {
  const pasta = prepararRaizTemporaria();
  try {
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    fs.writeFileSync(teste, 'base incompatível', 'utf8');
    const original = fs.readFileSync(path.join(pasta, reforco.RECEITA.caminhos[0]), 'utf8');
    assert.throws(() => reforco.prepararReforco(ambiente(), pasta), /base incompatível/);
    assert.equal(fs.readFileSync(path.join(pasta, reforco.RECEITA.caminhos[0]), 'utf8'), original);
    assert.equal(fs.existsSync(path.join(pasta, reforco.RECEITA.caminhos[2])), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

ok('relatório preexistente bloqueia antes dos dois edits literais', () => {
  const pasta = prepararRaizTemporaria();
  try {
    const workflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const relatorio = path.join(pasta, reforco.RECEITA.caminhos[2]);
    const workflowAntes = fs.readFileSync(workflow, 'utf8');
    const testeAntes = fs.readFileSync(teste, 'utf8');
    fs.mkdirSync(path.dirname(relatorio), { recursive: true });
    fs.writeFileSync(relatorio, 'sentinela-controlada\n', 'utf8');
    assert.throws(() => reforco.prepararReforco(ambiente(), pasta), /relatório já existe/);
    assert.equal(fs.readFileSync(workflow, 'utf8'), workflowAntes);
    assert.equal(fs.readFileSync(teste, 'utf8'), testeAntes);
    assert.equal(fs.readFileSync(relatorio, 'utf8'), 'sentinela-controlada\n');
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

ok('diretório simbólico literal bloqueia antes de qualquer escrita fora da raiz', () => {
  const pasta = prepararRaizTemporaria();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-fora-'));
  try {
    const workflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const workflowAntes = fs.readFileSync(workflow, 'utf8');
    const testeAntes = fs.readFileSync(teste, 'utf8');
    fs.symlinkSync(fora, path.join(pasta, 'propostas'));
    assert.throws(() => reforco.prepararReforco(ambiente(), pasta), /caminho do relatório/);
    assert.equal(fs.readFileSync(workflow, 'utf8'), workflowAntes);
    assert.equal(fs.readFileSync(teste, 'utf8'), testeAntes);
    assert.equal(fs.existsSync(path.join(fora, 'central', 'reforco-dossie-controlado.md')), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

ok('arquivo-alvo simbólico bloqueia antes de ler ou editar fora da raiz', () => {
  const pasta = prepararRaizTemporaria();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-fora-'));
  try {
    const workflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const externo = path.join(fora, 'dossie-preparo-controlado.yml');
    const workflowAntes = fs.readFileSync(workflow, 'utf8');
    const testeAntes = fs.readFileSync(teste, 'utf8');
    fs.writeFileSync(externo, workflowAntes, 'utf8');
    fs.unlinkSync(workflow);
    fs.symlinkSync(externo, workflow);
    assert.throws(() => reforco.prepararReforco(ambiente(), pasta), /dossie-preparo-controlado\.yml/);
    assert.equal(fs.readFileSync(externo, 'utf8'), workflowAntes);
    assert.equal(fs.readFileSync(teste, 'utf8'), testeAntes);
    assert.equal(fs.existsSync(path.join(pasta, reforco.RECEITA.caminhos[2])), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

ok('arquivo-alvo com vínculo físico bloqueia antes de ler ou editar fora da raiz', () => {
  for (const relativo of reforco.RECEITA.caminhos.slice(0, 2)) {
    const pasta = prepararRaizTemporaria();
    const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-fora-'));
    try {
      const alvo = path.join(pasta, relativo);
      const outroRelativo = reforco.RECEITA.caminhos.find(caminho => caminho !== relativo && caminho !== reforco.RECEITA.caminhos[2]);
      const outro = path.join(pasta, outroRelativo);
      const externo = path.join(fora, path.basename(relativo));
      const antes = fs.readFileSync(alvo, 'utf8');
      const outroAntes = fs.readFileSync(outro, 'utf8');
      fs.writeFileSync(externo, antes, 'utf8');
      fs.unlinkSync(alvo);
      fs.linkSync(externo, alvo);
      assert.equal(fs.lstatSync(alvo).nlink, 2);
      assert.throws(() => reforco.prepararReforco(ambiente(), pasta), /base incompatível para reforço/);
      assert.equal(fs.readFileSync(externo, 'utf8'), antes);
      assert.equal(fs.readFileSync(outro, 'utf8'), outroAntes);
      assert.equal(fs.existsSync(path.join(pasta, reforco.RECEITA.caminhos[2])), false);
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true });
      fs.rmSync(fora, { recursive: true, force: true });
    }
  }
});

ok('vínculo físico introduzido depois da validação não altera arquivo externo', () => {
  const pasta = prepararRaizTemporaria();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-fora-'));
  try {
    const workflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const relatorio = path.join(pasta, reforco.RECEITA.caminhos[2]);
    const externo = path.join(fora, 'workflow-externo.yml');
    const workflowAntes = fs.readFileSync(workflow, 'utf8');
    const testeAntes = fs.readFileSync(teste, 'utf8');
    fs.writeFileSync(externo, workflowAntes, 'utf8');
    let trocado = false;
    const io = Object.assign({}, fs, {
      writeFileSync(arquivo, conteudo, opcoes) {
        fs.writeFileSync(arquivo, conteudo, opcoes);
        if (!trocado && arquivo === relatorio) {
          fs.unlinkSync(workflow);
          fs.linkSync(externo, workflow);
          trocado = true;
        }
      }
    });
    reforco.prepararReforco(ambiente(), pasta, io);
    assert.equal(trocado, true);
    assert.equal(fs.readFileSync(externo, 'utf8'), workflowAntes);
    assert.match(fs.readFileSync(workflow, 'utf8'), /alterados="\$\(git diff --cached --name-only\)"/);
    assert.match(fs.readFileSync(teste, 'utf8'), /alterados="\\\$\\\(git diff --cached --name-only\\\)"/);
    assert.equal(fs.lstatSync(workflow).nlink, 1);
    assert.equal(fs.existsSync(workflow + '.reforco-temporario'), false);
    assert.equal(fs.existsSync(teste + '.reforco-temporario'), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

ok('arquivo substituído depois da leitura bloqueia antes do relatório', () => {
  const pasta = prepararRaizTemporaria();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-fora-'));
  try {
    const workflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const relatorio = path.join(pasta, reforco.RECEITA.caminhos[2]);
    const substituto = path.join(fora, 'workflow-substituto.yml');
    const workflowAntes = fs.readFileSync(workflow, 'utf8');
    const testeAntes = fs.readFileSync(teste, 'utf8');
    const inoAntes = fs.lstatSync(workflow).ino;
    fs.writeFileSync(substituto, workflowAntes, 'utf8');
    let trocado = false;
    const io = Object.assign({}, fs, {
      readFileSync(arquivo, codificacao) {
        const conteudo = fs.readFileSync(arquivo, codificacao);
        if (!trocado && arquivo === teste) {
          fs.unlinkSync(workflow);
          fs.copyFileSync(substituto, workflow);
          trocado = true;
        }
        return conteudo;
      }
    });
    assert.throws(() => reforco.prepararReforco(ambiente(), pasta, io), /dossie-preparo-controlado\.yml/);
    assert.equal(trocado, true);
    assert.notEqual(fs.lstatSync(workflow).ino, inoAntes);
    assert.equal(fs.readFileSync(workflow, 'utf8'), workflowAntes);
    assert.equal(fs.readFileSync(teste, 'utf8'), testeAntes);
    assert.equal(fs.existsSync(relatorio), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

ok('diretório de entrada simbólico bloqueia antes de ler fora da raiz', () => {
  const pasta = prepararRaizTemporaria();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'reforco-dossie-fora-'));
  try {
    const workflow = path.join(pasta, reforco.RECEITA.caminhos[0]);
    const teste = path.join(pasta, reforco.RECEITA.caminhos[1]);
    const workflowAntes = fs.readFileSync(workflow, 'utf8');
    const testeAntes = fs.readFileSync(teste, 'utf8');
    fs.writeFileSync(path.join(fora, 'dossie-preparo-controlado.js'), testeAntes, 'utf8');
    fs.rmSync(path.join(pasta, 'tools', 'testes'), { recursive: true, force: true });
    fs.symlinkSync(fora, path.join(pasta, 'tools', 'testes'));
    assert.throws(() => reforco.prepararReforco(ambiente(), pasta), /caminho do teste/);
    assert.equal(fs.readFileSync(workflow, 'utf8'), workflowAntes);
    assert.equal(fs.readFileSync(path.join(fora, 'dossie-preparo-controlado.js'), 'utf8'), testeAntes);
    assert.equal(fs.existsSync(path.join(pasta, reforco.RECEITA.caminhos[2])), false);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

ok('ferramenta não recebe argumento/caminho livre nem executa transporte, shell ou Git', () => {
  const fonte = ler('tools/reforco-dossie-controlado.js');
  const executavel = fonte.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(executavel, /process\.argv|child_process|exec\s*\(|spawn\s*\(|fetch\s*\(|https?:\/\//i);
  assert.match(fonte, /umaOcorrencia\(workflow, ANCORA_WORKFLOW/);
  assert.match(fonte, /umaOcorrencia\(teste, ANCORA_TESTE/);
  assert.match(fonte, /io\.lstatSync\(alvo\)/);
  assert.match(fonte, /estado\.nlink !== 1/);
  assert.match(fonte, /validarDiretorioLiteral\(io, raiz, path\.dirname\(relWorkflow\), false, 'caminho do workflow'\)/);
  assert.match(fonte, /validarArquivoLiteral\(io, arquivoWorkflow, relWorkflow\)/);
  assert.match(fonte, /validarDiretorioLiteral\(io, raiz, path\.dirname\(relTeste\), false, 'caminho do teste'\)/);
  assert.match(fonte, /validarArquivoLiteral\(io, arquivoTeste, relTeste\)/);
  assert.match(fonte, /validarArquivoLiteralInalterado\(io, arquivoWorkflow, relWorkflow, estadoWorkflow\)/);
  assert.match(fonte, /validarArquivoLiteralInalterado\(io, arquivoTeste, relTeste, estadoTeste\)/);
  assert.match(fonte, /io\.renameSync\(temporario, arquivo\)/);
  assert.match(fonte, /arquivo \+ '\.reforco-temporario'/);
  assert.doesNotMatch(fonte, /io\.writeFileSync\(arquivoWorkflow,/);
  assert.doesNotMatch(fonte, /io\.writeFileSync\(arquivoTeste,/);
  assert.match(fonte, /prepararDestinoRelatorio\(io, raiz, path\.dirname\(relRelatorio\), arquivoRelatorio\)/);
  assert.match(fonte, /flag: 'wx'/);
  const iWorkflowLiteral = fonte.indexOf("validarArquivoLiteral(io, arquivoWorkflow, relWorkflow)");
  const iTesteLiteral = fonte.indexOf("validarArquivoLiteral(io, arquivoTeste, relTeste)");
  const iLeitura = fonte.indexOf("io.readFileSync(arquivoWorkflow, 'utf8')");
  const iRevalidarWorkflow = fonte.indexOf("validarArquivoLiteralInalterado(io, arquivoWorkflow, relWorkflow, estadoWorkflow)");
  const iRevalidarTeste = fonte.indexOf("validarArquivoLiteralInalterado(io, arquivoTeste, relTeste, estadoTeste)");
  const iDestino = fonte.indexOf('prepararDestinoRelatorio(io, raiz, path.dirname(relRelatorio), arquivoRelatorio)');
  const iRelatorio = fonte.indexOf('io.writeFileSync(arquivoRelatorio');
  const iWorkflow = fonte.indexOf('substituirArquivoLiteralAtomico(io, arquivoWorkflow');
  const iTeste = fonte.indexOf('substituirArquivoLiteralAtomico(io, arquivoTeste');
  assert(iWorkflowLiteral >= 0 && iTesteLiteral >= 0 && iWorkflowLiteral < iLeitura && iTesteLiteral < iLeitura, 'alvos literais são validados antes de leitura');
  assert(iRevalidarWorkflow >= 0 && iRevalidarTeste >= 0 && iLeitura < iRevalidarWorkflow && iRevalidarWorkflow < iRevalidarTeste, 'alvos literais são revalidados antes da reserva');
  assert(iDestino >= 0 && iDestino < iRelatorio && iRelatorio < iWorkflow && iWorkflow < iTeste, 'reserva exclusiva vem antes das substituições atômicas');
});

ok('workflow executa preflight, contrato, patch e validação antes do ramo de três caminhos', () => {
  const workflow = ler('.github/workflows/reforco-dossie-controlado.yml');
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m);
  assert.match(workflow, /^permissions:\n  contents: write\s*$/m);
  assert.doesNotMatch(workflow, /^\s*(?:actions|pull-requests):\s*write\s*$/m);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /timeout-minutes: 8/);
  assert.match(workflow, /reforco-dossie-controlado-\$\{\{ github\.ref \}\}/);
  assert.match(workflow, /\[ "\$GITHUB_REF" = 'refs\/heads\/main' \] \|\|/);
  assert.match(workflow, /\[ "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA" \] \|\|/);
  assert.match(workflow, /origem="\$\(git remote get-url origin\)"/);
  assert.match(workflow, /github\.com\/reboclbrank-max\/chat/);
  const iAntes = workflow.indexOf('node tools/preparo-controlado.js');
  const iContrato = workflow.indexOf('node tools/testes/reforco-dossie-controlado.js');
  const iPatch = workflow.indexOf('node tools/reforco-dossie-controlado.js');
  const iTeste = workflow.indexOf('node tools/testes/dossie-preparo-controlado.js');
  const iDepois = workflow.lastIndexOf('node tools/preparo-controlado.js');
  const iRamo = workflow.indexOf('git switch -c "$ramo"');
  const iAdd = workflow.indexOf('git add -- .github/workflows/dossie-preparo-controlado.yml tools/testes/dossie-preparo-controlado.js propostas/central/reforco-dossie-controlado.md');
  const iPush = workflow.indexOf('git push origin "HEAD:refs/heads/$ramo"');
  assert(iAntes >= 0 && iAntes < iContrato && iContrato < iPatch && iPatch < iTeste && iTeste < iDepois && iDepois < iRamo && iRamo < iAdd && iAdd < iPush, 'ordem segura preflight → contrato → patch → teste → preflight → ramo');
  assert.match(workflow, /ramo="central\/reforco-dossie-\$\{GITHUB_RUN_ID\}"/);
  assert.match(workflow, /git diff --cached --check/);
  assert.match(workflow, /alterados="\$\(git diff --cached --name-only\)"/);
  assert.match(workflow, /esperados="\$\(printf '%s\\n' \.github\/workflows\/dossie-preparo-controlado\.yml propostas\/central\/reforco-dossie-controlado\.md tools\/testes\/dossie-preparo-controlado\.js\)"/);
  assert.match(workflow, /git diff --cached --quiet/);
  assert.match(workflow, /git commit -m "fix\(central\): reforça escopo do dossiê"/);
  assert.doesNotMatch(workflow, /--force|git push[^\n]*HEAD:main|git push[^\n]*refs\/heads\/main|git merge|gh pr\b|pull_request|git tag\b|gh release\b/i);
  assert.doesNotMatch(workflow, /\$\{\{\s*inputs\.|secrets\.|curl\s|wget\s|npm install/i);
});

console.log(`${certos}/${certos + falhas} testes do reforço controlado do dossiê passaram`);
process.exitCode = falhas ? 1 : 0;
