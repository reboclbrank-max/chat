// Indicadores descritivos de texto, versão 2.
// Uso: node bench/estilo.js [resultado.json] [--json]
// NÃO é uma nota de qualidade, um corretor gramatical, nem prova de coesão ou verdade.
// Frequências automáticas são auxiliares para uma leitura humana/contextual; ver
// docs/AVALIACAO-TEXTO-ABERTO.md. As contagens da versão anterior são incompatíveis:
// aquela versão ignorava acentos e pontuação em conectivos, e contava tipos como ocorrências.
'use strict';

const fs = require('fs');
const path = require('path');
const CONECTIVOS = ['portanto', 'porém', 'contudo', 'entretanto', 'além disso', 'assim', 'dessa forma',
  'no entanto', 'por outro lado', 'já que', 'uma vez que', 'embora', 'enquanto', 'porque', 'pois',
  'desse modo', 'em suma', 'por fim', 'primeiro', 'depois', 'também', 'inclusive', 'ou seja', 'mas'];

function normalizar(s) {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function palavras(s) {
  return normalizar(s).match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g) || [];
}
const VAZIAS = new Set(palavras('a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela '
  + 'para com sem sob sobre entre e ou mas que se não sim é são foi foram ser estar está estão '
  + 'ao aos à às seu sua seus suas este esta esse essa isso isto aquele aquela mais menos muito '
  + 'pouco como quando onde qual quais há tem têm pode podem deve devem'));
const MARCADORES = CONECTIVOS.map((nome) => ({ nome, tokens: palavras(nome) }))
  .sort((a, b) => b.tokens.length - a.tokens.length);

function frases(texto) {
  const t = String(texto || '').trim();
  if (!t) return [];
  // Aproximação deliberada: protege abreviaturas comuns, não é analisador linguístico completo.
  const protegida = t.replace(/\b(Sr|Sra|Srta|Dr|Dra|Prof|Profa|Ex|Art)\./gi, '$1\u0001')
    .replace(/\s+/g, ' ');
  return protegida.split(/(?<=[.!?…])\s+/)
    .map((f) => f.replace(/\u0001/g, '.').trim()).filter(Boolean);
}
function mediana(valores) {
  const xs = valores.slice().sort((a, b) => a - b);
  if (!xs.length) return 0;
  const meio = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[meio] : (xs[meio - 1] + xs[meio]) / 2;
}
function arredondar(n) { return Math.round(n * 100) / 100; }

function medidas(texto) {
  const tokens = palavras(texto);
  const sentencas = frases(texto);
  const tamanhos = sentencas.map((f) => palavras(f).length);
  const conteudo = tokens.filter((p) => p.length > 3 && !VAZIAS.has(p));
  const distintas = new Set(conteudo);
  const tipos = {};
  let ocorrencias = 0;
  // Tokens normalizados removem acento/pontuação, sem casar dentro de outra palavra;
  // a maior expressão tem prioridade: "por outro lado" conta uma vez, não várias.
  for (let i = 0; i < tokens.length;) {
    const marcador = MARCADORES.find((m) => m.tokens.every((t, j) => tokens[i + j] === t));
    if (!marcador) { i++; continue; }
    tipos[marcador.nome] = (tipos[marcador.nome] || 0) + 1;
    ocorrencias++;
    i += marcador.tokens.length;
  }
  return {
    palavras: tokens.length,
    frases: sentencas.length,
    fraseMed: arredondar(mediana(tamanhos)),
    longasPct: sentencas.length ? arredondar(tamanhos.filter((n) => n > 35).length * 100 / sentencas.length) : 0,
    repeticao: conteudo.length ? arredondar((conteudo.length - distintas.size) * 100 / conteudo.length) : 0,
    variedadeLexical: conteudo.length ? arredondar(distintas.size * 100 / conteudo.length) : 0,
    ocorrenciasConectivos: ocorrencias,
    tiposConectivos: tipos,
    conectivosPor100: tokens.length ? arredondar(ocorrencias * 100 / tokens.length) : 0
  };
}

function relatorio(dados) {
  const itens = dados.res || dados.itens || dados.resultados || dados;
  if (!Array.isArray(itens)) throw new Error('arquivo não contém lista de resultados');
  const linhas = itens.filter((it) => palavras(it.texto || it.resposta || '').length >= 20)
    .map((it) => ({ id: it.id, ...medidas(it.texto || it.resposta) }));
  if (!linhas.length) throw new Error('nenhum texto com 20 ou mais palavras');
  const med = (k) => arredondar(mediana(linhas.map((x) => x[k])));
  return { versao: 2, aviso: 'Indicadores descritivos; não avaliam qualidade literária, coesão ou veracidade.',
    total: linhas.length, medianas: { fraseMed: med('fraseMed'), longasPct: med('longasPct'),
      repeticao: med('repeticao'), conectivosPor100: med('conectivosPor100') }, itens: linhas };
}
function main() {
  const args = process.argv.slice(2);
  const arquivo = args.find((x) => x !== '--json') || path.join(__dirname, 'resultado-aberto-depois.json');
  try {
    const r = relatorio(JSON.parse(fs.readFileSync(arquivo, 'utf8')));
    if (args.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
    console.log('INDICADORES DESCRITIVOS v2 — não são nota de qualidade ou verdade.');
    console.log('item  palavras  med.frase  longas%  repet.%  conectivos/100  ocorrências');
    r.itens.forEach((it) => console.log(String(it.id).padStart(4) + '  ' + String(it.palavras).padStart(8) +
      '  ' + String(it.fraseMed).padStart(9) + '  ' + String(it.longasPct).padStart(7) +
      '  ' + String(it.repeticao).padStart(7) + '  ' + String(it.conectivosPor100).padStart(14) +
      '  ' + String(it.ocorrenciasConectivos).padStart(11)));
    console.log('\nMedianas: ' + JSON.stringify(r.medianas));
    console.log(r.aviso);
  } catch (e) { console.error('Erro:', e.message); process.exitCode = 1; }
}
if (require.main === module) main();
module.exports = { normalizar, palavras, frases, medidas, relatorio, mediana, CONECTIVOS };
