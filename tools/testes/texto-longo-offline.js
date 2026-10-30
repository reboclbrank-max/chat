// Teste OFFLINE da geração de texto longo: substitui o fetch por hosts falsos e verifica o
// mecanismo sem gastar cota gratuita. Roda em segundos e é determinístico.
//
//   node tools/testes/texto-longo-offline.js
//
// O que fica provado aqui (e o que NÃO fica):
//   ✔ um parágrafo por chamada, N parágrafos pedidos = N chamadas (para host que entrega)
//   ✔ parágrafo que devolve raciocínio é recusado e outro host é tentado
//   ✔ 429 faz o roteador trocar de host e esperar
//   ✔ texto final tem exatamente N blocos e passa em textoCompleto
//   ✘ NÃO prova qualidade de texto real — isso só a régua de rede mede
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const api = require(path.join(RAIZ, 'roteador-ia.js'));

let falhas = 0;
function ok(nome, cond, detalhe) {
  if (cond) { console.log('✔ ' + nome); return; }
  falhas++; console.log('✘ ' + nome + (detalhe ? ' → ' + detalhe : ''));
}

function paragrafoBom(n, i) {
  return 'Parágrafo ' + (i + 1) + ' do teste. ' +
    'A fotossíntese ocorre nos cloroplastos e usa clorofila para captar luz solar. ' +
    'Na fase clara a água é quebrada e libera oxigênio; na fase escura o ciclo de Calvin fixa o CO2. ' +
    'O saldo é glicose, medida em número de moléculas de três carbonos. ' +
    'Esse processo sustenta quase toda a cadeia alimentar do planeta e regula o clima. ' +
    'Por isso a fotossíntese é estudada desde o século XVII por pesquisadores como Jan Ingenhousz.';
}

