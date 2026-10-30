// Comparação pareada: o MESMO código com a busca viva desligada (A) e ligada (B).
// A única variável é a fonte viva — mesma régua, mesmos bancos, mesma ordem, mesmo prazo.
//
// Uso:
//   CHAT_FONTE_VIVA=1 SAIDA_FONTE_VIVA=resultado-fonte-viva-106.json node bench/medir-fonte-viva-pareado.js
//
// Retomável com RETOMAR_FONTE_VIVA=1 (o arquivo de saída guarda o progresso a cada item).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avaliar } = require('./avaliar-aberto');
const { construirAgenda, resumo } = require('./medir-pareado-102');

const raiz = path.resolve(__dirname, '..');
const arquivos = {
  // As duas cópias podem ser trocadas por variável de ambiente: é assim que a mesma máquina de
  // medição serve para mais de um experimento sem virar código novo.
  controle: path.join(__dirname, process.env.CONTROLE_MED || 'controle-sem-fonte-viva-106.js'),
  candidato: process.env.CANDIDATO_MED
    ? path.join(__dirname, process.env.CANDIDATO_MED) : path.join(raiz, 'roteador-ia.js'),
  original: path.join(__dirname, 'banco-aberto-antes-100.json'),
  holdout: path.join(__dirname, 'banco-aberto-holdout-100.json'),
  novo: path.join(__dirname, 'banco-aberto-novo-102.json'),
  rubrica: path.join(__dirname, 'avaliar-aberto.js'),
  medidor: __filename
};
const SEED = 'fonte-viva-106-20261029';
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const salvar = (nome, obj) => {
  const tmp = nome + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1) + '\n');
  fs.renameSync(tmp, nome);
};

(async () => {
  if (!process.env.SAIDA_FONTE_VIVA) throw new Error('Defina SAIDA_FONTE_VIVA para não sobrescrever resultado anterior.');
  if (process.env.CHAT_FONTE_VIVA !== '1' && !process.env.CANDIDATO_MED)
    throw new Error('Defina CHAT_FONTE_VIVA=1 (busca viva) ou CANDIDATO_MED (outro candidato).');
  const saida = path.resolve(__dirname, process.env.SAIDA_FONTE_VIVA || 'resultado-fonte-viva-106.json');
  const bancos = Object.fromEntries(['original', 'holdout', 'novo']
    .map((k) => [k, JSON.parse(fs.readFileSync(arquivos[k], 'utf8'))]));
  const agenda = construirAgenda(bancos);
  const hashes = Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, sha(v)]));
  const chave = (x) => [x.grupo, x.id, x.repeticao, x.versao].join(':');

  let res = [];
  const meta = {
    iniciado: new Date().toISOString(), terminado: null, seed: SEED, hashes,
    versoes: { A: 'main@7ecf249 com busca viva desligada', B: 'main@7ecf249 com busca viva ligada' },
    variavel: 'apenas a busca viva (Wikipédia) com portão de casamento', node: process.version,
    observacao: 'mesma régua e mesmos bancos da rodada 105; este experimento mede a RESPOSTA, não a fonte'
  };
  if (fs.existsSync(saida)) {
    if (process.env.RETOMAR_FONTE_VIVA !== '1') throw new Error('Saída existe; use RETOMAR_FONTE_VIVA=1');
    const velho = JSON.parse(fs.readFileSync(saida, 'utf8'));
    if (velho.meta.seed !== SEED || JSON.stringify(velho.meta.hashes) !== JSON.stringify(hashes))
      throw new Error('Código mudou; retomada recusada.');
    res = velho.res || [];
    meta.iniciado = velho.meta.iniciado;
    meta.retomadas = (velho.meta.retomadas || 0) + 1;
  }
  const registrar = (final) => {
    if (final) meta.terminado = new Date().toISOString();
    salvar(saida, { meta, agenda, res, sum: resumo(res, agenda), completo: res.length === agenda.length });
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
    const linha = {
      ...passo, q: it.q, ok: av.ok, falhas: av.falhas, palavras: av.palavras,
      paragrafos: av.paragrafos, itens: av.itens, ms: Date.now() - t0,
      rota: (o && o.rota) || null, erro: (o && o.erro) || null,
      incompleto: !!(o && o.incompleto), avisoFormato: (o && o.avisoFormato) || null,
      fontesConsultadas: (o && o.fontesConsultadas) || [],
      chamadas: (o && o.chamadas) || 0, texto: String((o && o.texto) || '')
    };
    res.push(linha);
    medidos.add(chave(passo));
    registrar(false);
    console.log((linha.ok ? '✔' : '✘') + ' ' + passo.grupo + ' #' + passo.id + ' r' + passo.repeticao + ' ' +
      passo.versao + ' ' + linha.palavras + 'p ' + linha.ms + 'ms ' +
      (linha.fontesConsultadas.length ? '[fonte] ' : '') +
      (linha.ok ? '' : linha.falhas.join(' · ')) + ' [' + res.length + '/' + agenda.length + ']');
  }
  registrar(true);
  console.log('\n' + JSON.stringify(resumo(res, agenda), null, 2));
  console.log('Arquivo: ' + saida);
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
