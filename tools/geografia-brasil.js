// 🗺️ Geografia brasileira local: divisas, capitais e Grandes Regiões, sem rede nem motor.
// Dados de UF/capitais/regiões conferidos em 2026-10-17 no IBGE Educa:
// https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html
'use strict';

const NOMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

const CAPITAIS = {
  AC: 'Rio Branco', AL: 'Maceió', AP: 'Macapá', AM: 'Manaus', BA: 'Salvador', CE: 'Fortaleza', DF: 'Brasília',
  ES: 'Vitória', GO: 'Goiânia', MA: 'São Luís', MT: 'Cuiabá', MS: 'Campo Grande', MG: 'Belo Horizonte',
  PA: 'Belém', PB: 'João Pessoa', PR: 'Curitiba', PE: 'Recife', PI: 'Teresina', RJ: 'Rio de Janeiro', RN: 'Natal',
  RS: 'Porto Alegre', RO: 'Porto Velho', RR: 'Boa Vista', SC: 'Florianópolis', SP: 'São Paulo', SE: 'Aracaju', TO: 'Palmas'
};

const REGIOES = {
  AC: 'Norte', AL: 'Nordeste', AP: 'Norte', AM: 'Norte', BA: 'Nordeste', CE: 'Nordeste', DF: 'Centro-Oeste',
  ES: 'Sudeste', GO: 'Centro-Oeste', MA: 'Nordeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste', MG: 'Sudeste',
  PA: 'Norte', PB: 'Nordeste', PR: 'Sul', PE: 'Nordeste', PI: 'Nordeste', RJ: 'Sudeste', RN: 'Nordeste',
  RS: 'Sul', RO: 'Norte', RR: 'Norte', SC: 'Sul', SP: 'Sudeste', SE: 'Nordeste', TO: 'Norte'
};
const ORDEM_REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

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
const escapaRegex = texto => String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
const contem = (texto, termo) => new RegExp('(^| )' + escapaRegex(normaliza(termo)) + '( |$)').test(normaliza(texto));

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
  for (const [sigla, nome] of todos) if (contem(limpo, nome)) return sigla;
  const siglas = limpo.match(/\b(ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to)\b/);
  return siglas ? siglas[1].toUpperCase() : null;
}

function capitalPorNome(entrada) {
  const limpo = normaliza(entrada);
  if (!limpo) return null;
  for (const [sigla, capital] of Object.entries(CAPITAIS)) if (limpo === normaliza(capital)) return sigla;
  return null;
}

function capitalMencionada(texto) {
  const limpo = normaliza(texto);
  const todas = Object.entries(CAPITAIS).sort((a, b) => b[1].length - a[1].length);
  for (const [sigla, capital] of todas) if (contem(limpo, capital)) return sigla;
  return null;
}

