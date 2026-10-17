// 🗺️ Geografia brasileira local: respostas determinísticas sobre divisas estaduais, sem rede nem motor.
// Fonte de dados revisada em 2026-10-17 para o Chat; Distrito Federal não entra na contagem de "outros estados".
'use strict';

const NOMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

// Só fronteiras terrestres entre unidades federativas brasileiras. A simetria é validada no teste offline.
const DIVISAS = {
  AC: ['AM', 'RO'],
  AL: ['BA', 'PE', 'SE'],
  AP: ['PA'],
  AM: ['AC', 'MT', 'PA', 'RO', 'RR'],
  BA: ['AL', 'ES', 'GO', 'MG', 'PE', 'PI', 'SE', 'TO'],
  CE: ['PB', 'PE', 'PI', 'RN'],
  DF: ['GO', 'MG'],
  ES: ['BA', 'MG', 'RJ'],
  GO: ['BA', 'DF', 'MG', 'MS', 'MT', 'TO'],
  MA: ['PA', 'PI', 'TO'],
  MT: ['AM', 'GO', 'MS', 'PA', 'RO', 'TO'],
  MS: ['GO', 'MG', 'MT', 'PR', 'SP'],
  MG: ['BA', 'DF', 'ES', 'GO', 'MS', 'RJ', 'SP'],
  PA: ['AM', 'AP', 'MA', 'MT', 'RR', 'TO'],
  PB: ['CE', 'PE', 'RN'],
  PR: ['MS', 'SC', 'SP'],
  PE: ['AL', 'BA', 'CE', 'PB', 'PI'],
  PI: ['BA', 'CE', 'MA', 'PE', 'TO'],
  RJ: ['ES', 'MG', 'SP'],
  RN: ['CE', 'PB'],
  RS: ['SC'],
  RO: ['AC', 'AM', 'MT'],
  RR: ['AM', 'PA'],
  SC: ['PR', 'RS'],
  SP: ['MG', 'MS', 'PR', 'RJ'],
  SE: ['AL', 'BA'],
  TO: ['BA', 'GO', 'MA', 'MT', 'PA', 'PI']
};

const normaliza = texto => String(texto || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function estadoPorNome(entrada) {
  const limpo = normaliza(entrada);
  if (!limpo) return null;
  for (const [sigla, nome] of Object.entries(NOMES)) {
    if (limpo === sigla.toLowerCase() || limpo === normaliza(nome)) return sigla;
  }
  return null;
}

function estadoMencionado(texto) {
  const limpo = normaliza(texto);
  const todos = Object.entries(NOMES).sort((a, b) => b[1].length - a[1].length);
  for (const [sigla, nome] of todos) {
    const alvo = normaliza(nome);
    if (new RegExp('(^| )' + alvo.replace(/ /g, '\\s+') + '( |$)').test(limpo)) return sigla;
  }
  const siglas = limpo.match(/\b(ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to)\b/);
  return siglas ? siglas[1].toUpperCase() : null;
}

function nomesDivisas(sigla, incluirDF = true) {
  const lista = (DIVISAS[sigla] || []).filter(x => incluirDF || x !== 'DF');
  return lista.map(x => NOMES[x]);
}

function maiorNumeroDeDivisas() {
  const estados = Object.keys(NOMES).filter(x => x !== 'DF');
  const maximo = Math.max(...estados.map(x => nomesDivisas(x, false).length));
  const vencedores = estados.filter(x => nomesDivisas(x, false).length === maximo);
  return { maximo, estados: vencedores, estado: vencedores[0] || null };
}

function responde(texto) {
  const bruto = String(texto || '').trim();
  const limpo = normaliza(bruto);
  if (!/(divisa|divisas|fronteira|fronteiras)/.test(limpo)) return null;
  const maior = /(maior|mais).{0,45}(numero|quantidade|estado|divisa|fronteira)|(numero|quantidade).{0,45}(maior|mais)/.test(limpo);
  if (maior) {
    const r = maiorNumeroDeDivisas();
    const nomes = r.estados.map(x => NOMES[x]).join(', ');
    return '🗺️ ' + nomes + ' é o estado brasileiro com mais divisas: ' + r.maximo + ' outros estados. A Bahia faz divisa com ' + nomesDivisas('BA', false).join(', ') + '.';
  }
  const sigla = estadoPorNome(bruto) || estadoMencionado(bruto);
  if (!sigla || !DIVISAS[sigla]) return null;
  const vizinhos = nomesDivisas(sigla, true);
  return '🗺️ ' + NOMES[sigla] + ' faz divisa com ' + vizinhos.length + ' unidade(s): ' + vizinhos.join(', ') + '.';
}

function validaMapa() {
  const problemas = [];
  for (const [sigla, vizinhos] of Object.entries(DIVISAS)) {
    if (!NOMES[sigla]) problemas.push('estado sem nome: ' + sigla);
    for (const vizinho of vizinhos) {
      if (!NOMES[vizinho]) problemas.push('vizinho desconhecido: ' + sigla + '→' + vizinho);
      else if (!(DIVISAS[vizinho] || []).includes(sigla)) problemas.push('divisa assimétrica: ' + sigla + '↔' + vizinho);
    }
  }
  const maior = maiorNumeroDeDivisas();
  if (maior.maximo !== 8 || maior.estado !== 'BA') problemas.push('maior número de divisas deveria ser Bahia com 8');
  return problemas;
}

module.exports = { NOMES, DIVISAS, normaliza, estadoPorNome, estadoMencionado, nomesDivisas, maiorNumeroDeDivisas, responde, validaMapa };
