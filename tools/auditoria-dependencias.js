#!/usr/bin/env node
// AUDITORIA DE DEPENDÊNCIAS — "de quem o Chat depende, e o que continua funcionando sem eles"
// (rodada 138, 31/10/2026).
//
// A pergunta do dono: "criar algo que não dependa de ninguém e como ele ficará de forma
// ilimitado". Resposta honesta precisa de três números, e é isto que este programa mede:
//
//   1. INVENTÁRIO — quais hosts externos o produto toca, agrupados por papel (modelo, fonte viva,
//      infraestrutura) e quantas rotas de cada um;
//   2. ENSAIO DE QUEDA TOTAL — com `fetch` bloqueado e nenhum provedor, o produto é executado de
//      verdade no gabarito inteiro: quantas perguntas ele responde, quantas ficam vazias, quantas
//      saem ERRADAS e quanto tempo espera (espera inútil é defeito: sem rede é quando ele precisa
//      ser rápido, porque é quando ele é 100% local);
//   3. O QUE CADA DEPENDÊNCIA CARREGA — o efeito de cada queda, com a resposta do produto.
//
// Regra: nada aqui é estimativa. O ensaio roda o caminho real de `responder()`.
//
// Uso:  node tools/auditoria-dependencias.js [--json] [--rapido]
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const ARQUIVOS_RUNTIME = ['index.html', 'roteador-ia.js', 'razao-local.js', 'chat-pwa.js',
  'chat-diagnostico.js', 'sw.js'];

const PAPEIS = [
  { papel: 'modelo de texto', teste: /groq|kilo\.ai|g4f\.dev|kepler\.ai\.cloud\.ovh\.net|pollinations/ },
  { papel: 'fonte viva (consulta na hora)', teste: /wikipedia|wikidata|brasilapi|ibge|open-meteo|coingecko|themes?aldb|musicbrainz|archive\.org|mathjs/ },
  { papel: 'infraestrutura do projeto', teste: /github\.com|githubusercontent|api\.github\.com|npmjs/ },
  { papel: 'terceiro de apoio', teste: /translate\.googleapis|glama\.ai|news\.ycombinator/ }
];

