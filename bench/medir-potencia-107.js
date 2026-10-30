// Janela de maior poder: cada item medido 2 vezes nos dois lados (36 itens × 2 × 2 = 144
// respostas), ordem contrabalanceada por hash e cooldown compartilhado entre os lados.
//
// Por que mais poder: as duas janelas anteriores deram +1 e o ruído do instrumento é de 3 pontos.
// Com 2 repetições por item é possível olhar o par item a item e separar efeito de sorte.
//
// Uso:
//   CANDIDATO_MED=candidato-cadeia-107.js SAIDA_POTENCIA=resultado-cadeia-107.json node bench/medir-potencia-107.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avaliar } = require('./avaliar-aberto');

const raiz = path.resolve(__dirname, '..');
const arquivos = {
  controle: path.join(__dirname, process.env.CONTROLE_MED || 'controle-sem-fonte-viva-106.js'),
  candidato: process.env.CANDIDATO_MED
    ? path.join(__dirname, process.env.CANDIDATO_MED) : path.join(raiz, 'roteador-ia.js'),
  original: path.join(__dirname, 'banco-aberto-antes-100.json'),
  holdout: path.join(__dirname, 'banco-aberto-holdout-100.json'),
  novo: path.join(__dirname, 'banco-aberto-novo-102.json'),
  rubrica: path.join(__dirname, 'avaliar-aberto.js'),
  medidor: __filename
};
const SEED = 'potencia-107-20261029';
const REPETICOES = 2;
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const ordem = (v) => crypto.createHash('sha256').update(SEED + ':' + v).digest('hex');
const salvar = (nome, obj) => {
  const tmp = nome + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1) + '\n');
  fs.renameSync(tmp, nome);
};

(async () => {
  if (!process.env.SAIDA_POTENCIA) throw new Error('Defina SAIDA_POTENCIA.');
  const saida = path.resolve(__dirname, process.env.SAIDA_POTENCIA);
  const bancos = Object.fromEntries(['original', 'holdout', 'novo']
    .map((k) => [k, JSON.parse(fs.readFileSync(arquivos[k], 'utf8'))]));

  const agenda = [];
  for (const grupo of ['original', 'holdout', 'novo']) {
    for (const it of bancos[grupo]) {
      for (let r = 0; r < REPETICOES; r++) {
        const primeiro = ordem('par:' + grupo + ':' + it.id + ':' + r) > '8' ? 'A' : 'B';
        agenda.push({ grupo, id: it.id, repeticao: r, versao: primeiro });
        agenda.push({ grupo, id: it.id, repeticao: r, versao: primeiro === 'A' ? 'B' : 'A' });
      }
    }
  }
  agenda.sort((a, b) => ordem('ord:' + a.grupo + ':' + a.id + ':' + a.repeticao + ':' + a.versao)
    .localeCompare(ordem('ord:' + b.grupo + ':' + b.id + ':' + b.repeticao + ':' + b.versao)));

  const hashes = Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, sha(v)]));
  const chave = (x) => [x.grupo, x.id, x.repeticao, x.versao].join(':');
  let res = [];
  const meta = {
    iniciado: new Date().toISOString(), terminado: null, seed: SEED, hashes, repeticoes: REPETICOES,
    versoes: { A: path.basename(arquivos.controle), B: path.basename(arquivos.candidato) },
    observacao: 'janela de maior poder: 36 itens × 2 repetições por lado'
  };
  if (fs.existsSync(saida)) {
    if (process.env.RETOMAR_POTENCIA !== '1') throw new Error('Saída existe; use RETOMAR_POTENCIA=1');
    const velho = JSON.parse(fs.readFileSync(saida, 'utf8'));
    if (velho.meta.seed !== SEED || JSON.stringify(velho.meta.hashes) !== JSON.stringify(hashes))
      throw new Error('Código mudou; retomada recusada.');
    res = velho.res || [];
    meta.iniciado = velho.meta.iniciado;
  }
  const registrar = (final) => {
    if (final) meta.terminado = new Date().toISOString();
    salvar(saida, { meta, agenda, res, completo: res.length === agenda.length });
  };
  registrar(false);

  const A = require(arquivos.controle).Roteador;
  const B = require(arquivos.candidato).Roteador;
  const roteadores = { A: new A(), B: new B() };
  const cooldown = {}, proximas = {};
  for (const r of Object.values(roteadores)) {
    r.cooldownsRate = cooldown;
    r.proximaChamada = proximas;
    r._cacheGet = () => null;
    r._cacheSet = () => {};
  }
  const medidos = new Set(res.map(chave));
  for (const passo of agenda) {
    if (medidos.has(chave(passo))) continue;
    const it = bancos[passo.grupo].find((x) => x.id === passo.id);
    const t0 = Date.now();
    let o;
    try { o = await roteadores[passo.versao].responder({ pergunta: it.q, tipo: 'aberto' }); }
    catch (e) { o = { texto: null, erro: String((e && e.message) || e).slice(0, 200) }; }
    const av = avaliar(o && o.texto, it);
    res.push({
      ...passo, q: it.q, ok: av.ok, falhas: av.falhas, palavras: av.palavras,
      paragrafos: av.paragrafos, ms: Date.now() - t0, rota: (o && o.rota) || null,
      erro: (o && o.erro) || null, texto: String((o && o.texto) || '')
    });
    medidos.add(chave(passo));
    registrar(false);
    console.log((av.ok ? '✔' : '✘') + ' ' + passo.grupo + ' #' + passo.id + ' r' + passo.repeticao + ' ' +
      passo.versao + ' ' + av.palavras + 'p ' + (Date.now() - t0) + 'ms ' +
      (av.ok ? '' : av.falhas.join(' · ')) + ' [' + res.length + '/' + agenda.length + ']');
  }
  registrar(true);
  console.log('Arquivo: ' + saida);
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
