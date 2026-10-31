#!/usr/bin/env node
// GERADOR DA BASE LEXICAL LOCAL (rodada 139, 31/10/2026).
//
// Problema: sinônimo, antônimo, "qual não pertence" e analogia eram as últimas provas que
// dependiam de modelo. A fila do auto-diagnóstico dizia "vale base de fatos estáveis com fonte" e
// a rodada 136 mediu que o OpenWordnet-PT cobre 0 de 5 casos.
//
// Aqui a base é CONSTRUÍDA EM TEMPO DE BUILD a partir do Wikcionário em português (CC BY-SA),
// para uma lista GERAL de palavras frequentes — não para as palavras do teste. O arquivo gerado
// (`lexico-pt.json`) é versionado no repositório, então em tempo de execução o produto não toca a
// rede: dependência zero, com procedência registrada no próprio arquivo.
//
// O que é guardado por palavra: sinônimos, antônimos e a primeira linha de definição (curta).
//
// Uso:  node tools/gerar-lexico-pt.js [--palavras=2500] [--extra=a,b,c]
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const SAIDA = path.join(RAIZ, 'lexico-pt.json');
const API = 'https://pt.wiktionary.org/w/api.php';
const LOTE = 50;

function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/* A lista de frequência (FrequencyWords, CC-BY-SA) vem SEM acento — e o Wikcionário tem os
   verbetes COM acento ("efêmero", não "efemero"). Sem corrigir isso, metade das palavras dava
   "página não encontrada" (medido em 31/10/2026: 1.593 de 2.513). A lista pública de palavras
   (pythonprobr/palavras, 320 mil formas) serve de índice de GRAFIA: para cada palavra frequente,
   pega a forma acentuada que existe em português. */
function listaDeFrequencia(quantas) {
  const caminho = process.env.FREQ_PT || '/tmp/pt50k.txt';
  const caminhoFormas = process.env.FORMAS_PT || '/tmp/palavras.txt';
  const grafias = new Map();                     // sem acento → forma acentuada mais provável
  if (fs.existsSync(caminhoFormas)) {
    for (const linha of fs.readFileSync(caminhoFormas, 'utf8').split('\n')) {
      const forma = linha.trim();
      if (!/^[a-zà-ÿ]{3,}$/i.test(forma)) continue;
      const chave = norm(forma);
      if (!grafias.has(chave)) grafias.set(chave, forma.toLowerCase());
    }
  }
  const palavras = [];
  if (fs.existsSync(caminho)) {
    for (const linha of fs.readFileSync(caminho, 'utf8').split('\n')) {
      const p = linha.trim().split(/\s+/)[0];
      if (p && /^[a-zà-ÿ]{3,}$/.test(p)) palavras.push(grafias.get(norm(p)) || p);
      if (palavras.length >= quantas) break;
    }
  }
  return palavras;
}

/* A API do Wikcionário limita taxa e responde TEXTO ("You are making too many requests") em vez
   de JSON quando o limite é passado. Isso precisa ser tratado: na primeira versão os lotes
   limitados eram engolidos em silêncio e a base saía sem as palavras mais comuns (medido em
   31/10/2026). Aqui: JSON inválido = falha, espera crescente, e os títulos que faltaram voltam
   para a fila. */
const espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

async function baixarLote(titulos) {
  const url = API + '?action=query&format=json&formatversion=2&prop=revisions&rvprop=content'
    + '&maxlag=5&redirects=1&titles=' + encodeURIComponent(titulos.join('|'));
  const r = await fetch(url, { headers: { 'User-Agent': 'rebocl-chat-lexico/1.0 (projeto pessoal)' } });
  const corpo = await r.text();
  if (!r.ok || corpo.trim().charAt(0) !== '{') throw new Error('limite de taxa ou erro HTTP ' + r.status);
  const d = JSON.parse(corpo);
  if (d.error) throw new Error('API: ' + d.error.code);
  const porTitulo = {};
  for (const p of (d.query && d.query.pages) || []) {
    if (p.missing) continue;
    const conteudo = p.revisions && p.revisions[0] && p.revisions[0].content;
    if (conteudo) porTitulo[norm(p.title)] = conteudo;
  }
  return porTitulo;
}