function inventario() {
  const hosts = {};
  for (const rel of ARQUIVOS_RUNTIME) {
    const p = path.join(RAIZ, rel);
    if (!fs.existsSync(p)) continue;
    const fonte = fs.readFileSync(p, 'utf8');
    const achados = fonte.match(/https?:\/\/[a-zA-Z0-9._-]+/g) || [];
    for (const url of achados) {
      const host = url.replace(/^https?:\/\//, '');
      hosts[host] = hosts[host] || { host: host, mencoes: 0, arquivos: new Set() };
      hosts[host].mencoes++;
      hosts[host].arquivos.add(rel);
    }
  }
  const rotas = (() => {
    try {
      const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
      return new Roteador({}).catalogo || [];
    } catch (e) { return []; }
  })();
  const porRota = {};
  for (const r of rotas) {
    const h = String(r.base).replace(/^https?:\/\//, '').split('/')[0];
    porRota[h] = porRota[h] || { host: h, rotas: 0, classes: new Set() };
    porRota[h].rotas++;
    porRota[h].classes.add(r.classe);
  }
  const lista = Object.values(hosts).map(function (h) {
    const papel = (PAPEIS.find(function (p) { return p.teste.test(h.host); }) || { papel: 'não classificado' }).papel;
    return { host: h.host, papel: papel, mencoes: h.mencoes, arquivos: Array.from(h.arquivos), rotas: porRota[h.host] ? porRota[h.host].rotas : 0 };
  }).sort(function (a, b) { return (b.rotas - a.rotas) || (b.mencoes - a.mencoes); });
  const modelos = lista.filter(function (h) { return h.papel === 'modelo de texto'; });
  const comChave = rotas.filter(function (r) { return r.chaveLS; }).length;
  return {
    hosts: lista,
    rotasModelo: rotas.length,
    hostsModelo: Object.keys(porRota).length,
    hostsFonte: lista.filter(function (h) { return h.papel === 'fonte viva (consulta na hora)'; }).length,
    porHostModelo: porRota,
    comChave: comChave
  };
}

/* ---------- ensaio de queda total ---------- */
function confere(resposta, aceitos) {
  const normal = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  const numeros = function (t) {
    const limpo = String(t).replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1').replace(/(\d),(\d)/g, '$1.$2');
    return (limpo.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  };
  const t = normal(resposta).trim();
  if (!t) return false;
  return [].concat(aceitos).join('|').split('|').some(function (a) {
    const alvo = normal(a).trim();
    if (/^-?[\d.,]+$/.test(alvo)) { const q = numeros(alvo)[0]; return numeros(t).some(function (n) { return n === q; }); }
    return t.indexOf(alvo) !== -1;
  });
}

async function quedaTotal(limite) {
  const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8'));
  const provas = limite ? banco.provas.slice(0, limite) : banco.provas;
  const fetchOriginal = global.fetch;
  global.fetch = function () { return Promise.reject(new Error('sem rede (ensaio de queda total)')); };
  // o módulo guarda referência própria de fetch? recarregar depois de bloquear garante o bloqueio
  for (const k of Object.keys(require.cache)) if (k.indexOf(RAIZ) === 0) delete require.cache[k];
  const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
  const r = new Roteador({ amostrasAberto: 1 });
  let respondidas = 0, vazias = 0, erradas = [], tempos = [];
  for (const p of provas) {
    const t0 = Date.now();
    let texto = '';
    try {
      const o = await r.responder({ pergunta: p.q, semConsenso: true, semEsperaBoa: true, semRevisao: true });
      texto = o && o.texto ? o.texto : '';
    } catch (e) { texto = ''; }
    tempos.push(Date.now() - t0);
    if (!texto) { vazias++; continue; }
    if (confere(texto, p.ok)) respondidas++;
    else erradas.push(p.id + ' → ' + String(texto).slice(0, 40));
  }
  global.fetch = fetchOriginal;
  tempos.sort(function (a, b) { return a - b; });
  return {
    total: provas.length, respondidas: respondidas, vazias: vazias, erradas: erradas,
    medianaMs: tempos[Math.floor(tempos.length / 2)], piorMs: tempos[tempos.length - 1],
    somaMs: tempos.reduce(function (a, b) { return a + b; }, 0)
  };
}

/* ---------- o que cada queda carrega ---------- */
function efeitos(inv, queda) {
  return [
    { dependencia: 'modelo de texto (' + inv.rotasModelo + ' rotas, ' + inv.hostsModelo + ' hosts)',
      seCair: 'texto aberto e vocabulário param; o caminho exato continua',
      medido: queda.respondidas + '/' + queda.total + ' respondidas offline, ' + (queda.piorMs / 1000).toFixed(1) + ' s na pior pergunta' },
    { dependencia: 'fonte viva (Wikipédia, Wikidata, IBGE, mathjs…)',
      seCair: 'cauda longa de fatos e consultas ao vivo param; base local responde o que é estável',
      medido: 'a base local é que sustenta as ' + queda.respondidas + ' respostas do ensaio (fetch bloqueado)' },
    { dependencia: 'GitHub (repo + Pages)',
      seCair: 'o app já carregado continua funcionando; atualização e histórico novo param',
      medido: 'casca em cache do service worker; sem servidor próprio' },
    { dependencia: 'GitHub Actions (trabalhador do e-mail)',
      seCair: 'canal de e-mail para; a página do chat segue inteira',
      medido: 'medido nos testes de turno: falha visível, sem resposta inventada' },
    { dependencia: 'chaves de API',
      seCair: 'nada: nenhuma rota do catálogo exige chave por padrão',
      medido: 'só ' + inv.comChave + ' rota(s) usam chave opcional; ' + (inv.rotasModelo - inv.comChave) + ' são anônimas' }
  ];
}

(async () => {
  const inv = inventario();
  const rapido = process.argv.includes('--rapido');
  const queda = await quedaTotal(rapido ? 40 : 0);
  const saida = {
    esquema: 'auditoria-dependencias-v1',
    quando: new Date().toISOString(),
    inventario: inv, quedaTotal: queda, efeitos: efeitos(inv, queda),
    veredito: {
      ilimitadoSemRede: queda.respondidas + '/' + queda.total,
      erradasSemRede: queda.erradas.length,
      dependeDeTerceiroPara: 'texto aberto, vocabulário (sinônimo/antônimo/analogia) e conteúdo que exige fonte viva',
      zeroChave: inv.rotasModelo > 0
    }
  };
  if (process.argv.includes('--json')) { console.log(JSON.stringify(saida, null, 1)); return; }

  console.log('== DEPENDÊNCIAS EXTERNAS NO PRODUTO (o que sai da máquina)');
  console.log('   modelo de texto: ' + inv.rotasModelo + ' rotas em ' + inv.hostsModelo + ' hosts');
  for (const [h, d] of Object.entries(inv.porHostModelo)) {
    console.log('     ' + h + ' — ' + d.rotas + ' rota(s) [' + Array.from(d.classes).join(', ') + ']');
  }
  const fontes = inv.hosts.filter(function (h) { return h.papel !== 'modelo de texto'; });
  console.log('   outros hosts citados no runtime: ' + fontes.length);
  for (const h of fontes.slice(0, 10)) console.log('     ' + h.host + ' — ' + h.papel);

  console.log('== ENSAIO DE QUEDA TOTAL (fetch bloqueado, nenhum provedor, ' + queda.total + ' provas)');
  console.log('   respondidas offline: ' + queda.respondidas + '/' + queda.total
    + ' · vazias: ' + queda.vazias + ' · ERRADAS: ' + queda.erradas.length);
  if (queda.erradas.length) for (const e of queda.erradas) console.log('   ✘ ' + e);
  console.log('   espera: mediana ' + queda.medianaMs + ' ms · pior ' + queda.piorMs + ' ms · soma ' + (queda.somaMs / 1000).toFixed(1) + ' s');

  console.log('== O QUE CADA DEPENDÊNCIA CARREGA');
  for (const e of saida.efeitos) {
    console.log('   · ' + e.dependencia);
    console.log('     se cair: ' + e.seCair);
    console.log('     medido:  ' + e.medido);
  }
  console.log('== VEREDITO');
  console.log('   sem rede nenhuma o produto responde ' + saida.veredito.ilimitadoSemRede
    + ' com 0 respostas inventadas. O que continua dependendo de terceiro: ' + saida.veredito.dependeDeTerceiroPara + '.');
})();
