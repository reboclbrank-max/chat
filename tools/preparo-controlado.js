#!/usr/bin/env node
// Oficina de preparo do Chat: executa apenas a auditoria interna fixa.
// Não recebe código, URL, ref, repositório ou tarefa livre; não cria branch ou escreve Git.
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const CHECAGENS = Object.freeze([
  Object.freeze({ id: 'central', rotulo: 'Contrato da Central', arquivo: 'tools/testes/central-operacional.js' }),
  Object.freeze({ id: 'comandos', rotulo: 'Portas locais da interface', arquivo: 'tools/testes/comandos-locais-interface.js' }),
  Object.freeze({ id: 'pwa', rotulo: 'Atualização PWA segura', arquivo: 'tools/testes/pwa-atualizacao-segura.js' }),
  Object.freeze({ id: 'continuidade', rotulo: 'Continuidade e limites', arquivo: 'tools/testes/continuidade.js' }),
  Object.freeze({ id: 'workflows', rotulo: 'Guardas dos workflows', arquivo: 'tools/testes/auditoria-workflows.js' })
]);

function validarArgumentos(argv) {
  const itens = Array.isArray(argv) ? argv : [];
  if (!itens.length) return { ok: true };
  return { ok: false, mensagem: 'uso: node tools/preparo-controlado.js (sem argumento)' };
}

function executarPreparo(opcoes = {}) {
  const raiz = opcoes.raiz || path.resolve(__dirname, '..');
  const executar = opcoes.executar || spawnSync;
  const resultados = [];
  for (const checagem of CHECAGENS) {
    let retorno;
    try {
      retorno = executar(process.execPath, [path.join(raiz, checagem.arquivo)], {
        cwd: raiz,
        encoding: 'utf8',
        timeout: 120000,
        shell: false
      });
    } catch (_) {
      retorno = null;
    }
    const resultado = Object.freeze({ id: checagem.id, rotulo: checagem.rotulo, passou: !!retorno && retorno.status === 0 && !retorno.error });
    resultados.push(resultado);
    // Falhar fecha a receita: não há promoção e não se consome trabalho das
    // guardas seguintes como se a base ainda estivesse pronta para revisão.
    if (!resultado.passou) break;
  }
  const pronto = resultados.length === CHECAGENS.length && resultados.every((resultado) => resultado.passou);
  return Object.freeze({
    receita: 'auditoria-interna-fixa',
    estado: pronto ? 'pronto_para_revisao' : 'bloqueado',
    resultados: Object.freeze(resultados),
    proximoPasso: pronto
      ? 'Revisão humana pode escolher uma receita futura; nenhum código foi preparado ou promovido.'
      : 'Não preparar mudança, branch ou promoção; corrigir primeiro a guarda que bloqueou.'
  });
}

function resumoMarkdown(resultado) {
  const linhas = [
    '# 🧩 Preparo controlado do Chat',
    '',
    '- Receita: auditoria interna fixa.',
    '- Estado: **' + resultado.estado + '**.',
    '- Escopo: somente testes fechados; sem branch, commit, push, merge, segredo, conta ou publicação.',
    '',
    '| Checagem | Resultado |',
    '|---|---|'
  ];
  for (const item of resultado.resultados) linhas.push('| ' + item.rotulo + ' | ' + (item.passou ? 'passou' : 'bloqueou') + ' |');
  linhas.push('', '> ' + resultado.proximoPasso, '');
  return linhas.join('\n');
}

function principal(argv = process.argv.slice(2)) {
  const argumentos = validarArgumentos(argv);
  if (!argumentos.ok) {
    process.stderr.write(argumentos.mensagem + '\n');
    return 2;
  }
  const resultado = executarPreparo();
  process.stdout.write(resumoMarkdown(resultado));
  return resultado.estado === 'pronto_para_revisao' ? 0 : 1;
}

if (require.main === module) process.exitCode = principal();
module.exports = Object.freeze({ CHECAGENS, validarArgumentos, executarPreparo, resumoMarkdown, principal });
