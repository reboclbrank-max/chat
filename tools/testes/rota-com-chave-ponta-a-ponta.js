// Prova ponta a ponta da rota com chave, sem chave real e sem rede externa.
// Sobe um servidor local que imita /v1/chat/completions no formato OpenAI/Groq e verifica:
//   1. com chave, a rota é usada, o Authorization chega correto e a resposta é aproveitada;
//   2. o modelo pedido é o do catálogo (não um nome inventado);
//   3. sem chave, NENHUMA requisição chega ao servidor — a rota fica inativa de fato;
//   4. chave recusada (401) não entrega resposta e marca a rota como doente.
// Não prova que a Groq real responde; prova que o código está pronto para quando houver chave.
'use strict';
const assert = require('assert');
const http = require('http');
const { Roteador } = require('../../roteador-ia');

let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }
const CHAVE_FALSA = 'gsk_teste_local_nao_e_chave_real';

function servidorFalso(status, conteudo) {
  const estado = { pedidos: [] };
  const srv = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (c) => { corpo += c; });
    req.on('end', () => {
      let json = null;
      try { json = JSON.parse(corpo); } catch (e) {}
      estado.pedidos.push({ url: req.url, auth: req.headers.authorization || null, corpo: json });
      res.writeHead(status, { 'Content-Type': 'application/json' });
      if (status !== 200) return res.end(JSON.stringify({ error: { message: 'recusado' } }));
      res.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: conteudo }, finish_reason: 'stop' }],
        model: json && json.model
      }));
    });
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, estado, porta: srv.address().port })));
}

const catalogo = (porta) => ([
  { id: 'groq', nome: 'Groq de mentira', base: 'http://127.0.0.1:' + porta + '/v1', modelo: 'openai/gpt-oss-120b', classe: 'forte', peso: 98, chaveLS: 'rebocl_chave_groq' }
]);

