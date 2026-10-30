// Contratos da segunda amostra nas perguntas abertas (rodada 108).
// O número que justificou a mudança: janela de 144 respostas, A 63/72 x B 71/72, McNemar p=0,0078.
// Aqui se verifica o COMPORTAMENTO, não a qualidade: quando pede a segunda, quando não pede, e se
// escolhe pela pontuação interna — não por comprimento nem por ordem.
'use strict';
const assert = require('assert');
const { Roteador } = require('../../roteador-ia.js');

let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }

const PERGUNTA = 'Explique em dois parágrafos como funciona uma biblioteca que empresta livros.';
const completa = 'A biblioteca organiza os livros em estantes por assunto e mantém um catálogo que ' +
  'liga cada obra ao seu endereço na prateleira, de modo que qualquer pessoa encontre o volume pelo ' +
  'título, pelo autor ou pelo tema. O empréstimo é registrado no cadastro do leitor, com prazo de ' +
  'devolução e possibilidade de renovação quando ninguém mais espera pelo exemplar.' +
  '\n\nA reserva permite aguardar por uma obra que está com outra pessoa, e o sistema avisa o ' +
  'leitor quando ela retorna, garantindo que a fila seja respeitada na ordem de chegada. Quando o ' +
  'prazo vence sem devolução, a biblioteca envia um lembrete, suspende temporariamente novos ' +
  'empréstimos daquele cadastro e libera a obra para o próximo interessado da lista.';

// `roteiro(i)` decide o texto da i-ésima geração. O roteador tenta até 3 vezes por amostra quando o
// texto é reprovado, então a primeira amostra "ruim" precisa de 3 gerações ruins antes da segunda.
function montar(roteiro) {
  const r = new Roteador({ catalogo: [{ id: 'falsa', nome: 'falsa', base: 'https://falso.invalid/v1', modelo: 'm', classe: 'forte', peso: 90 }] });
  const pedidos = [];
  r._gerar = async () => {
    const texto = roteiro(pedidos.length);
    pedidos.push(texto);
    return { texto, rota: 'falsa', confianca: 'alta', ms: 1 };
  };
  return { r, pedidos };
}

(async () => {
  {
    // O produto faz duas amostras SEMPRE nas abertas — é o desenho que foi medido (o custo é
    // declarado no documento da rodada). Empate fica com a primeira, para não trocar texto bom.
    const { r, pedidos } = montar(() => completa);
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('pergunta aberta paga duas amostras, como no experimento', () => {
      assert.equal(pedidos.length, 2, 'gerações: ' + pedidos.length);
      assert.equal(saida.amostras, 2, 'amostras: ' + saida.amostras);
      assert(!saida.daSegunda, 'empate deve ficar com a primeira');
    });
  }

  {
    const curta = 'A biblioteca empresta livros.';
    const { r, pedidos } = montar((i) => (i < 3 ? curta : completa));
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('primeira amostra deficiente perde para a segunda, e a segunda é entregue', () => {
      assert.equal(pedidos.length, 4, 'gerações: ' + pedidos.length + ' (3 tentativas da 1ª + 2ª)');
      assert.equal(saida.amostras, 2, 'amostras: ' + saida.amostras);
      assert.equal(saida.daSegunda, true, 'a segunda deveria ter vencido');
      assert(saida.texto.length > curta.length, 'ficou com a resposta curta');
    });
  }

  {
    // a segunda é pior: tem de perder, mesmo vindo depois
    const ruim = 'Não sei.';
    const r2 = new Roteador({ catalogo: [{ id: 'falsa', nome: 'falsa', base: 'https://falso.invalid/v1', modelo: 'm', classe: 'forte', peso: 90 }], amostrasAberto: 2 });
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
      // com a segunda desligada, nenhuma geração boa aparece depois das 3 tentativas da primeira
      assert(pedidos.every((t) => t === 'A biblioteca empresta livros.'), 'houve geração de outra amostra');
    });
  }

  {
    const r = new Roteador({
      catalogo: [{ id: 'falsa', nome: 'falsa', base: 'https://falso.invalid/v1', modelo: 'm', classe: 'forte', peso: 90 }],
      amostrasAberto: 1
    });
    let geracoes = 0;
    r._gerar = async () => { geracoes++; return { texto: 'Curto.', rota: 'falsa', confianca: 'alta', ms: 1 }; };
    const saida = await r.responder({ pergunta: PERGUNTA, tipo: 'aberto', semFerramenta: true });
    ok('opção amostrasAberto: 1 volta ao comportamento de uma amostra', () => {
      assert.equal(saida.amostras, undefined, 'marcou amostras: ' + saida.amostras);
      assert(geracoes >= 1, 'não gerou nada');
    });
  }

  {
    const r = new Roteador({ catalogo: [{ id: 'falsa', nome: 'falsa', base: 'https://falso.invalid/v1', modelo: 'm', classe: 'forte', peso: 90 }] });
    let geracoes = 0;
    r._gerar = async () => { geracoes++; return { texto: '```\nfunction soma(a, b) { return a + b; }\n```', rota: 'falsa', confianca: 'alta', ms: 1 }; };
    await r.responder({ pergunta: 'Escreva um código que soma dois números.', tipo: 'codigo' });
    ok('pergunta que não é aberta não paga o custo da segunda amostra', () => {
      assert.equal(geracoes, 1, 'gerações: ' + geracoes);
    });
  }

  console.log('\n' + n + ' contratos da segunda amostra passaram');
})().catch((e) => { console.error('✘ ' + e.message); process.exit(1); });
