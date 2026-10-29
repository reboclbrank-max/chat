// Mede a QUALIDADE DA FONTE (não da resposta) nos bancos da régua aberta.
//
// O que é medido, e o que NÃO é:
//   ✔ o trecho trazido contém os fatos que o gabarito exige (os mesmos padrões `contem` da régua);
//   ✔ quantos itens ficam com todos os fatos cobertos pela fonte;
//   ✘ não mede se o modelo usa a fonte, nem se a resposta fica melhor — isso exige chamada de
//     modelo com chave e fica fora desta medição. Fonte certa é condição necessária, não suficiente.
//
// Compara dois modos na MESMA lista de itens:
//   estatico — base fixa em fontes-publicas.json (o que está ligado hoje no pedido `fontes:true`)
//   vivo     — busca na Wikipédia em português com consulta de termos + exigência de 2 termos
//              cobertos no resultado (internos.buscarFonteViva)
//
// Uso: node bench/medir-fontes-vivas.js [--limite=N] [--pausa=ms] [--sem-rede]
// Cache em bench/cache-fontes-vivas.json para não repetir consulta (e respeitar o limite da API).
'use strict';
const fs = require('fs');
const path = require('path');
const { internos } = require('../roteador-ia');
const { satisfaz } = require('./equivalencias-rubrica');

const RAIZ = path.dirname(__dirname);
const CACHE = path.join(__dirname, 'cache-fontes-vivas.json');
const SEM_REDE = process.argv.includes('--sem-rede');
const arg = (nome, padrao) => {
  const a = process.argv.find((x) => x.startsWith('--' + nome + '='));
  return a ? Number(a.split('=')[1]) : padrao;
};
const LIMITE = arg('limite', Infinity);
const PAUSA = arg('pausa', 3000);

const bancos = {
  antes: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-novo-102.json'), 'utf8'))
};
const baseEstatica = JSON.parse(fs.readFileSync(path.join(RAIZ, 'fontes-publicas.json'), 'utf8'));

let cache = {};
if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
const salvarCache = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const UA = 'chat-fonte-viva/1.0 (medicao; contato: dono do repositorio)';

// Rede polida: 429 é do ambiente, não do código. Sem distinguir "rede falhou" de "gate recusou"
// a medição mente — foi o que aconteceu na primeira rodada, com 23 nulos falsos.
async function json(url, tentativa = 0) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA }, signal: c.signal });
    const txt = await r.text();
    if (r.status === 429 || !r.ok || /^You are making too many requests/.test(txt)) {
      if (tentativa < 6) { await pausa(4000 * (tentativa + 1)); return json(url, tentativa + 1); }
      throw new Error('HTTP ' + r.status + ' (limite da API)');
    }
    return JSON.parse(txt);
  } finally { clearTimeout(t); }
}

async function vivo(it) {
  if (SEM_REDE) return undefined;
  if (cache[it.q] !== undefined) return cache[it.q];
  const termos = internos.termosDeBusca(it.q);
  let reg;
  try {
    const jb = await json('https://pt.wikipedia.org/w/api.php?action=query&list=search&srlimit=5&format=json&origin=*&srsearch=' +
      encodeURIComponent(termos.join(' ')));
    await pausa(PAUSA);
    const dec = internos.escolherFonte((jb.query || {}).search || [], termos);
    if (!dec) {
      reg = { motivo: 'gate', termos: termos, titulo: null };
    } else {
      const je = await json('https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1' +
        '&format=json&origin=*&titles=' + encodeURIComponent(dec.escolhido.title));
      await pausa(PAUSA);
      const pg = Object.values((je.query || {}).pages || {})[0] || {};
      const trecho = internos.recortarFonte(pg.extract || '', 1800);
      reg = (trecho && trecho.length >= 200)
        ? { titulo: pg.title || dec.escolhido.title, trecho: trecho, termosCobertos: dec.nota, motivo: null }
        : { motivo: 'trecho-curto', termos: termos, titulo: pg.title || null };
    }
  } catch (e) {
    reg = { motivo: 'rede', erro: e.message, termos: termos, titulo: null };
  }
  cache[it.q] = reg;
  salvarCache();
  return reg;
}

function cobertura(trecho, it) {
  const t = String(trecho || '');
  const padroes = it.contem || [];
  return { ok: padroes.filter((p) => satisfaz(t, p)).length, total: padroes.length };
}

(async () => {
  const linhas = [];
  let n = 0;
  for (const [banco, itens] of Object.entries(bancos)) {
    for (const it of itens) {
      if (n >= LIMITE) break;
      n++;
      const estatico = internos.contextoFontes(internos.selecionarFontesLocais(it.q, baseEstatica));
      const v = await vivo(it);
      linhas.push({
        banco, id: it.id, q: it.q,
        estatico: cobertura(estatico, it),
        vivo: v && v.trecho ? cobertura(v.trecho, it) : null,
        titulo: v ? v.titulo : null,
        termosCobertos: v ? v.termosCobertos : null,
        motivo: v ? v.motivo : 'sem-rede',
        termos: v ? v.termos : null,
        estaticoTrechos: internos.selecionarFontesLocais(it.q, baseEstatica).length
      });
    }
  }
  salvarCache();

  console.log('Medição de FONTE · ' + linhas.length + ' itens · mesmos padrões de fato da régua\n');
  console.log('banco      estatico (hoje)'.padEnd(46) + 'vivo (Wikipédia, 2 termos)');
  for (const banco of Object.keys(bancos)) {
    const ls = linhas.filter((l) => l.banco === banco);
    if (!ls.length) continue;
    const cel = (m) => {
      const comFonte = ls.filter((l) => l[m]).length;
      const fatos = ls.reduce((s, l) => s + (l[m] ? l[m].ok : 0), 0);
      const total = ls.reduce((s, l) => s + (l[m] ? l[m].total : (l.estatico.total || 0)), 0);
      const cheios = ls.filter((l) => l[m] && l[m].ok === l[m].total).length;
      return comFonte + ' com fonte · ' + fatos + '/' + total + ' fatos · ' + cheios + ' itens completos';
    };
    console.log((banco + ' (' + ls.length + ')').padEnd(11) + cel('estatico').padEnd(35) + cel('vivo'));
  }
  const semFonte = linhas.filter((l) => !l.vivo && l.motivo !== 'rede');
  const falhaRede = linhas.filter((l) => l.motivo === 'rede');
  if (SEM_REDE) console.log('\n(sem rede: coluna vivo não medida)');
  console.log('\nItens em que a fonte viva cobriu TODOS os fatos:');
  for (const l of linhas.filter((x) => x.vivo && x.vivo.ok === x.vivo.total)) console.log('  ' + l.banco + ' #' + l.id + ' · ' + l.titulo);
  if (semFonte.length) {
    console.log('\nRecusados pelo gate (resultado não cobre 2 termos):');
    for (const l of semFonte) console.log('  ' + l.banco + ' #' + l.id + ' · termos ' + JSON.stringify(l.termos) + ' · ' + l.q.slice(0, 58));
  }
  if (falhaRede.length) {
    console.log('\nNÃO medidos por falha de rede (não contam como recusa): ' + falhaRede.length);
    for (const l of falhaRede) console.log('  ' + l.banco + ' #' + l.id);
  }
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