function regiaoMencionada(texto) {
  const limpo = normaliza(texto);
  for (const regiao of ORDEM_REGIOES) if (contem(limpo, regiao)) return regiao;
  return null;
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

function dadosUF(sigla) {
  if (!NOMES[sigla]) return null;
  return { sigla, nome: NOMES[sigla], capital: CAPITAIS[sigla], regiao: REGIOES[sigla], divisas: nomesDivisas(sigla, true) };
}

function respostaDivisas(limpo, bruto) {
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

function respostaCapital(limpo, bruto) {
  const pedidoCapital = /\b(capital|capitais)\b/.test(limpo);
  if (!pedidoCapital) return null;
  if (/\bbrasil\b/.test(limpo) && !estadoMencionado(bruto)) return '🏛️ A capital do Brasil é Brasília, no Distrito Federal.';
  const estado = estadoPorNome(bruto) || estadoMencionado(bruto);
  if (estado) {
    if (estado === 'DF') return '🏛️ Brasília é a capital federal e a sede do Distrito Federal.';
    return '🏛️ A capital de ' + NOMES[estado] + ' (' + estado + ') é ' + CAPITAIS[estado] + '.';
  }
  const porCapital = capitalPorNome(bruto) || capitalMencionada(bruto);
  if (porCapital) return '🏛️ ' + CAPITAIS[porCapital] + ' é a capital de ' + NOMES[porCapital] + ' (' + porCapital + ').';
  return null;
}

function respostaRegiao(limpo, bruto) {
  const comando = /^(regiao|regioes)\b/.test(limpo);
  const pedido = comando || /\b(regiao|regioes)\b/.test(limpo) || /\bonde fica\b/.test(limpo);
  if (!pedido) return null;
  const estado = estadoPorNome(bruto) || estadoMencionado(bruto);
  if (estado) return '🗺️ ' + NOMES[estado] + ' (' + estado + ') fica na Região ' + REGIOES[estado] + '; sua capital é ' + CAPITAIS[estado] + '.';
  if (!comando) return null;
  const regiao = regiaoMencionada(bruto);
  if (!regiao) return null;
  const ufs = Object.keys(NOMES).filter(x => REGIOES[x] === regiao);
  return '🗺️ Região ' + regiao + ': ' + ufs.length + ' unidade(s) — ' + ufs.map(x => NOMES[x] + ' (' + CAPITAIS[x] + ')').join(', ') + '.';
}

function respostaUF(limpo, bruto) {
  if (!/^(uf|estado)\b/.test(limpo)) return null;
  const sigla = estadoPorNome(bruto) || estadoMencionado(bruto) || capitalPorNome(bruto) || capitalMencionada(bruto);
  if (!sigla) return null;
  const d = dadosUF(sigla);
  const capital = sigla === 'DF' ? 'sede/capital federal: Brasília' : 'capital: ' + d.capital;
  return '🗺️ ' + d.nome + ' (' + d.sigla + ') — Região ' + d.regiao + '; ' + capital + '; divisas: ' + d.divisas.length + '.';
}

function responde(texto) {
  const bruto = String(texto || '').trim();
  // Um comando explícito de outra ferramenta deve chegar à sua própria rota. Sem esta guarda,
  // `pesquisa: capital de Sergipe` seria respondido localmente e perderia as fontes pedidas.
  const comando = bruto.match(/^\s*([^:\s]+)\s*:/);
  if (comando && !/^(divisas?|fronteiras?|capital|capitais|regi[aã]o|regi[oõ]es|uf|estado)$/i.test(comando[1])) return null;
  const limpo = normaliza(bruto);
  if (!limpo) return null;
  return respostaDivisas(limpo, bruto) || respostaCapital(limpo, bruto) || respostaRegiao(limpo, bruto) || respostaUF(limpo, bruto);
}

function validaMapa() {
  const problemas = [];
  const ufs = Object.keys(NOMES);
  if (ufs.length !== 27) problemas.push('Brasil deveria ter 27 UFs');
  for (const [sigla, vizinhos] of Object.entries(DIVISAS)) {
    if (!NOMES[sigla]) problemas.push('estado sem nome: ' + sigla);
    if (!CAPITAIS[sigla]) problemas.push('UF sem capital: ' + sigla);
    if (!REGIOES[sigla]) problemas.push('UF sem região: ' + sigla);
    for (const vizinho of vizinhos) {
      if (!NOMES[vizinho]) problemas.push('vizinho desconhecido: ' + sigla + '→' + vizinho);
      else if (!(DIVISAS[vizinho] || []).includes(sigla)) problemas.push('divisa assimétrica: ' + sigla + '↔' + vizinho);
    }
  }
  for (const sigla of ufs) if (!DIVISAS[sigla]) problemas.push('UF sem mapa de divisas: ' + sigla);
  const capitais = Object.values(CAPITAIS).map(normaliza);
  if (new Set(capitais).size !== capitais.length) problemas.push('capitais repetidas');
  const esperado = { Norte: 7, Nordeste: 9, 'Centro-Oeste': 4, Sudeste: 4, Sul: 3 };
  for (const [regiao, quantidade] of Object.entries(esperado)) {
    if (ufs.filter(x => REGIOES[x] === regiao).length !== quantidade) problemas.push('quantidade inválida na Região ' + regiao);
  }
  const maior = maiorNumeroDeDivisas();
  if (maior.maximo !== 8 || maior.estado !== 'BA') problemas.push('maior número de divisas deveria ser Bahia com 8');
  return problemas;
}

module.exports = { NOMES, CAPITAIS, REGIOES, DIVISAS, ORDEM_REGIOES, normaliza, estadoPorNome, estadoMencionado, capitalPorNome, capitalMencionada, regiaoMencionada, nomesDivisas, maiorNumeroDeDivisas, dadosUF, responde, validaMapa };
