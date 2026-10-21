#!/usr/bin/env node
// Gera exclusivamente o artefato sanitizado da receita 2B da Central.
// Não lê conversa, argumento, segredo, URL, Git ou conteúdo arbitrário.
'use strict';

const fs = require('fs');
const path = require('path');

const CAMINHO_DOSSIE = path.join('propostas', 'central', 'dossie-preparo-controlado.md');
const REF_PERMITIDA = 'refs/heads/main';

function contextoSeguro(ambiente = process.env) {
  const sha = String(ambiente.GITHUB_SHA || '').trim();
  const runId = String(ambiente.GITHUB_RUN_ID || '').trim();
  const ref = String(ambiente.GITHUB_REF || '').trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('contexto do dossiê inválido: SHA');
  if (!/^[1-9][0-9]{0,19}$/.test(runId)) throw new Error('contexto do dossiê inválido: execução');
  if (ref !== REF_PERMITIDA) throw new Error('contexto do dossiê inválido: ref');
  return Object.freeze({ sha, runId, ref });
}

function textoDossie(contexto) {
  const seguro = contextoSeguro({
    GITHUB_SHA: contexto && contexto.sha,
    GITHUB_RUN_ID: contexto && contexto.runId,
    GITHUB_REF: contexto && contexto.ref
  });
  return [
    '# Dossiê de revisão controlada da Central',
    '',
    '> Artefato automático, sanitizado e deliberadamente estreito. Não é código pronto, não é uma PR e não autoriza promoção.',
    '',
    '## Origem verificável',
    '',
    `- Commit de partida: \`${seguro.sha}\`.`,
    `- Execução do workflow: \`${seguro.runId}\`.`,
    `- Ref validada: \`${seguro.ref}\`.`,
    '- Pré-condição: as cinco guardas literais de `preparo-controlado.js` passaram antes deste arquivo ser criado.',
    '',
    '## Escopo fechado desta receita',
    '',
    '- O único arquivo criado é este dossiê no caminho `propostas/central/dossie-preparo-controlado.md`.',
    '- O único destino remoto permitido é um ramo novo com prefixo `central/dossie-preparo-` e identificador numérico da execução.',
    '- Não há texto de conversa, comando livre, URL, repositório, caminho, ref, segredo, conta, anexo ou resultado bruto neste artefato.',
    '- Não há alteração de código, dependência, permissão, infraestrutura, dado, configuração, `main`, tag, release ou pull request.',
    '',
    '## Revisão humana obrigatória',
    '',
    '1. Compare o ramo com `main` e confirme que contém apenas este arquivo.',
    '2. Decida manualmente se existe uma receita futura, distinta e pequena que mereça desenho próprio.',
    '3. Não promova, faça merge nem reutilize este dossiê como autorização para escrever código.',
    '',
    '## Rollback',
    '',
    '- O rollback é apagar manualmente o ramo `central/dossie-preparo-<execução>` depois da revisão.',
    '- Como `main` não é alterada e não há PR, conta, segredo, dependência ou infraestrutura, não existe migração ou estado produtivo para reverter.',
    '',
    '## Limite',
    '',
    'Este dossiê registra somente uma proposta de revisão; êxito do workflow não prova qualidade, disponibilidade, entrega, uso, satisfação ou SLA.',
    ''
  ].join('\n');
}

function gerarDossie(ambiente = process.env, io = fs) {
  const contexto = contextoSeguro(ambiente);
  const texto = textoDossie(contexto);
  io.mkdirSync(path.dirname(CAMINHO_DOSSIE), { recursive: true });
  io.writeFileSync(CAMINHO_DOSSIE, texto, { encoding: 'utf8', mode: 0o644 });
  return Object.freeze({ caminho: CAMINHO_DOSSIE, contexto, texto });
}

if (require.main === module) {
  try {
    const resultado = gerarDossie();
    console.log(`dossie_controlado: criado ${resultado.caminho}`);
  } catch (erro) {
    console.error('dossie_controlado: bloqueado por contexto inválido');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({ CAMINHO_DOSSIE, REF_PERMITIDA, contextoSeguro, textoDossie, gerarDossie });
