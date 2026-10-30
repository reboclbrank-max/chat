// As "5 falhas de fato" são sistemáticas ou intermitentes?
//
// Junta TODAS as gravações do repositório (7 janelas × 2 lados), re-avalia cada texto com a régua
// ATUAL (com as equivalências) e conta, por item, em quantas gerações o fato faltou. Se um item
// falha em quase toda geração, é defeito de produto; se falha em uma minoria, é variância de
// geração — e nenhuma intervenção de prompt vai "consertar" variância.
//
// Uso: node bench/diagnostico-fatos-107.js
'use strict';
const fs = require('fs');
const path = require('path');
const { avaliar } = require('./avaliar-aberto');

const bancos = {
  original: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-novo-102.json'), 'utf8'))
};
const itens = new Map();
for (const [g, lista] of Object.entries(bancos)) for (const it of lista) itens.set(g + ':' + it.id, it);

const arquivos = fs.readdirSync(__dirname)
  .filter((f) => /^resultado-.*\.json$/.test(f))
  .map((f) => path.join(__dirname, f))
  .filter((f) => {
    try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(d.res) && d.res.length; }
    catch (e) { return false; }
  });

const porItem = new Map();
let totalResp = 0;
for (const arq of arquivos) {
  const d = JSON.parse(fs.readFileSync(arq, 'utf8'));
  for (const r of d.res) {
    const it = itens.get(r.grupo + ':' + r.id);
    if (!it) continue;
    const av = avaliar(r.texto, it);
    const k = r.grupo + ':' + r.id;
    const reg = porItem.get(k) || { n: 0, fato: 0, forma: 0, vazio: 0, textos: [] };
    reg.n++;
    if (av.falhas.includes('vazio')) reg.vazio++;
    else if (av.falhas.some((f) => /fato/.test(f))) {
      reg.fato++;
      if (reg.textos.length < 2) reg.textos.push(String(r.texto || '').replace(/\s+/g, ' '));
    } else if (!av.ok) reg.forma++;
    porItem.set(k, reg);
    totalResp++;
  }
}

console.log('Gravações analisadas: ' + arquivos.length + ' arquivos · ' + totalResp + ' respostas');
console.log('Régua: a atual (com as 5 equivalências verificáveis)\n');

const linhas = [...porItem.entries()]
  .filter(([, v]) => v.n >= 4 && v.fato > 0)
  .map(([k, v]) => ({ k, ...v, taxa: v.fato / v.n }))
  .sort((a, b) => b.taxa - a.taxa);

console.log('item            gerações  falha de fato  taxa    vazio  forma');
for (const l of linhas) {
  console.log(l.k.padEnd(16) + String(l.n).padEnd(10) + String(l.fato).padEnd(15) +
    (Math.round(1000 * l.taxa) / 10 + '%').padEnd(8) + String(l.vazio).padEnd(7) + l.forma);
}

const sistematicos = linhas.filter((l) => l.taxa >= 0.5);
const intermitentes = linhas.filter((l) => l.taxa < 0.5);
console.log('\nSistemáticos (fato falta em ≥50% das gerações): ' + (sistematicos.length || 'nenhum'));
for (const l of sistematicos) console.log('  ' + l.k + ' — ' + Math.round(100 * l.taxa) + '% de ' + l.n);
console.log('Intermitentes (<50%): ' + (intermitentes.length || 'nenhum'));
for (const l of intermitentes) console.log('  ' + l.k + ' — ' + Math.round(100 * l.taxa) + '% de ' + l.n);

const totalFato = linhas.reduce((s, l) => s + l.fato, 0);
const totalN = linhas.reduce((s, l) => s + l.n, 0);
console.log('\nRespostas com falta de fato nesses itens: ' + totalFato + ' de ' + totalN +
  ' (' + (Math.round(1000 * totalFato / totalN) / 10) + '%)');
console.log('Itens sem nenhuma falta de fato nas gravações: ' +
  [...porItem.entries()].filter(([, v]) => v.n >= 4 && !v.fato).length + ' de ' + porItem.size);
