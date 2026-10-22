#!/usr/bin/env node
// Receita 3A de código: endurece somente o escopo staged do dossiê 2B.
// Não lê conversa, argumento, URL, segredo ou caminho fornecido externamente; não executa Git.
'use strict';

const fs = require('fs');
const path = require('path');

const RECEITA = Object.freeze({
  id: 'reforco_dossie_escopo_v1',
  repositorio: 'reboclbrank-max/chat',
  ref: 'refs/heads/main',
  prefixoRamo: 'central/reforco-dossie-',
  caminhos: Object.freeze([
    '.github/workflows/dossie-preparo-controlado.yml',
    'tools/testes/dossie-preparo-controlado.js',
    'propostas/central/reforco-dossie-controlado.md'
  ])
});

const ANCORA_WORKFLOW = [
  '          git add -- propostas/central/dossie-preparo-controlado.md',
  "          if git diff --cached --quiet; then echo 'dossiê ausente'; exit 1; fi"
].join('\n');
const TROCA_WORKFLOW = [
  '          git add -- propostas/central/dossie-preparo-controlado.md',
  '          alterados="$(git diff --cached --name-only)"',
  "          [ \"$alterados\" = 'propostas/central/dossie-preparo-controlado.md' ] || { echo 'escopo staged inesperado'; exit 1; }",
  "          if git diff --cached --quiet; then echo 'dossiê ausente'; exit 1; fi"
].join('\n');
const ANCORA_TESTE = [
  "  const iAdd = workflow.indexOf('git add -- propostas/central/dossie-preparo-controlado.md');",
  "  const iPush = workflow.indexOf('git push origin \"HEAD:refs/heads/$ramo\"');"
].join('\n');
const TROCA_TESTE = [
  "  const iAdd = workflow.indexOf('git add -- propostas/central/dossie-preparo-controlado.md');",
  '  assert.match(workflow, /alterados="\\$\\(git diff --cached --name-only\\)"/);',
  "  assert.match(workflow, /\\[ \"\\$alterados\" = 'propostas\\/central\\/dossie-preparo-controlado\\.md' \\] \\|\\|/);",
  "  const iPush = workflow.indexOf('git push origin \"HEAD:refs/heads/$ramo\"');"
].join('\n');

function contextoSeguro(ambiente = process.env) {
  const sha = String(ambiente.GITHUB_SHA || '').trim();
  const runId = String(ambiente.GITHUB_RUN_ID || '').trim();
  const ref = String(ambiente.GITHUB_REF || '').trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('contexto do reforço inválido: SHA');
  if (!/^[1-9][0-9]{0,19}$/.test(runId)) throw new Error('contexto do reforço inválido: execução');
  if (ref !== RECEITA.ref) throw new Error('contexto do reforço inválido: ref');
  return Object.freeze({ sha, runId, ref });
}

function dentroDaRaiz(raiz, relativo) {
  const base = path.resolve(raiz);
  const destino = path.resolve(base, relativo);
  if (!destino.startsWith(base + path.sep)) throw new Error('caminho da receita inválido');
  return destino;
}

function umaOcorrencia(texto, ancora, nome) {
  const primeira = texto.indexOf(ancora);
  if (primeira < 0 || texto.indexOf(ancora, primeira + ancora.length) >= 0) {
    throw new Error('base incompatível para reforço: ' + nome);
  }
  return primeira;
}

function lstatOuAusente(io, alvo, nome) {
  try {
    return io.lstatSync(alvo);
  } catch (erro) {
    if (erro && erro.code === 'ENOENT') return null;
    throw new Error('base incompatível para reforço: ' + nome);
  }
}

function validarDiretorioLiteral(io, raiz, relativo, criar, nome) {
  let atual = path.resolve(raiz);
  for (const parte of relativo.split(/[\\/]+/)) {
    if (!parte || parte === '.' || parte === '..') {
      throw new Error('base incompatível para reforço: ' + nome);
    }
    atual = path.join(atual, parte);
    let estado = lstatOuAusente(io, atual, nome);
    if (!estado && criar) {
      try {
        io.mkdirSync(atual);
      } catch (_) {
        throw new Error('base incompatível para reforço: ' + nome);
      }
      estado = lstatOuAusente(io, atual, nome);
    }
    if (!estado || !estado.isDirectory() || estado.isSymbolicLink()) {
      throw new Error('base incompatível para reforço: ' + nome);
    }
  }
}

function validarArquivoLiteral(io, arquivo, nome) {
  const estado = lstatOuAusente(io, arquivo, nome);
  if (!estado || !estado.isFile() || estado.isSymbolicLink() || estado.nlink !== 1) {
    throw new Error('base incompatível para reforço: ' + nome);
  }
  return estado;
}

function validarArquivoLiteralInalterado(io, arquivo, nome, anterior) {
  const atual = validarArquivoLiteral(io, arquivo, nome);
  if (!anterior || atual.dev !== anterior.dev || atual.ino !== anterior.ino) {
    throw new Error('base incompatível para reforço: ' + nome);
  }
  return atual;
}

function substituirArquivoLiteralAtomico(io, arquivo, conteudo, nome, modo) {
  const temporario = arquivo + '.reforco-temporario';
  let criado = false;
  try {
    io.writeFileSync(temporario, conteudo, { encoding: 'utf8', mode: modo & 0o777, flag: 'wx' });
    criado = true;
    // rename substitui a entrada de diretório, sem escrever no inode caso surja um vínculo físico depois da validação.
    io.renameSync(temporario, arquivo);
  } catch (_) {
    if (criado) {
      try { io.unlinkSync(temporario); } catch (_) {}
    }
    throw new Error('base incompatível para reforço: ' + nome);
  }
}