// Extrai pares de uma seção// Extrai pares de uma seção tipo "===Sinônimos===" com itens "* [[palavra]]".
function extrairSecao(wikitext, nomes) {
  const saida = [];
  let dentro = false;
  for (const linha of wikitext.split('\n')) {
    const titulo = linha.match(/^=+\s*(.+?)\s*=+\s*$/);
    if (titulo) {
      const t = norm(titulo[1]).replace(/[^a-z ]/g, '');
      dentro = nomes.some(function (n) { return t.indexOf(n) !== -1; });
      continue;
    }
    if (!dentro) continue;
    if (/^\s*\*/.test(linha)) {
      for (const bruto of linha.match(/\[\[([^\]|#]+)/g) || []) {
        const palavra = bruto.replace(/\[\[/, '').trim();
        if (palavra && /^[a-zà-ÿ]{3,}$/i.test(palavra)) saida.push(norm(palavra));
      }
    } else if (!/^\s*$/.test(linha) && !/^\s*\{/.test(linha) && saida.length) {
      dentro = false;                                  // fim da seção
    }
  }
  return Array.from(new Set(saida));
}

// Primeira linha de definição (o "# ..." do verbete), sem marcação: serve de pista de campo.
function primeiraDefinicao(wikitext) {
  for (const linha of wikitext.split('\n')) {
    const m = linha.match(/^#\s*(?!\*)(.+)$/);
    if (!m) continue;
    const texto = m[1]
      .replace(/\{\{[^}]*\}\}/g, ' ')
      .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
      .replace(/'''?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (texto.length >= 3) return texto.slice(0, 140);
  }
  return null;
}

(async () => {
  const arg = function (nome, padrao) {
    const achado = process.argv.find(function (a) { return a.indexOf('--' + nome + '=') === 0; });
    return achado ? achado.split('=')[1] : padrao;
  };
  const quantas = Number(arg('palavras', 2500));
  const acentuadas = new Map();
  {
    const caminhoFormas = process.env.FORMAS_PT || '/tmp/palavras.txt';
    if (fs.existsSync(caminhoFormas)) {
      for (const linha of fs.readFileSync(caminhoFormas, 'utf8').split('\n')) {
        const forma = linha.trim();
        if (!/^[a-zà-ÿ]{3,}$/i.test(forma)) continue;
        const chave = norm(forma);
        if (!acentuadas.has(chave)) acentuadas.set(chave, forma.toLowerCase());
      }
    }
  }
  const extra = String(arg('extra', '')).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    .map(function (w) { return acentuadas.get(norm(w)) || w; });
  const palavras = Array.from(new Set(listaDeFrequencia(quantas).concat(extra)));
  process.stderr.write('palavras a baixar: ' + palavras.length + '\n');

  const base = {};
  let fila = palavras.slice();
  let rodada = 0;
  while (fila.length && rodada < 6) {
    rodada++;
    const faltaram = [];
    for (let i = 0; i < fila.length; i += LOTE) {
      const lote = fila.slice(i, i + LOTE);
      let porTitulo = null;
      for (let t = 0; t < 4 && !porTitulo; t++) {
        try { porTitulo = await baixarLote(lote); }
        catch (e) { await espera(1500 * (t + 1)); }
      }
      if (!porTitulo) { faltaram.push.apply(faltaram, lote); continue; }
      for (const [titulo, conteudo] of Object.entries(porTitulo)) {
        const sinonimos = extrairSecao(conteudo, ['sinonimo', 'sinonimos', 'semelhante', 'semelhantes']);
        const antonimos = extrairSecao(conteudo, ['antonimo', 'antonimos', 'contrario', 'contrarios']);
        const definicao = primeiraDefinicao(conteudo);
        if (!sinonimos.length && !antonimos.length && !definicao) continue;
        base[titulo] = { s: sinonimos, a: antonimos, d: definicao };
      }
      const vieram = new Set(Object.keys(porTitulo));
      for (const t of lote) if (!vieram.has(norm(t))) faltaram.push(t);
      await espera(350);                                  // respeita o limite da API
    }
    process.stderr.write('rodada ' + rodada + ': base ' + Object.keys(base).length
      + ' · faltando ' + faltaram.length + '\n');
    if (!faltaram.length) break;
    // segunda rodada em diante: só o que faltou, e sem insistir para sempre
    if (faltaram.length === fila.length) break;            // não avançou: para
    fila = faltaram;
    await espera(2000);
  }

  const saida = {
    esquema: 'lexico-pt-v1',
    quando: new Date().toISOString().slice(0, 10),
    fonte: {
      nome: 'Wikcionário em português',
      url: 'https://pt.wiktionary.org',
      licenca: 'CC BY-SA 4.0 — atribuição: Wikcionário, colaboradores',
      como: 'extração das seções Sinônimos/Antônimos e da primeira linha de definição, em tempo de build'
    },
    palavras: Object.keys(base).length,
    campos: { s: 'sinônimos', a: 'antônimos', d: 'primeira definição (pista de campo semântico)' },
    base: base
  };
  fs.writeFileSync(SAIDA, JSON.stringify(saida) + '\n');
  /* Espelho em JavaScript: o produto roda na página, e um `fetch` de JSON seria mais uma
     dependência de rede em tempo de execução. Com o arquivo .js a base entra por <script> e o
     service worker guarda junto com a casca — zero requisição depois da primeira visita. */
  const espelho = path.join(RAIZ, 'lexico-pt.js');
  fs.writeFileSync(espelho, '/* Gerado por tools/gerar-lexico-pt.js — não editar à mão.\n'
    + '   Fonte: ' + saida.fonte.nome + ' (' + saida.fonte.licenca + ').\n'
    + '   ' + saida.palavras + ' palavras · gerado em ' + saida.quando + ' */\n'
    + '(function (raiz) {\n  var dados = ' + JSON.stringify(saida) + ';\n'
    + "  if (typeof module !== 'undefined' && module.exports) module.exports = dados;\n"
    + '  raiz.LexicoPT = dados;\n'
    + "})(typeof window !== 'undefined' ? window : globalThis);\n");
  process.stderr.write('espelho ' + espelho + '\n');
  process.stderr.write('gravado ' + SAIDA + ' · ' + saida.palavras + ' palavras · '
    + (fs.statSync(SAIDA).size / 1024).toFixed(0) + ' KB\n');
})();
