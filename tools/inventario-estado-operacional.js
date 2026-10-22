#!/usr/bin/env node
'use strict';
/*
 * Inventário local e sem conteúdo do ramo operacional.
 *
 * Não aceita argumentos, não usa rede, não consulta serviço remoto, não escreve no repositório
 * e não lista nomes de arquivos. Serve apenas para embasar uma decisão humana de
 * retenção sem abrir logs, provas ou estado sanitizado.
 */
const child = require('child_process');

const CANDIDATAS = Object.freeze([
  'refs/remotes/origin/estado/operacional',
  'refs/heads/estado/operacional',
  'estado/operacional'
]);
const BASES_CANDIDATAS = Object.freeze([
  'refs/remotes/origin/main',
  'refs/heads/main',
  'main'
]);
const FIXOS = Object.freeze({
  'email-log.md': 'log_email',
  'vigia-estado.json': 'fotografia_vigia',
  'saude-cerebro.md': 'indicador_operacional',
  'qualidade-historico.json': 'indicador_operacional',
  'capacidade-estado.json': 'indicador_operacional',
  'CAPACIDADE.md': 'indicador_operacional'
});
const PROVA_AUTORIZADA = /^(?:provas\/(?:ferramentas|teste-email-final|teste-email-r3|avaliacao-profunda|teste-memoria|teste-foto|teste-voz|teste-anexos)-\d{4}-\d\d-\d\d-\d{4}\.md|provas\/teste-navegador-pareado-\d{4}-\d\d-\d\d-\d\d-\d\d\.md|provas\/voz-resposta-v[12]\.mp3)$/;

function falha(mensagem) {
  throw new Error('inventário operacional: ' + mensagem);
}
function git(args, podeFalhar = false) {
  const resultado = child.spawnSync('git', args, {
    cwd: process.cwd(), encoding: null, maxBuffer: 16 * 1024 * 1024
  });
  if (resultado.error) falha('Git indisponível');
  if (resultado.status !== 0 && !podeFalhar) falha('não consegui ler a árvore local');
  return resultado;
}
function refLocal(candidatas, nome) {
  for (const candidata of candidatas) {
    const resultado = git(['rev-parse', '--verify', '--quiet', candidata + '^{commit}'], true);
    if (resultado.status === 0) return candidata;
  }
  falha('ramo ' + nome + ' indisponível localmente; não consulto rede como alternativa');
}
function refDeEstado() { return refLocal(CANDIDATAS, 'estado/operacional'); }
function refDeBase() { return refLocal(BASES_CANDIDATAS, 'main'); }
function caminhoSeguro(caminho) {
  return typeof caminho === 'string' && caminho && !caminho.includes('\\') && !caminho.includes('\0') &&
    !caminho.startsWith('/') && !caminho.split('/').includes('..');
}
function categoria(caminho, modo, tipo) {
  if (!caminhoSeguro(caminho) || tipo !== 'blob' || !/^100(?:644|755)$/.test(modo)) return 'fora_da_allowlist';
  if (Object.prototype.hasOwnProperty.call(FIXOS, caminho)) return FIXOS[caminho];
  return PROVA_AUTORIZADA.test(caminho) ? 'prova_autorizada' : 'fora_da_allowlist';
}
function adiciona(grupos, nome, bytes) {
  if (!Object.prototype.hasOwnProperty.call(grupos, nome)) grupos[nome] = { arquivos: 0, bytes: 0 };
  grupos[nome].arquivos += 1;
  grupos[nome].bytes += bytes;
}
function arvore(ref) {
  const resultado = git(['ls-tree', '-rlz', ref]);
  const itens = new Map();
  for (const entrada of resultado.stdout.toString('utf8').split('\0')) {
    if (!entrada) continue;
    const partes = /^(\d+)\s+(\w+)\s+([0-9a-f]{40,64})\s+(\d+)\t([\s\S]*)$/.exec(entrada);
    if (!partes) falha('árvore local com formato inesperado');
    const bytes = Number(partes[4]);
    if (!Number.isSafeInteger(bytes) || bytes < 0) falha('metadado de tamanho inválido');
    itens.set(partes[5], { modo: partes[1], tipo: partes[2], objeto: partes[3], bytes });
  }
  return itens;
}
function mesmaEntrada(a, b) {
  return Boolean(a && b && a.modo === b.modo && a.tipo === b.tipo && a.objeto === b.objeto && a.bytes === b.bytes);
}
function inventario() {
  if (process.argv.length > 2) falha('não aceita argumentos');
  const estado = arvore(refDeEstado());
  const base = arvore(refDeBase());
  const grupos = {};
  let arquivos = 0;
  let bytes = 0;
  // A fotografia nasce de main; inventariar só o delta evita classificar todo o
  // produto copiado como evidência operacional e ainda mantém adições inesperadas visíveis.
  for (const [caminho, item] of estado) {
    if (mesmaEntrada(item, base.get(caminho))) continue;
    adiciona(grupos, categoria(caminho, item.modo, item.tipo), item.bytes);
    arquivos += 1;
    bytes += item.bytes;
  }
  for (const [caminho, item] of base) {
    if (estado.has(caminho)) continue;
    adiciona(grupos, 'remocao_detectada', item.bytes);
    arquivos += 1;
    bytes += item.bytes;
  }
  return {
    formato: 'inventario-estado-operacional-v1',
    origem: 'metadados-git-locais',
    ramo: 'estado/operacional',
    comparado_com: 'main-local',
    arquivos,
    bytes,
    categorias: grupos
  };
}

if (require.main === module) {
  try {
    process.stdout.write(JSON.stringify(inventario()) + '\n');
  } catch (_) {
    // Não propague stderr de Git ou caminhos locais: o inventário não é canal de diagnóstico bruto.
    console.error('inventário operacional indisponível; nenhuma leitura de conteúdo foi feita');
    process.exitCode = 1;
  }
}

module.exports = { CANDIDATAS, BASES_CANDIDATAS, categoria, inventario };
