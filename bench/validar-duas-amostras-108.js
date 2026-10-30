// Validação focada do código PUBLICADO (não da cópia de medição) nos casos em que a amostra única
// falhou na janela de maior poder. A cópia medida pede sempre duas amostras; o produto pula a
// segunda quando a primeira já está completa — então o número dela é um teto, e é preciso conferir
// o comportamento real nos casos que importam.
//
// Uso: node bench/validar-duas-amostras-108.js [--repeticoes=2]
'use strict';
const fs = require('fs');
const path = require('path');
const { Roteador } = require('../roteador-ia');
const { avaliar } = require('./avaliar-aberto');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? Number(a.split('=')[1]) : d; };
const REP = arg('repeticoes', 2);
const janela = JSON.parse(fs.readFileSync(path.join(__dirname, 'resultado-duas-amostras-108.json'), 'utf8'));

const bancos = {
  original: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-novo-102.json'), 'utf8'))
};

// itens em que a amostra única falhou (lado A) na janela
const falhos = [];
for (const r of janela.res) {
  if (r.versao !== 'A' || r.ok) continue;
  const chave = r.grupo + ':' + r.id;
  if (!falhos.some((f) => f.chave === chave)) {
    falhos.push({ chave, grupo: r.grupo, id: r.id, falhasA: r.falhas,
      it: bancos[r.grupo].find((x) => x.id === r.id) });
  }
}

(async () => {
  const r = new Roteador({ amostrasAberto: 2 });
  r._cacheGet = () => null;
  r._cacheSet = () => {};
  console.log('Validação do código publicado em ' + falhos.length + ' itens que falharam com amostra única' +
    ' · ' + REP + ' repetições\n');
  let passou = 0, total = 0;
  for (const f of falhos) {
    const linhas = [];
    for (let i = 0; i < REP; i++) {
      let o;
      try { o = await r.responder({ pergunta: f.it.q, tipo: 'aberto' }); }
      catch (e) { o = { texto: '', erro: e.message }; }
      const av = avaliar(o && o.texto, f.it);
      total++;
      if (av.ok) passou++;
      linhas.push((av.ok ? 'ok' : 'FALHA ' + av.falhas.join('; ')) + ' [amostras ' + (o && o.amostras) +
        (o && o.daSegunda ? ', veio da 2ª' : '') + ']');
    }
    console.log(f.chave + ' · falhava por: ' + f.falhasA.join('; '));
    for (const l of linhas) console.log('   ' + l);
  }
  console.log('\npassou ' + passou + '/' + total + ' (' + Math.round(1000 * passou / total) / 10 + '%)' +
    ' nos casos que antes falhavam');
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