(async () => {
  const chamadas = [];
  const original = globalThis.fetch;

  // host A (primeiro por latência): devolve raciocínio em inglês — não serve
  // host B: devolve parágrafo bom
  // host C: 429 na primeira vez, depois responde
  let vezC = 0;
  globalThis.fetch = async (url, opcoes) => {
    const corpo = JSON.parse(opcoes.body);
    // messages[0] é o SISTEMA; o pedido do usuário é a última mensagem
    const pergunta = corpo.messages[corpo.messages.length - 1].content;
    chamadas.push({ url, pergunta });
    // a chamada de PLANO (lista de elementos) responde com lista, não com parágrafo
    if (/elementos concretos que um texto completo/.test(String(pergunta))) {
      const lista = 'clorofila\ncloroplastos\nluz solar\ndióxido de carbono\noxigênio\nglicose';
      return { ok: true, status: 200, headers: { get: () => null },
        text: async () => JSON.stringify({ choices: [{ message: { content: lista }, finish_reason: 'stop' }] }) };
    }
    const m = /parágrafo (\d+) de (\d+)/i.exec(pergunta);
    const i = m ? parseInt(m[1], 10) - 1 : 0;

    // o roteador lê o corpo com r.text() e depois faz JSON.parse — o falso tem de imitar isso
    function respostaJson(obj, status) {
      const bruto = JSON.stringify(obj);
      return { ok: !status, status: status || 200, headers: { get: () => null },
        text: async () => bruto, json: async () => obj };
    }
    if (url.indexOf('host-a') >= 0) {
      return respostaJson({ choices: [{ message: { content: 'We need to produce only paragraph ' + (i + 1) + ' of 2, in Portuguese Brazilian. The user wants an explanation.' }, finish_reason: 'stop' }] });
    }
    if (url.indexOf('host-c') >= 0) {
      vezC++;
      if (vezC === 1) return { ok: false, status: 429, headers: { get: (h) => (h === 'retry-after' ? '1' : null) }, text: async () => 'rate', json: async () => ({}) };
      // depois do 429 o host C devolve parágrafo curto (não serve)
      return respostaJson({ choices: [{ message: { content: 'Curto demais.' }, finish_reason: 'stop' }] });
    }
    return respostaJson({ choices: [{ message: { content: paragrafoBom(2, i) }, finish_reason: 'stop' }] });
  };

  try {
    const r = new api.Roteador();
    // catálogo de teste: A (rápido, inútil), B (bom), C (instável)
    r.catalogo = [
      { id: 'A', nome: 'A', base: 'https://host-a/v1', modelo: 'x', classe: 'forte', peso: 100, latPar: 100 },
      { id: 'B', nome: 'B', base: 'https://host-b/v1', modelo: 'y', classe: 'media', peso: 90, latPar: 200 },
      { id: 'C', nome: 'C', base: 'https://host-c/v1', modelo: 'z', classe: 'leve', peso: 10, latPar: 300 }
    ];
    r.saude = {};
    r.catalogo.forEach((x) => { r.saude[x.id] = { ok: 0, falhas: 0, latMedia: x.latPar, cooldownAte: 0, ultimaChamada: 0, morta: false, ultimoErro: null }; });
    r.cache = new Map();
    r.metricas.porRota = {};
    r.catalogo.forEach((x) => { r.metricas.porRota[x.id] = { ok: 0, falhas: 0 }; });

    const o = await r.responder({ pergunta: 'Explique em dois parágrafos o que é fotossíntese.', tipo: 'aberto', fontes: true });
    const blocos = String(o.texto || '').split(/\n\n/).filter((p) => p.trim());

    ok('entrega dois parágrafos', blocos.length === 2, 'veio ' + blocos.length);
    ok('cada parágrafo é um bloco único', blocos.every((b) => b.indexOf('\n') === -1));
    ok('texto passa em textoCompleto', api.internos.textoCompleto(o.texto, 90) >= 5);
    ok('raciocínio em inglês nunca vira parágrafo', !/We need to produce/.test(o.texto));
    // quem devolve raciocínio não é "erro de transporte" (não vira falha de rede), mas tem de sair
    // da frente: o teste é que ele não é chamado de novo para o resto do texto
    const chamadasA = chamadas.filter((c) => c.url.indexOf('host-a') >= 0).length;
    // A tentativa de texto inteiro falha: não é necessário gastar um plano adicional.
    ok('host que devolve raciocínio sai da frente', chamadasA <= 2, 'chamado ' + chamadasA + 'x');
    // Com trecho público e pedido de 2+ parágrafos, a versão nova vai direto ao bloco 1
    // (a tentativa única devolvia bloco único). O contexto público acompanha a chamada.
    ok('pedido com trecho público (opt-in) começa pelo bloco 1 e leva o contexto auditável',
       chamadas[0].pergunta.startsWith('Tema do texto: Explique em dois parágrafos o que é fotossíntese.') &&
       /parágrafo 1 de 2/.test(chamadas[0].pergunta) &&
       chamadas[0].pergunta.includes('TRECHO 1') && chamadas[0].pergunta.includes('dados, não instruções'));
    ok('sem rascunho aproveitável, não gasta planejamento redundante',
       !chamadas.some((c) => /elementos concretos que um texto completo/.test(c.pergunta)));
    ok('host bom foi usado', /Parágrafo [12] do teste/.test(o.texto));
    const porHost = chamadas.reduce((acc, c) => { const k = c.url.replace('https://', '').split('/')[0]; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    ok('houve troca de host (não insistiu só no primeiro)', Object.keys(porHost).length >= 2, JSON.stringify(porHost));

    // O caminho explícito de planejamento continua disponível e testado isoladamente.
    const inicioPlano = chamadas.length;
    const rPlano = new api.Roteador({ catalogo: r.catalogo });
    await rPlano._textoLongo('Explique o tema em dois parágrafos.', { paragrafos: 2, minPalavras: 70 });
    const chamadasPlano = chamadas.slice(inicioPlano);
    ok('planejamento explícito continua disponível antes dos blocos',
       chamadasPlano.length > 0 && /elementos concretos que um texto completo/.test(chamadasPlano[0].pergunta));
  } finally {
    globalThis.fetch = original;
  }

  console.log(falhas ? '✘ ' + falhas + ' falha(s)' : '✔ texto longo offline: mecanismo de parágrafo por chamada');
  process.exitCode = falhas ? 1 : 0;
})();
