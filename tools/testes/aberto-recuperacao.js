// Contratos offline: formato, recuperação de partes e prazo compartilhado.
// Não verificam veracidade, qualidade literária nem disponibilidade das APIs reais.
'use strict';
const assert = require('assert');
const { Roteador, internos, CATALOGO } = require('../../roteador-ia.js');

const rota = (id, base, latPar = 100) => ({ id, nome: id, base, modelo: id,
  classe: 'forte', peso: 90, latPar });
const a = 'O primeiro trecho apresenta o assunto com clareza e desenvolve suas ideias em frases completas. '.repeat(5);
const b = 'O segundo trecho acrescenta uma explicação pertinente, sem repetir o conteúdo já apresentado. '.repeat(5);
const pergunta = 'Explique em dois parágrafos como uma biblioteca organiza e empresta livros.';
const pedido = { pergunta, tipo: 'aberto', semFerramenta: true };

async function comRelogioFalso(fn) {
  const antigoAgora = Date.now, antigoTimer = global.setTimeout;
  let tempo = 1000000;
  Date.now = () => tempo;
  global.setTimeout = (f, ms) => { tempo += Math.max(0, ms || 0); queueMicrotask(f); return 1; };
  try { await fn({ agora: () => tempo, avancar: (n) => { tempo += n; } }); }
  finally { Date.now = antigoAgora; global.setTimeout = antigoTimer; }
}

