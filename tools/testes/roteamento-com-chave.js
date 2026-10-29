// Contratos offline das correções da rodada 103:
//  1. rota que exige chave só existe quando a chave existe (inativa é inofensiva);
//  2. quando existe, a chave vai no cabeçalho Authorization e em nenhum outro lugar;
//  3. timeout por rota encolhe a partir da latência medida (corta a espera de 25 s);
//  4. rota com 3 falhas seguidas vai para o fim da fila, mas continua alcançável;
//  5. sucesso zera a contagem de falhas seguidas.
// Não mede qualidade de resposta nem disponibilidade real de provedor.
'use strict';
const assert = require('assert');
const { Roteador, CATALOGO } = require('../../roteador-ia');
let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }

const catalogoMinimo = () => ([
  { id: 'comChave', nome: 'Rota com chave', base: 'https://api.groq.com/openai/v1', modelo: 'm', classe: 'forte', peso: 90, chaveLS: 'rebocl_chave_teste' },
  { id: 'semChave', nome: 'Rota sem chave', base: 'https://exemplo.invalid/v1', modelo: 'm2', classe: 'forte', peso: 50 }
]);

function respostaFalsa(texto) {
  return {
    ok: true, status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify({ choices: [{ message: { content: texto }, finish_reason: 'stop' }] })
  };
}

