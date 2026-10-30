// Contratos da segunda amostra nas perguntas abertas (rodadas 108–109).
// O número que justificou a mudança: janela de 144 respostas, A 63/72 x B 71/72, McNemar p=0,0078.
// Aqui se verifica o COMPORTAMENTO, não a qualidade: quando pede a segunda, quando não pede, se
// escolhe pela pontuação interna (não por comprimento nem por ordem) e se as duas correm juntas
// — que é o que devolve a latência perdida sem mexer na escolha.
'use strict';
const assert = require('assert');
const { Roteador } = require('../../roteador-ia.js');

let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const PERGUNTA = 'Explique em dois parágrafos como funciona uma biblioteca que empresta livros.';
const completa = 'A biblioteca organiza os livros em estantes por assunto e mantém um catálogo que ' +
  'liga cada obra ao seu endereço na prateleira, de modo que qualquer pessoa encontre o volume pelo ' +
  'título, pelo autor ou pelo tema. O empréstimo é registrado no cadastro do leitor, com prazo de ' +
  'devolução e possibilidade de renovação quando ninguém mais espera pelo exemplar.' +
  '\n\nA reserva permite aguardar por uma obra que está com outra pessoa, e o sistema avisa o ' +
  'leitor quando ela retorna, garantindo que a fila seja respeitada na ordem de chegada. Quando o ' +
  'prazo vence sem devolução, a biblioteca envia um lembrete, suspende temporariamente novos ' +
  'empréstimos daquele cadastro e libera a obra para o próximo interessado da lista.';

const CATALOGO_FALSO = [{ id: 'falsa', nome: 'falsa', base: 'https://falso.invalid/v1', modelo: 'm', classe: 'forte', peso: 90 }];

// `roteiro(i)` decide o texto da i-ésima geração. No caminho sequencial o roteador tenta até 3
// vezes por amostra, então a primeira amostra "ruim" precisa de 3 gerações ruins antes da segunda.
function montar(roteiro, opcoes) {
  const r = new Roteador(Object.assign({ catalogo: CATALOGO_FALSO }, opcoes || {}));
  const pedidos = [];
  r._gerar = async () => {
    const texto = roteiro(pedidos.length);
    pedidos.push(texto);
    return { texto, rota: 'falsa', confianca: 'alta', ms: 1 };
  };
  return { r, pedidos };
}

// Mock com relógio de verdade: mede sobreposição e tempo de parede das duas amostras.
function montarComRelogio({ atraso = 120, texto = completa, opcoes } = {}) {
  const r = new Roteador(Object.assign({ catalogo: CATALOGO_FALSO }, opcoes || {}));
  const estado = { dentro: 0, pico: 0, chamadas: 0 };
  r._gerar = async () => {
    estado.chamadas++;
    estado.dentro++;
    estado.pico = Math.max(estado.pico, estado.dentro);
    await espera(atraso);
    estado.dentro--;
    return { texto, rota: 'falsa', confianca: 'alta', ms: atraso };
  };
  return { r, estado };
}

