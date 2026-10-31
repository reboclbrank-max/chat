// ESPERA PELA ROTA BOA (31/10/2026).
//
// Defeito medido na bateria da casa: numa rajada, as rotas fortes entram em 429 e o roteador
// descia na hora para o modelo leve que ainda estava livre. O fácil caiu de 29/29 para 20/29 e o
// difícil para 12/18 no meio da rajada — e voltou ao normal só com o pool em descanso.
// Conserto: se a melhor classe está em descanso CURTO, espera ela voltar (dentro do orçamento),
// em vez de responder com modelo fraco. Este teste usa relógio real curto (1,2 s) e dublê de
// `_chamar`: nenhuma chamada sai para a rede.
'use strict';
const path = require('path');
const assert = require('assert');
const { Roteador } = require(path.resolve(__dirname, '..', '..', 'roteador-ia.js'));

let certos = 0;
const falhas = [];
async function testa(nome, fn) {
  try { await fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}

function comDuble() {
  const r = new Roteador({ amostrasAberto: 1, ferramentasLigadas: true });
  r.chamadas = [];
  r._chamar = async function (rota) {
    r.chamadas.push(rota.id);
    return { texto: 'resposta de ' + rota.id, ms: 5 };
  };
  return r;
}
const FORTES = (r) => r.catalogo.filter((x) => x.classe === 'forte' && (!x.chaveLS || r.lerChave(x.chaveLS)));

(async () => {
  console.log('== 1. espera a rota forte voltar em vez de descer de classe');
  await testa('forte em 429 curto e só resta modelo fraco → espera e responde na forte', async () => {
    const r = comDuble();
    const fortes = FORTES(r);
    assert(fortes.length >= 1, 'o catálogo precisa de ao menos uma rota forte utilizável');
    for (const f of fortes) r.saude[f.id].cooldownAte = Date.now() + 1200;
    // a regra medida: esperar SÓ quando a alternativa livre é fraca; médias vão para descanso também
    for (const x of r.catalogo) if (x.classe === 'media') r.saude[x.id].cooldownAte = Date.now() + 1200;
    const t0 = Date.now();
    const o = await r.responder({ pergunta: 'explique o que é fotossíntese', tipo: 'curto', semConsenso: true, semFerramenta: true });
    const dur = Date.now() - t0;
    const classe = (r.catalogo.find((x) => x.id === o.rota) || {}).classe;
    assert.equal(classe, 'forte', 'respondeu em rota ' + o.rota + ' (' + classe + ') em vez de esperar a forte');
    assert(dur >= 1000, 'não esperou o descanso: ' + dur + ' ms');
    assert.equal(r.metricas.esperasBoa, 1);
  });

  await testa('com rota MÉDIA livre, responde na média agora (não gasta espera)', async () => {
    const r = comDuble();
    for (const f of FORTES(r)) r.saude[f.id].cooldownAte = Date.now() + 1200;
    const t0 = Date.now();
    const o = await r.responder({ pergunta: 'explique o que é fotossíntese', tipo: 'curto', semConsenso: true, semFerramenta: true });
    const classe = (r.catalogo.find((x) => x.id === o.rota) || {}).classe;
    assert.notEqual(classe, 'leve', 'desceu para modelo fraco tendo média livre');
    assert(Date.now() - t0 < 1000, 'esperou tendo alternativa média livre');
  });

  await testa('teto de 3 s: descanso de 5 s não segura a resposta', async () => {
    // Antes o teto era 15 s e a pessoa esperava por isso. Agora, acima de 3 s, responde com o que há.
    const r = comDuble();
    for (const f of FORTES(r)) r.saude[f.id].cooldownAte = Date.now() + 5000;
    for (const x of r.catalogo) if (x.classe === 'media') r.saude[x.id].cooldownAte = Date.now() + 5000;
    const t0 = Date.now();
    await r.responder({ pergunta: 'explique o que é fotossíntese', tipo: 'curto', semConsenso: true, semFerramenta: true });
    const dur = Date.now() - t0;
    assert(dur < 3000, 'segurou ' + dur + ' ms por um descanso de 5 s');
    assert.equal(r.metricas.esperasBoa || 0, 0);
  });

  await testa('descanso LONGO não vira espera (responder rápido é melhor)', async () => {
    const r = comDuble();
    for (const f of FORTES(r)) r.saude[f.id].cooldownAte = Date.now() + 60000;
    const t0 = Date.now();
    await r.responder({ pergunta: 'explique o que é fotossíntese', tipo: 'curto', semConsenso: true, semFerramenta: true });
    const dur = Date.now() - t0;
    assert(dur < 3000, 'esperou demais por um descanso longo: ' + dur + ' ms');
    assert.equal(r.metricas.esperasBoa || 0, 0);
  });

  await testa('rota forte livre → não espera nada', async () => {
    const r = comDuble();
    const t0 = Date.now();
    const o = await r.responder({ pergunta: 'explique o que é fotossíntese', tipo: 'curto', semConsenso: true, semFerramenta: true });
    assert(Date.now() - t0 < 1000, 'esperou sem motivo');
    assert.equal((r.catalogo.find((x) => x.id === o.rota) || {}).classe, 'forte');
  });

  await testa('semEsperaBoa desliga a espera (usado nos testes e no modo offline)', async () => {
    const r = comDuble();
    for (const f of FORTES(r)) r.saude[f.id].cooldownAte = Date.now() + 1200;
    const t0 = Date.now();
    await r.responder({ pergunta: 'explique o que é fotossíntese', tipo: 'curto', semConsenso: true, semFerramenta: true, semEsperaBoa: true });
    assert(Date.now() - t0 < 1000, 'esperou mesmo com semEsperaBoa');
    assert.equal(r.metricas.esperasBoa || 0, 0);
  });

  console.log('');
  if (falhas.length) { console.error('✘ ' + (falhas.length) + ' de ' + (certos + falhas.length) + ' verificações FALHARAM'); process.exit(1); }
  console.log('✔ ' + certos + '/' + (certos + falhas.length) + ' verificações de espera pela rota boa passaram');
})();
