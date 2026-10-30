// Re-pontua um resultado pareado já gravado com a rubrica CORRIGIDA (equivalências verificáveis),
// aplicando exatamente a mesma régua aos dois lados. Não gera resposta nova: relê o texto salvo.
// Uso: node bench/reavaliar-rubrica.js bench/resultado-pareado-102.json
'use strict';
const fs = require('fs');
const path = require('path');
const { avaliar } = require('./avaliar-aberto');

const arquivo = process.argv[2] || path.join(__dirname, 'resultado-pareado-102.json');
const bruto = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const bancos = {
  original: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-novo-102.json'), 'utf8'))
};
const itemDe = (grupo, id) => (bancos[grupo] || []).find((x) => x.id === id);

const linhas = bruto.res.map((r) => {
  const it = itemDe(r.grupo, r.id);
  const nova = avaliar(r.texto || '', it || {});
  return { ...r, okAntes: r.ok, okDepois: nova.ok, falhasDepois: nova.falhas };
});

const grupo = (r) => (r.repeticao > 0 ? 'repeticoes' : r.grupo);
const resumo = (campo) => {
  const out = {};
  for (const g of ['original', 'holdout', 'novo', 'repeticoes', 'total']) {
    const ls = g === 'total' ? linhas : linhas.filter((r) => grupo(r) === g);
    out[g] = {};
    for (const v of ['A', 'B']) {
      const vs = ls.filter((r) => r.versao === v);
      out[g][v] = { total: vs.length, ok: vs.filter((r) => r[campo]).length };
    }
  }
  return out;
};

const antes = resumo('okAntes');
const depois = resumo('okDepois');

console.log('Arquivo: ' + path.basename(arquivo));
console.log('Rubrica: avaliar-aberto + equivalências verificáveis (bench/equivalencias-rubrica.js)\n');
console.log('grupo         A antes -> depois     B antes -> depois');
for (const g of ['original', 'holdout', 'novo', 'repeticoes', 'total']) {
  const a = antes[g].A, ad = depois[g].A, b = antes[g].B, bd = depois[g].B;
  const fmt = (x, y) => x.ok + '/' + x.total + (y.ok !== x.ok ? ' -> ' + y.ok + '/' + y.total : '      ');
  console.log(g.padEnd(13) + fmt(a, ad).padEnd(23) + fmt(b, bd));
}

const mudou = linhas.filter((r) => r.okAntes !== r.okDepois);
console.log('\nItens que mudaram de veredito: ' + mudou.length);
for (const r of mudou) {
  console.log('  ' + r.versao + ' #' + r.id + (r.repeticao ? ' r' + r.repeticao : '') +
    ' (' + r.grupo + '): ' + (r.okAntes ? 'passava' : 'falhava') + ' -> ' + (r.okDepois ? 'passa' : 'falha') +
    (r.falhasDepois.length ? ' [' + r.falhasDepois.join('; ') + ']' : ''));
}
console.log('\nNada aqui repara conteúdo: só corrige vocabulário/morfologia/número do gabarito.');
console.log('As 5 respostas de #22 diziam "painéis" ou "módulo"; a rubrica procurava o singular "painel".');