function prepararDestinoRelatorio(io, raiz, relativo, arquivoRelatorio) {
  validarDiretorioLiteral(io, raiz, relativo, true, 'caminho do relatório');
  if (lstatOuAusente(io, arquivoRelatorio, 'caminho do relatório')) {
    throw new Error('base incompatível para reforço: relatório já existe');
  }
}

function textoRelatorio(contexto) {
  const seguro = contextoSeguro({
    GITHUB_SHA: contexto && contexto.sha,
    GITHUB_RUN_ID: contexto && contexto.runId,
    GITHUB_REF: contexto && contexto.ref
  });
  return [
    '# Reforço revisável do escopo do dossiê',
    '',
    '> Patch literal da receita `reforco_dossie_escopo_v1`. Não é promoção, PR ou autorização para outra mudança.',
    '',
    '## Origem verificável',
    '',
    `- Commit de partida: \`${seguro.sha}\`.`,
    `- Execução: \`${seguro.runId}\`.`,
    `- Ref validada: \`${seguro.ref}\`.`,
    '',
    '## Alteração exata',
    '',
    '- Em `.github/workflows/dossie-preparo-controlado.yml`, o push do dossiê passa a exigir que o índice staged contenha somente `propostas/central/dossie-preparo-controlado.md`.',
    '- Em `tools/testes/dossie-preparo-controlado.js`, entra a regressão estática que exige essa guarda.',
    '- Nenhum outro caminho, código de produto, dependência, permissão, segredo, conta, infraestrutura ou ação pública é alterado.',
    '',
    '## Revisão humana e rollback',
    '',
    '1. Compare o ramo com `main` e confirme os três caminhos permitidos desta receita.',
    '2. Rode as validações registradas no resumo do workflow antes de qualquer decisão de merge.',
    '3. Para reverter a proposta, apague manualmente o ramo `central/reforco-dossie-<execução>`; `main` não foi tocada.',
    '',
    '## Limite',
    '',
    'Esta execução prepara exclusivamente um endurecimento do escopo staged do dossiê. Êxito técnico não prova uso, entrega, disponibilidade, satisfação ou SLA.',
    ''
  ].join('\n');
}

function prepararReforco(ambiente = process.env, raiz = process.cwd(), io = fs) {
  const contexto = contextoSeguro(ambiente);
  const [relWorkflow, relTeste, relRelatorio] = RECEITA.caminhos;
  const arquivoWorkflow = dentroDaRaiz(raiz, relWorkflow);
  const arquivoTeste = dentroDaRaiz(raiz, relTeste);
  const arquivoRelatorio = dentroDaRaiz(raiz, relRelatorio);
  validarDiretorioLiteral(io, raiz, path.dirname(relWorkflow), false, 'caminho do workflow');
  const estadoWorkflow = validarArquivoLiteral(io, arquivoWorkflow, relWorkflow);
  validarDiretorioLiteral(io, raiz, path.dirname(relTeste), false, 'caminho do teste');
  const estadoTeste = validarArquivoLiteral(io, arquivoTeste, relTeste);
  const workflow = io.readFileSync(arquivoWorkflow, 'utf8');
  const teste = io.readFileSync(arquivoTeste, 'utf8');
  umaOcorrencia(workflow, ANCORA_WORKFLOW, relWorkflow);
  umaOcorrencia(teste, ANCORA_TESTE, relTeste);
  const novoWorkflow = workflow.replace(ANCORA_WORKFLOW, TROCA_WORKFLOW);
  const novoTeste = teste.replace(ANCORA_TESTE, TROCA_TESTE);
  const relatorio = textoRelatorio(contexto);
  if (!novoWorkflow.includes(TROCA_WORKFLOW) || !novoTeste.includes(TROCA_TESTE)) {
    throw new Error('patch literal não pôde ser confirmado');
  }
  validarArquivoLiteralInalterado(io, arquivoWorkflow, relWorkflow, estadoWorkflow);
  validarArquivoLiteralInalterado(io, arquivoTeste, relTeste, estadoTeste);
  prepararDestinoRelatorio(io, raiz, path.dirname(relRelatorio), arquivoRelatorio);
  // Reserva primeiro o único caminho novo: O_EXCL/`wx` impede sobrescrever
  // um relatório que apareça depois da verificação, antes dos dois edits literais.
  io.writeFileSync(arquivoRelatorio, relatorio, { encoding: 'utf8', mode: 0o644, flag: 'wx' });
  substituirArquivoLiteralAtomico(io, arquivoWorkflow, novoWorkflow, relWorkflow, estadoWorkflow.mode);
  substituirArquivoLiteralAtomico(io, arquivoTeste, novoTeste, relTeste, estadoTeste.mode);
  return Object.freeze({ contexto, caminhos: RECEITA.caminhos, relatorio });
}

if (require.main === module) {
  try {
    const resultado = prepararReforco();
    console.log(`reforco_dossie_controlado: preparado ${resultado.caminhos.length} caminhos permitidos`);
  } catch (_) {
    console.error('reforco_dossie_controlado: bloqueado por contexto/base inválidos');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  RECEITA, ANCORA_WORKFLOW, TROCA_WORKFLOW, ANCORA_TESTE, TROCA_TESTE,
  contextoSeguro, textoRelatorio, prepararReforco
});
