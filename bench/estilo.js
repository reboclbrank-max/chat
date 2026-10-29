// Régua de ESTILO — mede o que a régua de conteúdo não mede.
//
//   node bench/estilo.js                 # mede o último resultado-aberto-depois.json
//   node bench/estilo.js caminho.json    # mede qualquer resultado salvo
//
// Por que existe: a régua aberta aprova texto por formato (tamanho, nº de parágrafos,
// fechamento) e cobertura de termos. Um texto repetitivo, com frases de 60 palavras e
// sem conectivo nenhum passa nela. Estas quatro medidas são o que falta:
//
//   fraseMed   — mediana de palavras por frase (ideal: 12 a 24; acima de 30 cansa)
//   longasPct  — % de frases com mais de 35 palavras
//   repeticao  — % de conteúdo repetido (palavras de conteúdo que se repetem além da 1ª vez)
//   conectivos — variedade de conectivos usados por 100 palavras
//
// Não é gabarito de "boa prosa": é um detector de texto doente (repetitivo, arrastado,
// sem articulação). Os limites abaixo são declarados e auditáveis.
//
// LIMITE CONHECIDO (medido em 29/10): `conectivos` só conta conectivo EXPLÍCITO de uma lista fixa.
// Texto que articula por subordinação ("que", "onde", "cujo", orações encaixadas) não pontua —
// e é justamente o que os modelos gratuitos fazem: mediana de 0,4 por 100 palavras com texto
// articulado por subordinadas. Por isso este número NÃO é placar de qualidade; é sinal de alerta
// para texto telegráfico. Instruir o modelo a "usar conectivos variados" não moveu a medida
// (0,5 → 0,4 em 24 textos): a fraqueza está na medida, não só no texto.
'use strict';

const fs = require('fs');
const path = require('path');

const CONECTIVOS = ['portanto', 'porém', 'contudo', 'entretanto', 'além disso', 'assim', 'dessa forma',
  'no entanto', 'por outro lado', 'já que', 'uma vez que', 'embora', 'enquanto', 'porque', 'pois',
  'desse modo', 'em suma', 'por fim', 'primeiro', 'depois', 'também', 'inclusive', 'ou seja'];

const VAZIAS = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela '
  + 'para com sem sob sobre entre e ou mas que se não sim é são foi foram ser estar está estão '
  + 'ao aos à às seu sua seus suas este esta esse essa isso isto aquele aquela mais menos muito '
  + 'pouco como quando onde qual quais há tem têm pode podem deve devem').split(/\s+/));

function frases(texto) {
  return String(texto)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((f) => f.trim())
    .filter((f) => f.split(/\s+/).length > 1);
}

function medidas(texto) {
  const t = String(texto || '');
  const fs_ = frases(t);
  const palavras = t.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zà-ÿ0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const n = palavras.length || 1;

  const tam = fs_.map((f) => f.split(/\s+/).length).sort((a, b) => a - b);
  const fraseMed = tam.length ? tam[Math.floor(tam.length / 2)] : 0;
  const longas = tam.filter((x) => x > 35).length;

  const conteudo = palavras.filter((p) => p.length > 3 && !VAZIAS.has(p));
  const vistas = new Set();
  let repetidas = 0;
  conteudo.forEach((p) => { if (vistas.has(p)) repetidas++; else vistas.add(p); });
  const repeticao = conteudo.length ? (repetidas / conteudo.length) * 100 : 0;

  const minus = ' ' + t.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '') + ' ';
  const usados = CONECTIVOS.filter((c) => minus.indexOf(' ' + c + ' ') >= 0).length;
  const conectivos = (usados / n) * 100;

  return {
    palavras: n,
    frases: fs_.length,
    fraseMed,
    longasPct: fs_.length ? Math.round((longas / fs_.length) * 100) : 0,
    repeticao: Math.round(repeticao),
    conectivos: Math.round(conectivos * 10) / 10,
    variedadeLexical: Math.round((vistas.size / (conteudo.length || 1)) * 100)
  };
}

// limites declarados (não escondidos): dentro deles o texto não está doente
const LIMITES = { fraseMed: [8, 32], longasPct: [0, 25], repeticao: [0, 45], conectivos: [1.2, 99] };

function saudavel(m) {
  return m.fraseMed >= LIMITES.fraseMed[0] && m.fraseMed <= LIMITES.fraseMed[1]
    && m.longasPct <= LIMITES.longasPct[1]
    && m.repeticao <= LIMITES.repeticao[1]
    && m.conectivos >= LIMITES.conectivos[0];
}

function main() {
  const arq = process.argv[2] || path.join(__dirname, 'resultado-aberto-depois.json');
  if (!fs.existsSync(arq)) {
    console.error('sem arquivo de resultado em ' + arq + ' — rode antes: MODO=depois CONC=1 node bench/medir-aberto.js gratis');
    process.exitCode = 1;
    return;
  }
  const dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const itens = dados.res || dados.itens || dados.resultados || dados;
  const linhas = [];
  (Array.isArray(itens) ? itens : []).forEach((it) => {
    const texto = it.texto || it.resposta || '';
    if (!texto || texto.split(/\s+/).length < 20) return;
    const m = medidas(texto);
    linhas.push({ id: it.id, ok: it.ok !== false, ...m, doente: !saudavel(m) });
  });
  if (!linhas.length) { console.error('nenhum texto com 20+ palavras no arquivo'); process.exitCode = 1; return; }

  const med = (k) => {
    const v = linhas.map((l) => l[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const doentes = linhas.filter((l) => l.doente);

  console.log('item  palavras  fraseMed  longas%  repetição%  conectivos/100  variedade%');
  linhas.forEach((l) => {
    console.log(
      String(l.id).padStart(4) + '  ' + String(l.palavras).padStart(8) + '  ' +
      String(l.fraseMed).padStart(8) + '  ' + String(l.longasPct).padStart(7) + '  ' +
      String(l.repeticao).padStart(10) + '  ' + String(l.conectivos).padStart(14) + '  ' +
      String(l.variedadeLexical).padStart(10) + (l.doente ? '  ⚠️' : '')
    );
  });
  console.log('\nmediana: fraseMed=' + med('fraseMed') + ' · longas%=' + med('longasPct') +
    ' · repetição%=' + med('repeticao') + ' · conectivos/100=' + med('conectivos'));
  console.log('limites declarados: ' + JSON.stringify(LIMITES));
  console.log((doentes.length ? '⚠️ ' + doentes.length + '/' + linhas.length + ' textos fora dos limites: itens ' +
    doentes.map((d) => d.id).join(', ') : '✔ todos os ' + linhas.length + ' textos dentro dos limites'));
}

if (require.main === module) main();
module.exports = { medidas, saudavel, LIMITES, frases, CONECTIVOS };