(async () => {
  // ---------- 1 e 2: chave ----------
  let visto = null;
  global.fetch = async (url, opcoes) => { visto = { url, headers: opcoes.headers }; return respostaFalsa('resposta válida do modelo'); };

  const semChave = new Roteador({ catalogo: catalogoMinimo(), lerChave: () => null });
  ok('rota com chave não fica disponível quando não há chave', () => {
    assert.equal(semChave.disponivel('comChave'), false);
    assert.equal(semChave.disponivel('semChave'), true);
  });
  {
    const antes = visto;
    const r = await semChave._chamar(catalogoMinimo()[0], 'oi', 5000);
    assert.equal(r.erro, 'sem_chave');
    assert.equal(visto, antes, 'não deveria ter feito requisição');
  }

  const comChave = new Roteador({ catalogo: catalogoMinimo(), lerChave: (s) => (s === 'rebocl_chave_teste' ? 'gsk_teste_123' : null) });
  ok('com chave presente a rota fica disponível', () => {
    assert.equal(comChave.disponivel('comChave'), true);
  });
  {
    const r = await comChave._chamar(catalogoMinimo()[0], 'oi', 5000);
    assert.equal(r.texto, 'resposta válida do modelo');
    assert.equal(visto.headers.Authorization, 'Bearer gsk_teste_123');
    assert.equal(visto.url, 'https://api.groq.com/openai/v1/chat/completions');
  }
  ok('a chave aparece só no cabeçalho Authorization, em nenhum outro', () => {
    const chaves = Object.keys(visto.headers).filter((k) => String(visto.headers[k]).includes('gsk_teste_123'));
    assert.deepEqual(chaves, ['Authorization']);
  });

  // ---------- 3: timeout adaptativo ----------
  ok('sem amostra de latência o timeout pedido é respeitado intacto', () => {
    const r = new Roteador({ catalogo: catalogoMinimo() });
    assert.equal(r._limiteRota(catalogoMinimo()[0], 25000), 25000);
  });
  ok('com latência medida o timeout encolhe para 2,5× a média, com piso de 6 s', () => {
    const r = new Roteador({ catalogo: catalogoMinimo() });
    r._premiar('comChave', 100);           // latMedia: 3000*0.7 + 100*0.3 = 2130
    r._premiar('comChave', 100);           // 1491 + 30 = 1521
    const limite = r._limiteRota(catalogoMinimo()[0], 25000);
    assert(limite >= 6000, 'respeita o piso: ' + limite);
    assert(limite < 25000, 'encolheu de fato: ' + limite);
  });
  ok('rota que já estourou o relógio 2× seguidas recebe janela ainda menor', () => {
    const r = new Roteador({ catalogo: catalogoMinimo() });
    r._premiar('comChave', 4000);          // latMedia 3000*0.7+4000*0.3 = 3300
    r._castigar('comChave', 'timeout'); r._castigar('comChave', 'timeout');
    const normal = new Roteador({ catalogo: catalogoMinimo() });
    normal._premiar('comChave', 4000);
    assert(r._limiteRota(catalogoMinimo()[0], 25000) < normal._limiteRota(catalogoMinimo()[0], 25000));
  });

  // ---------- 3b: falha também é evidência (defeito encontrado na rodada 104) ----------
  ok('rota COM histórico de sucesso não perde a janela por estourar o relógio', () => {
    // Regressão da rodada 104: cortar a janela de quem já respondeu abortou "lagunas" em 6 s
    // e produziu quatro respostas vazias (A 40/44 × B 33/44).
    const r = new Roteador({ catalogo: catalogoMinimo() });
    const rota = catalogoMinimo()[0];
    r._premiar('comChave', 9000);            // latMedia ~4800
    for (let i = 0; i < 4; i++) r._castigar('comChave', 'timeout');
    const limite = r._limiteRota(rota, 25000);
    assert(limite >= Math.round(r.saude.comChave.latMedia * 1.5), 'nunca abaixo de 1,5× a latência já observada: ' + limite);
    assert(limite > 6000, 'não cai para o piso de uma rota que já entregou');
  });
  ok('rota que só estoura o relógio tem a janela cortada pela metade a cada estouro', () => {
    const r = new Roteador({ catalogo: catalogoMinimo() });
    const rota = catalogoMinimo()[0];
    assert.equal(r._limiteRota(rota, 25000), 25000, 'sem evidência: pedido intacto');
    r._castigar('comChave', 'timeout');
    assert.equal(r._limiteRota(rota, 25000), 12500, '1 estouro: metade');
    r._castigar('comChave', 'timeout');
    assert.equal(r._limiteRota(rota, 25000), 6250, '2 estouros: um quarto');
    r._castigar('comChave', 'timeout');
    assert.equal(r._limiteRota(rota, 25000), 6000, '3 estouros: piso de 6 s');
    r._castigar('comChave', 'timeout');
    assert.equal(r._limiteRota(rota, 25000), 6000, 'não desce abaixo do piso');
  });
  ok('um sucesso depois dos estouros devolve folga à janela', () => {
    const r = new Roteador({ catalogo: catalogoMinimo() });
    const rota = catalogoMinimo()[0];
    r._castigar('comChave', 'timeout'); r._castigar('comChave', 'timeout');
    assert.equal(r._limiteRota(rota, 25000), 6250);
    r._premiar('comChave', 1500);
    assert.equal(r.saude.comChave.timeoutsSeguidos, 0, 'sucesso zera timeouts seguidos');
    assert(r._limiteRota(rota, 25000) > 6250, 'janela volta a crescer com evidência de sucesso');
  });
  ok('disjuntor só alcança rota que nunca respondeu, e com 6 falhas seguidas', () => {
    const cat = [{ id: 'z', nome: 'Z', base: 'https://z.invalid/v1', modelo: 'z', classe: 'forte', peso: 100 }];
    const r = new Roteador({ catalogo: cat });
    // Toda falha já aplica o descanso curto normal (8–12 s, comportamento anterior à 103).
    // O disjuntor é o descanso LONGO: 30 s, e só para quem nunca respondeu.
    for (let i = 0; i < 5; i++) r._castigar('z', 'servidor');
    const curto = r.saude.z.cooldownAte - Date.now();
    assert(curto <= 15000, 'com 5 falhas, só o descanso curto normal: ' + curto + ' ms');
    r._castigar('z', 'servidor');
    const longo = r.saude.z.cooldownAte - Date.now();
    assert(longo > 25000, 'com 6 falhas sem nenhum sucesso: descanso longo: ' + longo + ' ms');
    assert.equal(r.saude.z.morta, false, 'não foi morta');
  });
  ok('rota que já respondeu nunca entra no disjuntor', () => {
    const cat = [{ id: 'z', nome: 'Z', base: 'https://z.invalid/v1', modelo: 'z', classe: 'forte', peso: 100 }];
    const r = new Roteador({ catalogo: cat });
    r._premiar('z', 800);
    for (let i = 0; i < 8; i++) r._castigar('z', 'servidor');
    assert(r.saude.z.latAmostras > 0, 'tem histórico de sucesso');
    assert.equal(r.saude.z.morta, false, 'não é morta');
    const espera = r.saude.z.cooldownAte - Date.now();
    assert(espera <= 15000, 'só o descanso curto, nunca o longo do disjuntor: ' + espera + ' ms');
  });
  ok('cota (rate) não é tratada como falha de saúde para o disjuntor', () => {
    const cat = [{ id: 'z', nome: 'Z', base: 'https://z.invalid/v1', modelo: 'z', classe: 'forte', peso: 100 }];
    const r = new Roteador({ catalogo: cat });
    for (let i = 0; i < 5; i++) r._castigar('z', 'rate', 1);
    assert.equal(r.saude.z.falhasSeguidas, 5);
    assert.equal(r.saude.z.morta, false);
    assert(r.saude.z.cooldownAte > 0, 'rate aplica o próprio cooldown, não o disjuntor');
  });

  // ---------- 4 e 5: fila por evidência ----------
  ok('três falhas seguidas mandam a rota para o fim da própria classe', () => {
    const cat = [
      { id: 'pesoAlto', nome: 'A', base: 'https://a.invalid/v1', modelo: 'a', classe: 'forte', peso: 100 },
      { id: 'pesoBaixo', nome: 'B', base: 'https://b.invalid/v1', modelo: 'b', classe: 'forte', peso: 10 }
    ];
    const r = new Roteador({ catalogo: cat });
    assert.equal(r._candidatos('forte')[0].id, 'pesoAlto');
    r._castigar('pesoAlto', 'servidor'); r._castigar('pesoAlto', 'servidor'); r._castigar('pesoAlto', 'servidor');
    assert.equal(r._candidatos('forte')[0].id, 'pesoBaixo', 'quebrada foi para trás');
    assert(r._candidatos('forte').some((x) => x.id === 'pesoAlto'), 'mas continua alcançável como último recurso');
  });
  ok('duas falhas ainda não rebaixam a rota', () => {
    const cat = [{ id: 'x', nome: 'X', base: 'https://x.invalid/v1', modelo: 'x', classe: 'forte', peso: 100 },
                 { id: 'y', nome: 'Y', base: 'https://y.invalid/v1', modelo: 'y', classe: 'forte', peso: 10 }];
    const r = new Roteador({ catalogo: cat });
    r._castigar('x', 'servidor'); r._castigar('x', 'servidor');
    assert.equal(r._candidatos('forte')[0].id, 'x');
  });
  ok('um sucesso zera as falhas seguidas', () => {
    const cat = [{ id: 'x', nome: 'X', base: 'https://x.invalid/v1', modelo: 'x', classe: 'forte', peso: 100 },
                 { id: 'y', nome: 'Y', base: 'https://y.invalid/v1', modelo: 'y', classe: 'forte', peso: 10 }];
    const r = new Roteador({ catalogo: cat });
    r._castigar('x', 'servidor'); r._castigar('x', 'servidor'); r._castigar('x', 'servidor');
    r._premiar('x', 900);
    assert.equal(r.saude.x.falhasSeguidas, 0);
    assert.equal(r._candidatos('forte')[0].id, 'x');
  });

  // ---------- catálogo publicado ----------
  ok('a rota Groq está no catálogo e nasce inativa (sem chave no repositório)', () => {
    const r = new Roteador({ catalogo: CATALOGO, lerChave: () => null });
    const groq = r.catalogo.find((x) => x.id === 'groq');
    assert(groq, 'rota groq presente');
    assert.equal(groq.base, 'https://api.groq.com/openai/v1');
    assert.equal(groq.chaveLS, 'rebocl_chave_groq');
    assert.equal(r.disponivel('groq'), false, 'sem chave não pode estar disponível');
    assert(!JSON.stringify(CATALOGO).match(/gsk_[A-Za-z0-9]/), 'nenhuma chave embutida no catálogo');
  });

  console.log('\n' + n + ' contratos de roteamento com chave passaram');
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