(async () => {
  // ---------- 1 e 2: com chave ----------
  {
    const { srv, estado, porta } = await servidorFalso(200, 'A fotossíntese converte luz em energia química nas plantas de forma clara e direta.');
    const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => CHAVE_FALSA, votos: 1 });
    const resp = await r.responder({ pergunta: 'Explique em uma frase o que é fotossíntese.', semFerramenta: true, semConsenso: true, dificuldade: 'leve' });

    ok('com chave, a resposta vem da rota e é aproveitada', () => {
      assert(estado.pedidos.length >= 1, 'nenhuma requisição chegou ao servidor');
      assert(resp && resp.texto, 'resposta vazia');
      assert(/fotoss[ií]ntese/i.test(resp.texto), 'não é o texto do servidor: ' + resp.texto);
      assert.equal(resp.rota, 'groq', 'rota usada: ' + resp.rota);
    });
    ok('o cabeçalho Authorization chega exatamente como Bearer <chave>', () => {
      assert.equal(estado.pedidos[0].auth, 'Bearer ' + CHAVE_FALSA);
    });
    ok('o corpo pede o modelo declarado no catálogo', () => {
      assert.equal(estado.pedidos[0].corpo.model, 'openai/gpt-oss-120b');
      assert(Array.isArray(estado.pedidos[0].corpo.messages));
    });
    ok('a chave não aparece no corpo da requisição', () => {
      assert(!JSON.stringify(estado.pedidos[0].corpo).includes(CHAVE_FALSA), 'chave vazou no corpo');
    });
    ok('a rota autorizada é reconhecida como disponível', () => {
      assert.equal(r.disponivel('groq'), true);
      assert(r.saude.groq.ok >= 1, 'sucesso deveria ter sido registrado');
    });
    srv.close();
  }

  // ---------- 3: sem chave ----------
  {
    const { srv, estado, porta } = await servidorFalso(200, 'não deveria ser chamado');
    const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => null, votos: 1 });
    const resp = await r.responder({ pergunta: 'Explique em uma frase o que é fotossíntese.', semFerramenta: true, semConsenso: true, dificuldade: 'leve' });

    ok('sem chave, NENHUMA requisição chega ao servidor', () => {
      assert.equal(estado.pedidos.length, 0, 'a rota foi chamada mesmo sem chave: ' + estado.pedidos.length);
    });
    ok('sem chave, a rota é declarada indisponível antes de qualquer tentativa', () => {
      assert.equal(r.disponivel('groq'), false);
    });
    ok('sem chave, a resposta sai vazia em vez de erro na cara do usuário', () => {
      assert(!resp.texto, 'não deveria haver texto: ' + JSON.stringify(resp.texto));
      assert(resp.erro, 'deveria explicar o motivo: ' + JSON.stringify(resp.erro));
    });
    srv.close();
  }

  // ---------- 4: chave recusada ----------
  {
    const { srv, estado, porta } = await servidorFalso(401, '');
    const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => 'gsk_chave_invalida', votos: 1 });
    const resp = await r.responder({ pergunta: 'Explique em uma frase o que é fotossíntese.', semFerramenta: true, semConsenso: true, dificuldade: 'leve' });

    ok('chave recusada (401) não entrega resposta', () => {
      assert(estado.pedidos.length >= 1, 'deveria ter tentado');
      assert(!resp.texto, 'não deveria haver texto: ' + JSON.stringify(resp.texto));
    });
    ok('chave recusada marca a rota como doente em vez de insistir', () => {
      assert(r.saude.groq.falhas >= 1, 'falha não registrada');
      assert.equal(r.disponivel('groq'), false, 'rota recusada continua disponível');
    });
    srv.close();
  }

  // ---------- 5: formatação de parágrafos no caminho real ----------
  // O pedido entra como o app entra: tipo 'aberto'. (Sem `semFerramenta`, que rebaixa o pedido
  // para 'curto' e nunca chega no ramo de parágrafos.)
  {
    const bloco = 'A água da chuva começa a ser captada nas represas e nos rios que abastecem a cidade, ' +
      'onde bombas levam o volume bruto até a estação de tratamento. Na chegada, a água recebe coagulantes ' +
      'que juntam as impurezas em flocos maiores, e essa mistura passa por tanques de decantação onde a ' +
      'sujeira se deposita no fundo. Depois da decantação, a água atravessa filtros de areia e carvão que ' +
      'retiram o restante das partículas em suspensão. Em seguida vem a desinfecção com cloro, que elimina ' +
      'microrganismos causadores de doenças, e a adição de flúor, que ajuda a proteger os dentes da ' +
      'população atendida. A água tratada segue então para os reservatórios elevados, que guardam o volume ' +
      'necessário para os horários de maior consumo e mantêm a pressão nas tubulações da rede. Por fim, a ' +
      'distribuição leva a água até as ligações prediais, o hidrômetro registra o consumo de cada casa e a ' +
      'torneira entrega a mesma água que saiu da estação de tratamento.';
    const { srv, estado, porta } = await servidorFalso(200, bloco);
    const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => CHAVE_FALSA, votos: 1 });
    const resp = await r.responder({
      pergunta: 'Descreva em três parágrafos o caminho da água da chuva até a torneira de casa.',
      tipo: 'aberto'
    });
    const blocos = String(resp.texto || '').split(/\n+/).filter((x) => x.trim());
    const normaliza = (t) => String(t || '').replace(/\s+/g, ' ').trim();
    ok('texto de um bloco com frases suficientes sai em três parágrafos', () => {
      assert(estado.pedidos.length >= 1, 'servidor não foi chamado');
      assert.equal(blocos.length, 3, 'blocos: ' + blocos.length + ' | texto: ' + JSON.stringify(resp.texto).slice(0, 120));
    });
    ok('a quebra de parágrafo não acrescenta nem remove palavras', () => {
      assert.equal(normaliza(resp.texto), normaliza(bloco), 'o texto mudou além do espaçamento');
    });
    ok('o formato é resolvido na primeira chamada, sem repetir o pedido por parágrafo', () => {
      assert.equal(estado.pedidos.length, 1, 'chamadas ao provedor: ' + estado.pedidos.length);
    });
    srv.close();
  }

  // ---------- 6: busca viva ponta a ponta, sem tocar na rede externa ----------
  // Prova que, quando a fonte viva é pedida, o trecho do artigo entra no prompt e sai citado na
  // resposta — e que a busca é recusada quando o artigo não é sobre o pedido.
  {
    const bloco = 'Os painéis solares são formados por células de material semicondutor que ' +
      'convertem a luz do sol em corrente elétrica contínua por efeito fotovoltaico. Um inversor ' +
      'transforma essa corrente contínua em corrente alternada, que é a forma usada pelos aparelhos ' +
      'da casa. A geração varia ao longo do dia conforme a incidência de luz, e o excedente pode ser ' +
      'enviado à rede elétrica ou armazenado em baterias para uso noturno. O sistema também inclui ' +
      'estrutura de fixação, cabeamento, proteções elétricas e um medidor que registra o que é ' +
      'injetado na rede, e a limpeza periódica dos módulos mantém a produção próxima do previsto.';
    const { srv, estado, porta } = await servidorFalso(200, bloco);
    const fetchOriginal = global.fetch;
    const consultas = [];
    global.fetch = async (url, opcoes) => {
      const u = String(url);
      // Só a Wikipédia é falsificada; o provedor local (127.0.0.1) segue pelo fetch de verdade.
      if (!u.includes('wikipedia')) return fetchOriginal(url, opcoes);
      consultas.push(u);
      if (u.includes('list=search')) {
        return { ok: true, status: 200, json: async () => ({ query: { search: [
          { title: 'Energia solar fotovoltaica', snippet: 'painéis convertem luz solar em eletricidade' },
          { title: 'Caminho', snippet: 'via, trajecto, percurso' }
        ] } }) };
      }
      return { ok: true, status: 200, json: async () => ({ query: { pages: { 1: {
        title: 'Energia solar fotovoltaica',
        extract: 'A célula fotovoltaica converte luz solar em eletricidade por meio do efeito ' +
          'fotovoltaico em materiais semicondutores. Os painéis agrupam essas células e geram ' +
          'corrente contínua, convertida por inversores na corrente alternada usada nas casas.'
      } } } }) };
    };
    try {
      const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => CHAVE_FALSA, votos: 1 });
      const resp = await r.responder({
        pergunta: 'Explique em dois parágrafos como funciona a energia solar fotovoltaica.',
        tipo: 'aberto', fontes: 'vivo'
      });
      ok('com fonte viva pedida, a busca acontece e a fonte escolhida é a que tem o tema no título', () => {
        assert(consultas.some((u) => u.includes('list=search')), 'não consultou a busca');
        assert(resp.fontesConsultadas && resp.fontesConsultadas.length, 'resposta sem fonte citada');
        assert.strictEqual(resp.fontesConsultadas[0].titulo, 'Energia solar fotovoltaica');
        assert(!/titles=Caminho/.test(consultas.join(' ')), 'abriu o artigo tangencial');
      });
      ok('o trecho do artigo entra no prompt enviado ao provedor', () => {
        const corpo = JSON.stringify(estado.pedidos[0] && estado.pedidos[0].corpo || {});
        assert(corpo.includes('fotovoltaico') || corpo.includes('semicondutores'), 'o trecho não chegou ao provedor');
        assert(corpo.includes('TRECHO 1'), 'o trecho não foi rotulado como dado, não instrução');
      });
      ok('a resposta não vira cópia do trecho: o texto entregue é o gerado', () => {
        assert(String(resp.texto).includes('casa'), 'resposta não conversa com o pedido');
        assert(!/^\s*A célula fotovoltaica converte luz solar/.test(String(resp.texto)), 'resposta colou o trecho');
      });
    } finally { global.fetch = fetchOriginal; srv.close(); }
  }

  // ---------- 7: sem fonte viva pedida, nenhuma consulta externa ----------
  {
    const { srv, estado, porta } = await servidorFalso(200, 'Explicação curta e completa sobre o tema pedido, com frase final.');
    const fetchOriginal = global.fetch;
    let consultas = 0;
    global.fetch = async (url, opcoes) => {
      if (String(url).includes('wikipedia')) { consultas++; throw new Error('não devia consultar'); }
      return fetchOriginal(url, opcoes);
    };
    try {
      const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => CHAVE_FALSA, votos: 1 });
      await r.responder({ pergunta: 'Explique em uma frase o que é fotossíntese.', semFerramenta: true, semConsenso: true, dificuldade: 'leve' });
      ok('sem fonte viva pedida e fora do navegador, o teste não consulta a Wikipédia', () => {
        assert.equal(consultas, 0, 'consultas externas em teste: ' + consultas);
        assert(estado.pedidos.length >= 1, 'o provedor local deveria ter sido chamado');
      });
    } finally { global.fetch = fetchOriginal; srv.close(); }
  }

  // ---------- 8: com as ferramentas desligadas, a fonte viva não consulta nada ----------
  {
    const { srv, estado, porta } = await servidorFalso(200, 'Resposta curta e completa sobre o tema, com frase final.');
    const fetchOriginal = global.fetch;
    let consultas = 0;
    global.fetch = async (url, opcoes) => {
      if (String(url).includes('wikipedia')) { consultas++; throw new Error('não devia consultar'); }
      return fetchOriginal(url, opcoes);
    };
    try {
      const r = new Roteador({ catalogo: catalogo(porta), lerChave: () => CHAVE_FALSA, votos: 1, ferramentas: false });
      await r.responder({ pergunta: 'Explique como funciona a energia solar fotovoltaica.', tipo: 'aberto', fontes: 'vivo' });
      ok('ferramentas desligadas vencem até o pedido explícito de fonte viva', () => {
        assert.equal(consultas, 0, 'consultou a Wikipédia com ferramentas desligadas');
        assert(estado.pedidos.length >= 1, 'o provedor local deveria ter sido chamado');
      });
    } finally { global.fetch = fetchOriginal; srv.close(); }
  }

  console.log('\n' + n + ' contratos ponta a ponta da rota com chave passaram');
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
