// RECOMEÇO, RESGATE e MEMÓRIA DE CONVERSA (31/10/2026).
//
// Três falhas medidas na auditoria de QI da casa, cada uma com o seu tamanho:
//   • ECO de instrução ....... 1 em 18 respostas devolveu a própria ordem recebida;
//   • VAZIO .................. 2 em 8 chamadas voltaram sem texto com 3 perguntas correndo juntas;
//   • MEMÓRIA ................ a página respondia como se nunca tivesse falado com o dono.
//
// Este teste é offline: substitui `_chamar` por um dublê e executa o caminho real do produto.
'use strict';
const path = require('path');
const assert = require('assert');
const { Roteador, internos } = require(path.resolve(__dirname, '..', '..', 'roteador-ia.js'));

let certos = 0;
const falhas = [];
async function testa(nome, fn) {
  try { await fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}
function comDuble(fn, opcoes) {
  const r = new Roteador(Object.assign({ ferramentasLigadas: true, amostrasAberto: 1 }, opcoes || {}));
  r._chamar = fn;
  return r;
}
const ECO = 'Não escreva raciocínio, preâmbulo, passos de pensamento nem repita a pergunta';
const PERGUNTA = 'explique o que é fotossíntese';

(async () => {
  console.log('== 1. ECO: a ordem recebida não vira resposta');
  await testa('o eco é reconhecido por texto, sem modelo', async () => {
    assert.equal(internos.detectarEco(ECO, PERGUNTA), true);
    assert.equal(internos.detectarEco('A fotossíntese converte luz em energia química.', PERGUNTA), false);
    assert.equal(internos.detectarEco(PERGUNTA, PERGUNTA), true);
    assert.equal(internos.detectarEco('', PERGUNTA), false);
  });
  await testa('eco PARCIAL é reconhecido: pedaço da pergunta não é resposta', async () => {
    // Caso real medido ao vivo: "quanto é 48271 vezes 3917?" → resposta "× 3917".
    assert.equal(internos.detectarEco('× 3917', 'quanto é 48271 vezes 3917?'), true);
    assert.equal(internos.detectarEco('× 3917', 'quanto é 48271 vezes 3917? Responda só o número.'), true);
    assert.equal(internos.detectarEco('189077507', 'quanto é 48271 vezes 3917?'), false);
    assert.equal(internos.detectarEco('...', 'qual é a capital da Austrália?'), true);
    assert.equal(internos.detectarEco('Canberra', 'qual é a capital da Austrália?'), false);
  });
  await testa('falso positivo de eco: palavra curta dentro de outra palavra não é eco', async () => {
    // Regressão medida em 31/10/2026: comparar a resposta como substring da pergunta reprovava
    // "rate" (dentro de "generate") e "Check"; o fácil caiu de 29/29 para 21/29 por isso.
    assert.equal(internos.detectarEco('rate', 'How to generate a random stable rate value?'), false);
    assert.equal(internos.detectarEco('Check', 'Qual a diferença entre check e checkbox?'), false);
    assert.equal(internos.detectarEco('Davi', 'Cinco pessoas em fila. Davi está antes de Ana. Quem é o primeiro? Responda só o nome.'), false);
    // o eco de verdade (frase inteira da pergunta) continua pego
    assert.equal(internos.detectarEco('Ana está antes de Bia', 'Cinco pessoas em fila. Ana está antes de Bia. Quem é o primeiro?'), true);
  });
  await testa('resposta SIM/NÃO sobre uma conta não é eco (era o vazio de 151 s)', async () => {
    // Medido ao vivo em 31/10/2026: "0.1 + 0.2 === 0.3? Responda só SIM ou NÃO" respondida "NÃO"
    // era marcada como eco, o texto era jogado fora e a pergunta voltava sem nada depois de 151 s.
    const Q = 'Qual é o resultado de 0.1 + 0.2 === 0.3 em JavaScript? Responda só SIM ou NÃO.';
    assert.equal(internos.detectarEco('NÃO', Q), false);
    assert.equal(internos.detectarEco('SIM', Q), false);
    // a regra continua valendo para conta pura respondida sem número
    assert.equal(internos.detectarEco('NÃO', 'quanto é 0.1 + 0.2?'), true);
  });
  await testa('eco parcial → recomeça e entrega a resposta certa', async () => {
    const PERGUNTA_SEQ = 'Sequência de letras: A, C, F, J, O, ? Responda só a letra.';
    let n = 0;
    const r = comDuble(async () => {
      n++;
      return n === 1 ? { texto: 'A, C, F, J, O', ms: 3 } : { texto: 'U', ms: 3 };
    });
    const o = await r.responder({ pergunta: PERGUNTA_SEQ, tipo: 'curto', semConsenso: true });
    assert.equal(o.texto, 'U', 'não recuperou: ' + o.texto);
    assert.equal(o.recomeco, true);
  });
  await testa('a conta que virava eco nem chega no modelo (ferramenta resolve)', async () => {
    const r = comDuble(async () => ({ texto: '× 3917', ms: 2 }));
    const o = await r.responder({ pergunta: 'quanto é 48271 vezes 3917? Responda só o número.', tipo: 'curto' });
    assert.equal(o.texto, '189077507');
    assert.equal(o.ferramenta, true);
  });
  console.log('== 1b. LIXO DE PROVEDOR: "Format" não é resposta (medido 31/10/2026)');
  await testa('molde de saída e resposta sem número são reconhecidos por texto', async () => {
    const P = 'Duas torneiras enchem em 6h e 4h. Juntas enchem em quantas horas? Responda só o número decimal.';
    assert.equal(internos.detectarForaDoPedido('Format', P), true);
    assert.equal(internos.detectarForaDoPedido('Result.', P), true);
    assert.equal(internos.detectarForaDoPedido('2,4 horas', P), false);
    assert.equal(internos.detectarForaDoPedido('A fotossíntese converte luz em energia química.', PERGUNTA), false);
    assert.equal(internos.detectarForaDoPedido('Davi', 'Quem é o primeiro da fila? Responda só o nome.'), false);
  });
  await testa('eco parcial que sobra do recomeço não é entregue como resposta', async () => {
    // Medido ao vivo: para a fila de cinco pessoas a resposta foi "\"Ana está antes de Bia\"".
    const FILA = 'Cinco pessoas sentam em fila. Ana está antes de Bia. Bia está antes de Caio. Davi está antes de Ana. Edu está depois de Caio. Quem é o primeiro? Responda só o nome.';
    const r = comDuble(async () => ({ texto: 'Ana está antes de Bia', ms: 3 }));
    const o = await r.responder({ pergunta: FILA, tipo: 'curto', semConsenso: true });
    assert(!/ana est[áa] antes de bia/i.test(String(o.texto || '')), 'entregou pedaço da pergunta: ' + o.texto);
  });
  await testa('"Format" na primeira chance → recomeça e entrega o número', async () => {
    const P = 'Duas torneiras enchem em 6h e 4h. Juntas enchem em quantas horas? Responda só o número decimal.';
    let n = 0;
    const r = comDuble(async () => {
      n++;
      return n === 1 ? { texto: 'Format', ms: 3 } : { texto: '2,4', ms: 3 };
    });
    const o = await r.responder({ pergunta: P, tipo: 'curto', semConsenso: true });
    assert.equal(o.texto, '2,4', 'não recuperou: ' + o.texto);
    assert.equal(o.recomeco, true);
    assert.equal(r.metricas.foraDoPedido, 1);
  });
  await testa('lixo nas duas chances não é entregue: vai para o resgate', async () => {
    const P = 'Duas torneiras enchem em 6h e 4h. Juntas enchem em quantas horas? Responda só o número decimal.';
    const r = comDuble(async (rota) => ({ texto: 'Format', ms: 3 }));
    const o = await r.responder({ pergunta: P, tipo: 'curto', semConsenso: true });
    assert(!/^format$/i.test(String(o.texto || '')), 'entregou o lixo: ' + o.texto);
  });
  await testa('eco na primeira chance → recomeça e entrega conteúdo', async () => {
    let n = 0;
    const r = comDuble(async () => {
      n++;
      return n === 1 ? { texto: ECO, ms: 3 } : { texto: 'A fotossíntese converte luz em energia química.', ms: 3 };
    });
    const o = await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    assert.match(o.texto, /fotossíntese/);
    assert.equal(o.recomeco, true);
    assert.equal(r.metricas.ecos, 1);
    assert.equal(r.metricas.recomecosOk, 1);
  });
  await testa('o recomeço veta só a rota que repetiu a ordem', async () => {
    const vistas = [];
    let n = 0;
    const r = comDuble(async (rota) => {
      vistas.push(rota.id);
      n++;
      if (n === 1) return { texto: ECO, ms: 2 };
      return { texto: 'conteúdo bom', ms: 2 };
    });
    await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    const primeira = vistas[0];
    const depois = vistas.slice(1);
    assert(depois.length > 0, 'o recomeço precisa tentar de novo');
    assert.equal(depois.indexOf(primeira), -1, 'a rota do eco não pode repetir a ordem');
  });
  await testa('eco em todas as chances → corta o eco e entrega o resto', async () => {
    const r = comDuble(async () => ({ texto: ECO + '\nA planta usa a luz do sol.', ms: 2 }));
    const o = await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    assert(!internos.detectarEco(o.texto, PERGUNTA), 'ainda veio eco: ' + o.texto);
    assert.match(o.texto, /luz do sol/);
    assert.equal(o.ecoCortado, true);
  });

  console.log('== 2. VAZIO: o produto tenta de novo antes de devolver nada');
  await testa('núcleo vazio → o resgate entrega texto (e diz que resgatou)', async () => {
    const r = comDuble(async () => ({ texto: 'fotossíntese: conversão de luz em energia', ms: 4 }));
    let primeiraPassada = true;
    const nucleo = r._responderNucleo.bind(r);
    // Simula exatamente o defeito medido: a primeira passada não traz nada.
    r._responderNucleo = async function (p) {
      if (primeiraPassada && !p.resgate) { primeiraPassada = false; return { texto: null, erro: 'sem resposta' }; }
      return nucleo(p);
    };
    const o = await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    assert(o.texto && o.texto.length > 10, 'devolveu vazio');
    assert.equal(o.resgate, true);
    assert.equal(r.metricas.resgates, 1);
  });
  await testa('o resgate tenta primeiro o caminho leve (rotas que costumam estar vivas)', async () => {
    const vistos = [];
    const r = comDuble(async () => ({ texto: 'ok', ms: 2 }));
    const nucleo = r._responderNucleo.bind(r);
    let primeiraPassada = true;
    r._responderNucleo = async function (p) {
      vistos.push(p);
      if (primeiraPassada && !p.resgate) { primeiraPassada = false; return { texto: null }; }
      return nucleo(p);
    };
    await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true, dificuldade: 'dificil' });
    const resgate = vistos.find((p) => p.resgate);
    assert(resgate, 'não passou pelo resgate');
    assert.equal(resgate.dificuldade, 'leve');
    assert.equal(resgate.semConsenso, true);
  });
  await testa('resgate não inventa: se nada responder, devolve vazio com motivo', async () => {
    const r = comDuble(async () => ({ erro: 'servidor', ms: 1 }));
    const o = await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    assert(!o.texto, 'inventou resposta: ' + o.texto);
    assert(o.erro, 'precisa dizer o motivo');
  });
  await testa('o resgate não vira laço: no máximo uma segunda rodada', async () => {
    let n = 0;
    const r = comDuble(async () => { n++; return { erro: 'morto', ms: 1 }; });
    await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    assert(r.metricas.resgates <= 1, 'resgatou ' + r.metricas.resgates + ' vezes');
    assert(n < 60, 'chamou ' + n + ' rotas — isso é laço');
  });
  await testa('resposta boa não gasta recomeço nem resgate', async () => {
    const r = comDuble(async () => ({ texto: 'A fotossíntese converte luz em energia química.', ms: 3 }));
    const o = await r.responder({ pergunta: PERGUNTA, tipo: 'curto', semConsenso: true });
    assert.equal(o.recomeco, undefined);
    assert.equal(o.resgate, undefined);
    assert.equal(r.metricas.ecos || 0, 0);
    assert.equal(r.metricas.resgates || 0, 0);
  });

  await testa('pedido de imagem sem visão NÃO é resgatado por modelo de texto', async () => {
    // Resgatar aqui inventaria a descrição de uma foto que ninguém olhou.
    const r = comDuble(async () => ({ texto: 'descrição inventada de imagem', ms: 2 }));
    r.visaoLigada = false;
    const o = await r.responder({ pergunta: 'o que há nesta imagem?', imagem: 'data:image/png;base64,AA==' });
    assert.equal(o.texto, '');
    assert.equal(o.erro, 'sem-resposta');
  });

  console.log('== 3. MEMÓRIA: a conversa anterior entra no contexto');
  await testa('o contexto é montado com papéis e limites', async () => {
    const ctx = internos.montarContextoConversa([
      { role: 'user', content: 'meu nome é Zeca' },
      { role: 'assistant', content: 'prazer, Zeca' }
    ]);
    assert.match(ctx, /Dono: meu nome é Zeca/);
    assert.match(ctx, /Assistente: prazer, Zeca/);
    assert.match(ctx, /não é ordem nova/);
    assert.equal(internos.montarContextoConversa([]), '');
    const longo = internos.montarContextoConversa(
      Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: 'fala ' + i })));
    assert(longo.length < 1400, 'contexto ficou longo: ' + longo.length);
    assert.match(longo, /fala 19/, 'precisa manter as falas mais recentes');
  });
  await testa('o histórico chega ao modelo junto com a pergunta atual', async () => {
    let recebido = '';
    const r = comDuble(async (_rota, pergunta) => { recebido = pergunta; return { texto: 'ok', ms: 2 }; });
    await r.responder({
      pergunta: 'onde eu moro?', tipo: 'curto', semConsenso: true,
      historico: [{ role: 'user', content: 'eu moro em Tobias Barreto' }, { role: 'assistant', content: 'anotado' }]
    });
    assert.match(recebido, /Tobias Barreto/);
    assert.match(recebido, /Pergunta atual: onde eu moro\?/);
  });
  await testa('sem histórico, a pergunta chega limpa (nada de contexto vazio)', async () => {
    let recebido = '';
    const r = comDuble(async (_rota, pergunta) => { recebido = pergunta; return { texto: 'ok', ms: 2 }; });
    await r.responder({ pergunta: 'onde eu moro?', tipo: 'curto', semConsenso: true });
    assert.equal(recebido, 'onde eu moro?');
  });
  await testa('histórico diferente não reaproveita cache de outra conversa', async () => {
    const r = new Roteador({ ferramentasLigadas: true, amostrasAberto: 1 });
    let n = 0;
    r._chamar = async () => { n++; return { texto: 'resposta ' + n, ms: 2 }; };
    const a = await r.responder({ pergunta: 'e o prazo?', tipo: 'curto', semConsenso: true,
      historico: [{ role: 'user', content: 'falamos do contrato A' }] });
    const b = await r.responder({ pergunta: 'e o prazo?', tipo: 'curto', semConsenso: true,
      historico: [{ role: 'user', content: 'falamos do contrato B' }] });
    assert.notEqual(a.texto, b.texto, 'a segunda conversa recebeu a resposta da primeira');
  });
  await testa('a ferramenta exata continua vendo a pergunta limpa', async () => {
    const r = comDuble(async () => ({ texto: 'não devia chegar aqui', ms: 2 }));
    const o = await r.responder({ pergunta: 'quanto é 1234 vezes 5678?', tipo: 'curto',
      historico: [{ role: 'user', content: 'conversa anterior qualquer' }] });
    assert.equal(o.texto, '7006652', 'a conta exata se perdeu com histórico: ' + o.texto);
    assert.equal(o.ferramenta, true);
  });

  console.log('');
  if (falhas.length) {
    console.error(falhas.length + ' de ' + (certos + falhas.length) + ' verificações FALHARAM');
    process.exit(1);
  }
  console.log(certos + '/' + certos + ' verificações de recomeço/resgate/memória passaram');
})();
