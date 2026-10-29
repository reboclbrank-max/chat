// Fase 1 (rede): coleta, para cada item dos bancos, o resultado da busca da Wikipédia e o
// texto do artigo. Separar a coleta da decisão permite mudar a regra de casamento sem repetir
// consulta — e sem transformar a rede em variável da medição.
//
// Uso: node bench/coletar-fontes-vivas.js [--pausa=4000]
// Cache: bench/cache-fontes-vivas.json (não versionado: é texto de terceiros).
'use strict';
const fs = require('fs');
const path = require('path');
const { internos } = require('../roteador-ia');

const CACHE = path.join(__dirname, 'cache-fontes-vivas.json');
const UA = 'chat-fonte-viva/1.0 (medicao offline; contato: dono do repositorio)';
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? Number(a.split('=')[1]) : d; };
const PAUSA = arg('pausa', 4000);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

let cache = {};
if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
const salvar = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));

async function json(url, tentativa = 0) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA }, signal: c.signal });
    const txt = await r.text();
    if (r.status === 429 || !r.ok || /^You are making too many requests/.test(txt)) {
      if (tentativa < 6) { await pausa(4000 * (tentativa + 1)); return json(url, tentativa + 1); }
      throw new Error('HTTP ' + r.status);
    }
    return JSON.parse(txt);
  } finally { clearTimeout(t); }
}

const bancos = ['banco-aberto-antes-100.json', 'banco-aberto-holdout-100.json', 'banco-aberto-novo-102.json']
  .map((f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const itens = [];
for (const b of bancos) for (const it of b) itens.push(it);

(async () => {
  let n = 0, erro = 0;
  for (const it of itens) {
    const termos = internos.termosDeBusca(it.q);
    // 1) a busca (uma consulta por item)
    if (!cache['busca:' + it.q]) {
      try {
        const jb = await json('https://pt.wikipedia.org/w/api.php?action=query&list=search&srlimit=5&format=json&origin=*&srsearch=' +
          encodeURIComponent(termos.join(' ')));
        cache['busca:' + it.q] = ((jb.query || {}).search || []).map((h) => ({ title: h.title, snippet: h.snippet }));
        salvar();
      } catch (e) {
        erro++;
        console.log('✘ busca falhou: ' + it.q.slice(0, 50) + ' — ' + e.message);
        continue;
      }
      await pausa(PAUSA);
    }
    // 2) o texto de UM artigo: o que o portão escolher. Buscar os 5 seria 5x mais consulta para
    //    o mesmo resultado — a decisão não depende do texto, só do título e do resumo.
    const decisao = internos.escolherFonte(cache['busca:' + it.q], termos, internos.termosDoPedido(it.q));
    if (decisao) {
      const titulo = decisao.escolhido.title;
      if (cache['artigo:' + titulo] === undefined) {
        try {
          const je = await json('https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1' +
            '&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(titulo));
          const pg = Object.values((je.query || {}).pages || {})[0] || {};
          cache['artigo:' + titulo] = { titulo: pg.title || titulo, trecho: pg.extract || '' };
          if (pg.title && pg.title !== titulo) cache['artigo:' + pg.title] = cache['artigo:' + titulo];
          salvar();
        } catch (e) { erro++; console.log('✘ artigo falhou: ' + titulo + ' — ' + e.message); }
        await pausa(PAUSA);
      }
    }
    n++;
    console.log('[' + n + '/' + itens.length + '] ' + (decisao ? 'aceita' : 'recusa') + ' · ' + it.q.slice(0, 58));
  }
  salvar();
  console.log('\nbuscas no cache: ' + Object.keys(cache).filter((k) => k.startsWith('busca:')).length +
    ' · artigos: ' + Object.keys(cache).filter((k) => k.startsWith('artigo:')).length + ' · falhas: ' + erro);
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