(async () => {
  const cat = [rota('A', 'https://falso.invalid/v1')];
  const direto = new Roteador({ catalogo: cat });
  direto._esperarVez = async () => true;
  let chamadas = [];
  direto._chamar = async (r, q) => { chamadas.push(q); return { texto: a.trim() + '\n\n' + b.trim(), ms: 1, bruto: 'stop' }; };
  const completo = await direto.responder(pedido);
  assert.strictEqual(chamadas.length, 1, 'texto completo não deve gastar plano ou chamadas adicionais');
  assert.strictEqual(completo.texto, a.trim() + '\n\n' + b.trim());
  assert.strictEqual(completo.incompleto, undefined);
  assert.strictEqual(completo.verificacaoFactual, 'nao_verificada');
  assert.strictEqual((await direto.responder(pedido)).cache, true);
  console.log('✔ um rascunho completo usa uma chamada e mantém veracidade não verificada');

  const reparar = new Roteador({ catalogo: cat });
  reparar._esperarVez = async () => true;
  chamadas = [];
  reparar._chamar = async (r, q) => {
    chamadas.push(q);
    if (q === pergunta) return { texto: a.trim(), ms: 1, bruto: 'stop' };
    assert.match(q, /parágrafo 2 de 2/, 'não refazer nem duplicar o primeiro bloco');
    assert(q.includes(a.trim().slice(0, 100)), 'o bloco anterior é contexto do segundo');
    return { texto: b.trim(), ms: 1, bruto: 'stop' };
  };
  const recuperado = await reparar.responder(pedido);
  assert.strictEqual(chamadas.length, 2, 'aproveitar o rascunho e gerar só o bloco ausente');
  assert.strictEqual(recuperado.texto, a.trim() + '\n\n' + b.trim());
  assert.strictEqual(recuperado.incompleto, undefined);
  console.log('✔ um bloco completo é preservado e somente o parágrafo ausente é gerado');

  const listaRapida = new Roteador({ catalogo: cat });
  listaRapida._esperarVez = async () => true;
  const perguntaLista = 'Escreva uma lista com 3 dicas práticas.';
  let chamadasLista = [];
  listaRapida._chamar = async (r, q) => {
    chamadasLista.push(q);
    if (q === perguntaLista) return { texto: '1. ' + a.trim() + '\n2. ' + b.trim(), ms: 1, bruto: 'stop' };
    assert.match(q, /item 3 de 3/, 'apenas o terceiro item deve ser gerado');
    assert(q.includes('Itens anteriores, já escritos:'), 'o modelo recebe os itens anteriores');
    return { texto: 'Uma terceira explicação relevante, que acrescenta informação nova e completa o conjunto sem repetir o anterior.', ms: 1, bruto: 'stop' };
  };
  const listaRecuperada = await listaRapida.responder({ pergunta: perguntaLista, tipo: 'aberto', semFerramenta: true });
  assert.strictEqual(chamadasLista.length, 2);
  assert.match(listaRecuperada.texto, /^1\. /);
  assert.match(listaRecuperada.texto, /\n2\. /);
  assert.match(listaRecuperada.texto, /\n3\. /);
  assert.strictEqual(listaRecuperada.incompleto, undefined);
  console.log('✔ lista parcial preserva os itens anteriores e gera só o próximo, com contexto');

  const listaContinua = new Roteador({ catalogo: cat });
  listaContinua._esperarVez = async () => true;
  let chamadasContinua = 0;
  const comContinuacao = '1. ' + a.trim() + '\nContinuação que não pode ser apagada.\n2. ' + b.trim() +
    '\n3. Uma orientação final suficiente para concluir a lista de modo adequado e seguro.';
  listaContinua._chamar = async () => { chamadasContinua++; return { texto: comContinuacao, ms: 1, bruto: 'stop' }; };
  const listaPreservada = await listaContinua.responder({ pergunta: perguntaLista, tipo: 'aberto', semFerramenta: true });
  assert.strictEqual(chamadasContinua, 1, 'lista completa não precisa de plano ou recuperação');
  assert(listaPreservada.texto.includes('Continuação que não pode ser apagada.'), 'não eliminar linhas de continuação');
  assert.strictEqual(listaPreservada.incompleto, undefined);
  console.log('✔ lista completa usa uma chamada e preserva linha de continuação');

  const rotasVelocidade = [rota('lenta', 'https://mesma.invalid/v1', 30000), rota('rapida', 'https://mesma.invalid/v1', 200)];
  const simples = new Roteador({ catalogo: rotasVelocidade });
  simples._esperarVez = async () => true;
  let usada = null;
  simples._chamar = async (r) => { usada = r.id; return { texto: a.trim(), ms: 1, bruto: 'stop' }; };
  await simples.responder({ pergunta: 'Escreva um parágrafo sobre o tema.', tipo: 'aberto', semFerramenta: true });
  assert.strictEqual(usada, 'rapida', 'a resposta direta também prioriza latência em parágrafo único');
  console.log('✔ texto de um parágrafo começa pelo modelo mais rápido medido');

  await comRelogioFalso(async () => {
    const catPrioridade = CATALOGO.filter(x => ['lagunas', 'ovhq', 'ovhoss20'].includes(x.id));
    const r = new Roteador({ catalogo: catPrioridade });
    r._esperarVez = async () => true;
    const ids = [];
    r._chamar = async (rotaRecebida) => {
      ids.push(rotaRecebida.id);
      if (rotaRecebida.id === 'lagunas') return { erro: 'rate', espera: 60, ms: 1 };
      return { texto: (ids.length === 2 ? a : b).trim(), ms: 1, bruto: 'stop' };
    };
    const resultado = await r.responder(pedido);
    assert.deepStrictEqual(ids, ['lagunas', 'ovhoss20', 'ovhoss20']);
    assert.strictEqual(resultado.incompleto, undefined);
  });
  console.log('✔ com cota no primário, escolhe a rota OVH priorizada no experimento');

  await comRelogioFalso(async ({ agora }) => {
    const k = rota('k', 'https://api.kilo.ai/api/gateway');
    const r = new Roteador({ catalogo: [k], orcamento: 110000 });
    r._esperarVez = async () => true;
    let total = 0, inicio = agora(), instantes = [];
    r._chamar = async (rotaRecebida, q) => {
      total++; instantes.push(agora());
      if (total === 1) return { erro: 'rate', espera: 60, ms: 1 };
      return { texto: (total === 2 ? a : b).trim(), ms: 1, bruto: 'stop' };
    };
    const recuperado = await r.responder(pedido);
    assert.strictEqual(total, 3, 'aguarda e usa a rota recuperada para os dois parágrafos');
    assert(instantes[1] - inicio >= 60000, 'não chama antes do Retry-After');
    assert(agora() - inicio <= 110000, 'espera e geração mantêm o mesmo orçamento');
    assert.strictEqual(recuperado.incompleto, undefined);
    assert.strictEqual(recuperado.texto, a.trim() + '\n\n' + b.trim());
  });
  console.log('✔ parágrafos retomam rota que voltou do cooldown dentro do prazo');

  await comRelogioFalso(async ({ agora }) => {
    const k = rota('k', 'https://api.kilo.ai/api/gateway');
    const r = new Roteador({ catalogo: [k], orcamento: 110000 });
    r._esperarVez = async () => true;
    let total = 0, inicio = agora(), instantes = [];
    r._chamar = async () => {
      total++; instantes.push(agora());
      if (total === 1) return { erro: 'rate', espera: 60, ms: 1 };
      return { texto: 'Uma sugestão útil com detalhes relevantes, apresentada claramente e sem depender de informações privadas ou não verificadas.', ms: 1, bruto: 'stop' };
    };
    const lista = await r.responder({ pergunta: perguntaLista, tipo: 'aberto', semFerramenta: true });
    assert.strictEqual(total, 4, 'aguarda e recupera os três itens');
    assert(instantes[1] - inicio >= 60000, 'não chama antes do Retry-After');
    assert(agora() - inicio <= 110000);
    assert.strictEqual(lista.incompleto, undefined);
    assert.match(lista.texto, /\n3\. /);
  });
  console.log('✔ lista retoma rota que voltou do cooldown dentro do prazo');

  await comRelogioFalso(async () => {
    const k = rota('k', 'https://api.kilo.ai/api/gateway');
    const outro = rota('outro', 'https://outra.invalid/v1', 200);
    const r = new Roteador({ catalogo: [k, outro], orcamento: 20000 });
    r._esperarVez = async () => true;
    const perguntas = [];
    r._chamar = async (rotaRecebida, q) => { perguntas.push(q); return { erro: 'rate', espera: 3600, ms: 1 }; };
    await r.responder(pedido);
    assert(perguntas.some(q => /parágrafo 1 de 2/.test(q)), 'tenta o primeiro bloco');
    assert(!perguntas.some(q => /parágrafo 2 de 2/.test(q)), 'não escreve o fim antes do início');
  });
  console.log('✔ o segundo parágrafo não é gerado se o primeiro falhar');

  await comRelogioFalso(async ({ agora }) => {
    const r = new Roteador({ catalogo: cat, orcamento: 10000 });
    r._esperarVez = async () => true;
    let total = 0, inicio = agora();
    r._chamar = async (rotaRecebida, q) => {
      total++;
      if (q === pergunta) return { texto: a.trim(), ms: 1, bruto: 'stop' };
      return { erro: 'rate', espera: 3600, ms: 1 };
    };
    const parcial = await r.responder(pedido);
    assert.strictEqual(parcial.texto, a.trim(), 'não descartar o trecho que deu certo');
    assert.strictEqual(parcial.incompleto, true);
    assert.match(parcial.avisoFormato, /1 de 2 parágrafos/);
    assert.strictEqual(total, 2, 'não tentar novamente durante Retry-After');
    assert(agora() - inicio <= 10000, 'geração deve compartilhar o prazo');
    assert.strictEqual(r.cache.size, 0, 'parcial não entra no cache');
  });
  console.log('✔ 429 longo preserva texto parcial, avisa, não grava cache e respeita prazo');

  await comRelogioFalso(async ({ agora }) => {
    const r = new Roteador({ catalogo: cat, orcamento: 10000 });
    r._esperarVez = async () => true;
    let total = 0, inicio = agora();
    r._chamar = async () => {
      total++;
      return total === 1 ? { texto: '1. Primeiro item: ' + a.trim(), ms: 1 } : { erro: 'rate', espera: 600, ms: 1 };
    };
    const parcial = await r.responder({ pergunta: 'Escreva uma lista com 3 dicas práticas.', tipo: 'aberto', semFerramenta: true });
    assert.match(parcial.texto, /^1\. /);
    assert.strictEqual(parcial.incompleto, true);
    assert.match(parcial.avisoFormato, /1 de 3 itens/);
    assert.strictEqual(total, 2, 'lista não deve ignorar cooldown e disparar de novo');
    assert(agora() - inicio <= 10000);
  });
  console.log('✔ lista também preserva item bom e respeita o limite de cota');

  await comRelogioFalso(async ({ avancar }) => {
    const kilo1 = rota('k1', 'https://api.kilo.ai/api/gateway');
    const kilo2 = rota('k2', 'https://api.kilo.ai/api/gateway');
    const ovh1 = rota('o1', 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1');
    const ovh2 = rota('o2', 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1');
    const r = new Roteador({ catalogo: [kilo1, kilo2, ovh1, ovh2] });
    r._castigar('k1', 'rate', 120);
    assert(!r.disponivel('k1') && !r.disponivel('k2'), 'Kilo compartilha a cota por IP');
    r._castigar('o1', 'rate', 60);
    assert(!r.disponivel('o1') && r.disponivel('o2'), 'OVH identifica a cota por modelo');
    r._premiar('k1', 1);
    assert(!r.disponivel('k1'), 'sucesso de chamada em voo não apaga o 429 recente');
    avancar(60000);
    assert(r.disponivel('o1') && !r.disponivel('k2'));
    avancar(60000);
    assert(r.disponivel('k1') && r.disponivel('k2'));
    assert.strictEqual(r.metricas.porRota.k1.falhas, 1, '429 com Retry-After conta como falha');
  });
  console.log('✔ cooldown compartilhado no Kilo e por modelo no OVH; sucesso concorrente não o apaga');

  const horario = Date.parse('2026-10-29T10:00:00Z');
  assert.strictEqual(internos.segundosRetryAfter('120', horario), 120);
  assert.strictEqual(internos.segundosRetryAfter('Thu, 29 Oct 2026 10:01:30 GMT', horario), 90);
  assert.strictEqual(internos.segundosRetryAfter('inválido', horario), null);
  assert.strictEqual(internos.segundosRetryAfter('Thu, 29 Oct 2026 09:59:00 GMT', horario), 0);
  console.log('✔ Retry-After aceita segundos ou data HTTP e rejeita valores inválidos');

  const rotaTeste = rota('P', 'https://plano.invalid/v1');
  const rPlano = new Roteador({ catalogo: [rotaTeste] });
  rPlano._esperarVez = async () => true;
  const prompts = [];
  rPlano._chamar = async (r, q) => {
    if (q.includes('elementos concretos que um texto completo'))
      return { texto: 'origem\ncaptação\ntransporte\ntratamento\ndistribuição\ndestino', ms: 1 };
    prompts.push(q);
    return { texto: a.trim(), ms: 1 };
  };
  await rPlano._textoLongo('Descreva um percurso em dois parágrafos.', { paragrafos: 2, minPalavras: 70 });
  assert.match(prompts[0], /Nesta parte, priorize origem e captação e transporte/);
  assert.match(prompts[1], /Nesta parte, priorize tratamento e distribuição e destino/);
  console.log('✔ um plano sequencial é distribuído em fatias contíguas, não alternadas');

  const ex = internos.exigenciaDoPedido('Em dois parágrafos, explique o tema em no máximo 50 palavras.');
  assert.strictEqual(ex.maximoExplicito, 50);
  assert(ex.minPalavras <= 50, 'heurística não pode exceder o máximo do usuário');
  assert.strictEqual(internos.exigenciaDoPedido('Use pelo menos 80 palavras.').minimoExplicito, 80);
  console.log('✔ limites explícitos de palavras não se confundem com a meta interna');

  const fetchReal = global.fetch;
  try {
    global.fetch = async (url, opts) => ({ ok: true, status: 200, headers: { get: () => null },
      text: () => new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => {
        const erro = new Error('abortado'); erro.name = 'AbortError'; reject(erro);
      })) });
    const r = new Roteador({ catalogo: cat });
    const antes = Date.now();
    const resultado = await r._chamar(cat[0], 'teste público', 30, { longo: true });
    assert.strictEqual(resultado.erro, 'timeout', 'timeout cobre leitura do corpo depois dos cabeçalhos');
    assert(Date.now() - antes < 1000);
  } finally { global.fetch = fetchReal; }
  console.log('✔ timeout permanece ativo durante leitura do corpo HTTP');
})().catch((erro) => { console.error(erro); process.exitCode = 1; });