(async () => {
  {
    const { r, estado } = montarComRelogio();
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('pergunta aberta paga duas amostras, como no experimento', () => {
      assert.equal(estado.chamadas, 2, 'gerações: ' + estado.chamadas);
      assert.equal(saida.amostras, 2, 'amostras: ' + saida.amostras);
      assert(!saida.daSegunda, 'empate deve ficar com a primeira');
      assert.equal(saida.texto, completa);
    });
  }

  {
    const { r, estado } = montarComRelogio();
    const t0 = Date.now();
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    const gasto = Date.now() - t0;
    ok('as duas gerações se sobrepõem de verdade (pico simultâneo = 2)', () => {
      assert.equal(estado.pico, 2, 'pico simultâneo: ' + estado.pico + ' · gerações: ' + estado.chamadas);
      assert.equal(estado.chamadas, 2, 'gerações: ' + estado.chamadas);
      assert.equal(saida.amostras, 2);
      assert(gasto < 240, 'gastou ' + gasto + ' ms');
    });
  }

  {
    const { r, estado } = montarComRelogio({ opcoes: { amostrasEmParalelo: false } });
    const t0 = Date.now();
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    const gasto = Date.now() - t0;
    ok('opção amostrasEmParalelo: false mantém o caminho sequencial (uma depois da outra)', () => {
      assert.equal(estado.pico, 1, 'pico simultâneo: ' + estado.pico);
      assert.equal(estado.chamadas, 2, 'gerações: ' + estado.chamadas);
      assert(gasto >= 230, 'gastou só ' + gasto + ' ms — não esperou as duas');
      assert.equal(saida.amostras, 2);
    });
  }

  {
    // a melhor nota vence, venha ela da amostra que vier
    const { r } = montar((i) => (i === 0 ? 'A biblioteca empresta livros.' : completa));
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('em paralelo, vence a amostra de melhor nota (e não a primeira que chegou)', () => {
      assert.equal(saida.amostras, 2, 'amostras: ' + saida.amostras);
      assert.equal(saida.texto, completa, 'entregou: ' + JSON.stringify(String(saida.texto).slice(0, 60)));
    });
  }

  {
    // pergunta repetida: cache atende as duas amostras, sem chamada nova
    const { r, pedidos } = montar(() => completa);
    const primeira = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    const antes = pedidos.length;
    const segunda = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('pergunta repetida não gasta geração nova em paralelo (cache vale para as duas)', () => {
      assert.equal(antes, 2, 'gerações na primeira: ' + antes);
      assert.equal(pedidos.length, antes, 'gerou de novo: ' + pedidos.length);
      assert.equal(segunda.cache, true, 'não veio do cache');
      assert.equal(primeira.texto, segunda.texto);
    });
  }

  {
    const curta = 'A biblioteca empresta livros.';
    const { r, pedidos } = montar((i) => (i < 3 ? curta : completa), { amostrasEmParalelo: false });
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('no caminho sequencial, amostra deficiente perde para a segunda', () => {
      assert.equal(pedidos.length, 4, 'gerações: ' + pedidos.length + ' (3 tentativas da 1ª + 2ª)');
      assert.equal(saida.amostras, 2, 'amostras: ' + saida.amostras);
      assert.equal(saida.daSegunda, true, 'a segunda deveria ter vencido');
      assert.equal(saida.texto, completa);
    });
  }

  {
    const ruim = 'Não sei.';
    const r2 = new Roteador(Object.assign({}, { catalogo: CATALOGO_FALSO, amostrasAberto: 2, amostrasEmParalelo: false }));
    let k = 0;
    r2._gerar = async () => (k++ === 0
      ? { texto: completa, rota: 'falsa', confianca: 'alta', ms: 1 }
      : { texto: ruim, rota: 'falsa', confianca: 'alta', ms: 1 });
    const saida = await r2.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('amostra pior não vence só por ser a última', () => {
      assert.notEqual(saida.texto, ruim, 'entregou a amostra pior');
      assert(!saida.daSegunda, 'não deveria ter vindo da segunda');
    });
  }

  {
    const { r, pedidos } = montar((i) => (i < 3 ? 'A biblioteca empresta livros.' : completa));
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true, semSegundaAmostra: true });
    ok('pedido pode desligar a segunda amostra', () => {
      assert.equal(saida.amostras, undefined, 'marcou amostras: ' + saida.amostras);
      assert(pedidos.every((t) => t === 'A biblioteca empresta livros.'), 'houve geração de outra amostra');
    });
  }

  {
    const r = new Roteador({ catalogo: CATALOGO_FALSO, amostrasAberto: 1 });
    let geracoes = 0;
    r._gerar = async () => { geracoes++; return { texto: 'Curto.', rota: 'falsa', confianca: 'alta', ms: 1 }; };
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('opção amostrasAberto: 1 volta ao comportamento de uma amostra', () => {
      assert.equal(saida.amostras, undefined, 'marcou amostras: ' + saida.amostras);
      assert(geracoes >= 1, 'não gerou nada');
    });
  }

  {
    const r = new Roteador({ catalogo: CATALOGO_FALSO });
    let geracoes = 0;
    r._gerar = async () => { geracoes++; return { texto: '```\nfunction soma(a, b) { return a + b; }\n```', rota: 'falsa', confianca: 'alta', ms: 1 }; };
    await r.responder({ pergunta: 'Escreva um código que soma dois números.', tipo: 'codigo' });
    ok('pergunta que não é aberta não paga o custo da segunda amostra', () => {
      assert.equal(geracoes, 1, 'gerações: ' + geracoes);
    });
  }

  console.log('\n' + n + ' contratos da segunda amostra passaram');
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
