// Re-pontua os textos JÁ GRAVADOS com a rubrica atual (que agora aceita as equivalências
// verificáveis). Aplica a MESMA régua aos dois lados — nenhum lado é beneficiado.
//
// Uso: node bench/reavaliar-equivalencias.js [arquivo...]
// Sem argumentos, lê todos os bench/resultado-pareado-*.json e os dois resultados desta rodada.
'use strict';
const fs = require('fs');
const path = require('path');
const { avaliar } = require('./avaliar-aberto');

const bancos = {
  original: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-novo-102.json'), 'utf8'))
};
const itemDe = (grupo, id) => (bancos[grupo] || []).find((x) => x.id === id) || {};

const arquivos = process.argv.slice(2).length ? process.argv.slice(2) : [
  'resultado-pareado-102.json', 'resultado-pareado-103.json', 'resultado-pareado-104.json',
  'resultado-pareado-105.json', 'resultado-fonte-viva-106.json', 'resultado-concretude-106.json'
].map((f) => path.join(__dirname, f)).filter((f) => fs.existsSync(f));

let totalAntes = { A: 0, B: 0, n: 0 }, totalDepois = { A: 0, B: 0, n: 0 };
const viradas = [];
const fatosAntes = new Map(), fatosDepois = new Map();

for (const arq of arquivos) {
  const d = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const cont = { A: [0, 0], B: [0, 0] };
  for (const r of d.res) {
    const it = itemDe(r.grupo, r.id);
    const depois = avaliar(r.texto, it);
    cont[r.versao][0] += r.ok ? 1 : 0;
    cont[r.versao][1] += depois.ok ? 1 : 0;
    totalAntes[r.versao] += r.ok ? 1 : 0;
    totalDepois[r.versao] += depois.ok ? 1 : 0;
    totalAntes.n++;
    if (!r.ok && depois.ok) viradas.push({ arq: path.basename(arq), ...r, falhasDepois: depois.falhas });
    const chave = r.grupo + ':' + r.id;
    if (r.falhas.some((f) => /fato/.test(f))) fatosAntes.set(chave, (fatosAntes.get(chave) || 0) + 1);
    if (depois.falhas.some((f) => /fato/.test(f))) fatosDepois.set(chave, (fatosDepois.get(chave) || 0) + 1);
  }
  const linha = (v) => cont[v][0] + ' → ' + cont[v][1];
  console.log(path.basename(arq).padEnd(34) + 'A ' + linha('A').padEnd(14) + 'B ' + linha('B'));
}

console.log('\nTOTAL nas ' + arquivos.length + ' janelas:');
console.log('  A: ' + totalAntes.A + ' → ' + totalDepois.A + ' de ' + (totalAntes.n / 2));
console.log('  B: ' + totalAntes.B + ' → ' + totalDepois.B + ' de ' + (totalAntes.n / 2));
console.log('  ganho do par: A +' + (totalDepois.A - totalAntes.A) + ' · B +' + (totalDepois.B - totalAntes.B));

console.log('\nRespostas que passam a passar (' + viradas.length + ') — a resposta estava certa e a régua cobrava a palavra:');
const porItem = {};
for (const v of viradas) {
  const k = '#' + v.id;
  porItem[k] = (porItem[k] || 0) + 1;
}
for (const [k, n] of Object.entries(porItem).sort((a, b) => b[1] - a[1])) console.log('  ' + k + ': ' + n + ' resposta(s)');
for (const v of viradas.slice(0, 12)) {
  console.log('  · ' + v.arq + ' ' + v.versao + ' #' + v.id + ' r' + v.repeticao + ' — falhava por [' + v.falhas.join('; ') + ']');
}

console.log('\nItens ainda reprovados por FATO depois da correção (por item, em todas as janelas):');
const restantes = [...fatosDepois.entries()].sort((a, b) => b[1] - a[1]);
if (!restantes.length) console.log('  nenhum');
for (const [k, n] of restantes) console.log('  ' + k + ': ' + n + ' ocorrência(s) — antes era ' + (fatosAntes.get(k) || 0));
