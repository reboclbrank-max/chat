#!/usr/bin/env node
// Monta as páginas derivadas do Chat — 2026-10-24.
//
// PROBLEMA: `index.html`, `direto.html`, `ligar.html` e `limpar.html` eram quatro cópias
// quase idênticas do mesmo arquivo de ~540 KB. Toda correção precisava ser feita quatro
// vezes, e a divergência crescia sem aviso (a página tinha 495 KB de JavaScript inline e
// só 2 a 6 trechos diferentes entre rotas).
//
// SOLUÇÃO: a fonte única passa a ser `index.html`. As outras três são DERIVADAS por regras
// pequenas e revisáveis em `paginas/rotas/<rota>.json` (faixa de linhas + texto esperado +
// texto novo). O contrato `tools/testes/paginas-geradas.js` falha se alguém editar uma rota
// à mão, se uma regra deixar de casar ou se a regeneração divergir do arquivo commitado.
//
// Uso:
//   node tools/montar-paginas.js --verificar   # só confere (código 1 se divergir)
//   node tools/montar-paginas.js --escrever    # regenera as três rotas
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const BASE = 'index.html';
const ROTAS = ['direto', 'ligar', 'limpar'];

function ler(nome) {
  return fs.readFileSync(path.join(RAIZ, nome), 'utf8');
}

// O bloco de código da rota é o maior <script> inline; a casca (HTML/CSS) é idêntica nas
// quatro páginas hoje, então as regras só precisam valer dentro desse bloco.
function maiorBlocoInline(html) {
  const blocos = [...html.matchAll(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/g)];
  if (!blocos.length) throw new Error('página sem <script> inline');
  return blocos.reduce((maior, atual) => (atual[0].length > maior[0].length ? atual : maior));
}

function partes(html) {
  const bloco = maiorBlocoInline(html);
  const inicio = bloco.index;
  const fim = inicio + bloco[0].length;
  // O conteúdo interno do <script> começa depois do '>' da abertura.
  const abre = html.indexOf('>', inicio) + 1;
  const fecha = fim - '</script>'.length;
  return {
    antes: html.slice(0, abre),
    corpo: html.slice(abre, fecha),
    depois: html.slice(fecha)
  };
}

function carregarRegras(rota) {
  const caminho = path.join(RAIZ, 'paginas', 'rotas', rota + '.json');
  const dados = JSON.parse(fs.readFileSync(caminho, 'utf8'));
  if (dados.rota !== rota) throw new Error(rota + ': arquivo de regras aponta para outra rota');
  if (!Array.isArray(dados.regras)) throw new Error(rota + ': regras ausentes');
  // `cauda` só existe quando a rota tem um <script> final próprio (ligar, limpar).
  if (dados.cauda != null && typeof dados.cauda !== 'string') throw new Error(rota + ': cauda inválida');
  return dados;
}

// Aplica as regras de baixo para cima para as faixas não se deslocarem.
function aplicarRegras(corpo, regras, rota) {
  const linhas = corpo.split('\n');
  const ordenadas = [...regras].sort((a, b) => b.faixa[0] - a.faixa[0]);
  for (const regra of ordenadas) {
    const [i1, i2] = regra.faixa;
    if (!Number.isInteger(i1) || !Number.isInteger(i2) || i1 < 0 || i2 < i1) {
      throw new Error(rota + ': faixa inválida ' + JSON.stringify(regra.faixa));
    }
    const atual = linhas.slice(i1, i2).join('\n');
    if (atual !== regra.esperado) {
      throw new Error(rota + ': a faixa ' + i1 + '–' + i2 + ' mudou no index.html; regenere as regras');
    }
    const novo = regra.novo;
    linhas.splice(i1, i2 - i1, ...(novo === '' ? [] : novo.split('\n')));
  }
  return linhas.join('\n');
}

function montar(rota, baseHtml) {
  const dados = carregarRegras(rota);
  const p = partes(baseHtml);
  const corpo = aplicarRegras(p.corpo, dados.regras, rota);
  const cauda = dados.cauda != null ? dados.cauda : p.depois;
  return p.antes + corpo + cauda;
}

function main(argv) {
  const baseHtml = ler(BASE);
  const escrever = argv.includes('--escrever');
  const verificar = argv.includes('--verificar') || !escrever;
  let divergentes = 0;
  for (const rota of ROTAS) {
    const destino = rota + '.html';
    const atual = ler(destino);
    const gerado = montar(rota, baseHtml);
    const igual = gerado === atual;
    if (!igual) divergentes++;
    console.log((igual ? '✔ ' : '✘ ') + destino + (igual ? ' em sincronia com ' + BASE : ' DIVERGENTE — edite ' + BASE + ' e rode --escrever'));
    if (!igual && escrever) {
      fs.writeFileSync(path.join(RAIZ, destino), gerado);
      console.log('   regravado a partir de ' + BASE + ' e paginas/rotas/' + rota + '.json');
    }
  }
  if (verificar && divergentes) {
    console.error('\n' + divergentes + ' página(s) fora de sincronia. A fonte única é ' + BASE + '.');
    return 1;
  }
  console.log('\n' + ROTAS.length + ' páginas derivadas de ' + BASE + ' sem divergência.');
  return 0;
}

module.exports = { montar, partes, aplicarRegras, carregarRegras, ROTAS, BASE };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
