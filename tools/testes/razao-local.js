// BANCADA DO RACIOCÍNIO LOCAL (31/10/2026).
// Cada linha é um pedido real da bateria de QI da casa com a resposta certa conferida à mão.
// `null` = o módulo NÃO deve se meter (pergunta aberta/conhecimento): quem responde é o modelo.
'use strict';
const R = require('../../razao-local.js');

const CASOS = [
  // difícil — as três classes que erravam sempre
  ['Sequência: 3, 7, 16, 35, 74, ? (a regra muda a cada passo: dobre e some 1, depois 2, depois 3, e assim por diante). Responda só o número.', '153'],
  ['Quantos números inteiros de 1 a 1000 contêm pelo menos um dígito 7? Responda só o número.', '271'],
  ['Uma torneira enche um tanque em 6 horas e outra em 4 horas. As duas abertas juntas enchem em quantas horas? Responda só o número decimal.', '2,4'],
  ['Ana tem o dobro da idade de Bia. Em 10 anos, Ana terá uma vez e meia a idade de Bia. Quantos anos tem Bia hoje? Responda só o número.', '10'],
  ['Nenhum A é B. Algum C é B. É válido concluir que algum C não é A? Responda SIM ou NÃO.', 'sim'],
  ['Todos os X são Y. Nenhum Y é Z. É válido concluir que nenhum X é Z? Responda SIM ou NÃO.', 'sim'],
  ['Cinco pessoas sentam em fila. Ana está antes de Bia. Bia está antes de Caio. Davi está antes de Ana. Edu está depois de Caio. Quem é o primeiro da fila? Responda só o nome.', 'davi'],
  ['Duas moedas justas são lançadas. Qual a probabilidade de sair exatamente uma cara? Responda só a fração.', '1/2'],
  ['Numa urna há 3 bolas vermelhas e 2 azuis. Tiro duas sem repor. Qual a probabilidade de ambas serem vermelhas? Responda só a fração.', '3/10'],
  ['Uma matriz 2x2 tem na primeira linha: quadrado preto, círculo branco; na segunda: círculo branco, quadrado preto. Se a regra é inverter as cores da diagonal principal, o que fica na posição (1,1)? Responda só: quadrado branco, quadrado preto, círculo branco ou círculo preto.', 'quadrado branco'],

  // fácil — mesmas classes, forma mais simples
  ['Qual número continua a sequência: 2, 6, 12, 20, 30, ?', '42'],
  ['Qual número continua a sequência: 1, 4, 9, 16, 25, ?', '36'],
  ['Um lápis custa 3 reais e uma caneta custa 7 reais. Comprei 4 lápis e 3 canetas. Quanto paguei, em reais?', '33'],
  ['Se 5 operários fazem uma obra em 12 dias, quantos dias levam 10 operários no mesmo ritmo?', '6'],
  ['Qual é 37% de 200?', null],                                  // já resolvido pela ferramenta de porcentagem
  ['Todos os gatos são mamíferos. Alguns mamíferos voam. Conclui-se que todos os gatos voam? Responda SIM ou NÃO.', 'não'],
  ['Se chove, a rua fica molhada. A rua não está molhada. Podemos concluir que não choveu? Responda SIM ou NÃO.', 'sim'],
  ['Ana é mais velha que Bia. Bia é mais velha que Carla. Quem é a mais nova? Responda só o nome.', 'carla'],
  ['Num grupo de 10 pessoas, 6 falam inglês, 5 falam espanhol e 3 falam as duas línguas. Quantas não falam nenhuma das duas?', '2'],
  ['Memorize esta lista: 7, azul, cadeira, 14, rápido. Escreva o terceiro item da lista. Responda só ele.', 'cadeira'],
  ['Memorize: 7, azul, cadeira, 14, rápido. Some o primeiro e o quarto número. Responda só o resultado.', '21'],
  ['Repita de trás para frente a sequência de letras: C A S A. Responda só a sequência invertida.', 'a s a c'],
  ['Uma figura aponta para o norte. A cada passo ela gira 90 graus no sentido horário. Para onde ela aponta no quinto passo? Responda só o ponto cardeal.', 'leste'],
  ['Se a regra é: cada figura da linha 2 tem o dobro de lados da figura da linha 1 na mesma coluna. A linha 1 tem triângulo, quadrado, pentágono. Quantos lados tem a primeira figura da linha 2?', '6'],
  ['Em Python, qual é o resultado de len([1,2,3]) + 2? Responda só o número.', '5'],
  ['Em JavaScript, qual é o resultado de [1,2,3].map(x => x * 2).join("-")? Responda só o resultado.', '2-4-6'],
  ['Em Python, o que imprime print([i*2 for i in range(3)])? Responda só a lista.', '[0, 2, 4]'],
  ['Em JavaScript, o que vale typeof null? Responda só o valor.', 'object'],
  ['Em Python, o que vale len("casa")?', '4'],

  // pedidos que PARECEM os de cima mas não são: responder errado seria pior que não responder
  ['Uma torneira enche um tanque em 6 horas e outra o esvazia em 4 horas. As duas abertas juntas enchem em quantas horas? Responda só o número decimal.', null],
  ['Uma matriz 2x2 tem na primeira linha: quadrado preto, círculo branco; na segunda: círculo branco, quadrado preto. Se a regra é trocar as posições da diagonal, o que fica na posição (1,1)? Responda só: quadrado branco ou quadrado preto.', null],
  ['Uma urna tem 3 bolas vermelhas e 2 azuis. Tiro duas COM reposição. Qual a probabilidade de ambas serem vermelhas? Responda só a fração.', '9/25'],
  ['Três moedas justas são lançadas. Qual a probabilidade de sair exatamente duas caras? Responda só a fração.', '3/8'],
  ['Uma figura aponta para o norte. A cada passo ela gira 45 graus no sentido horário. Para onde aponta no terceiro passo? Responda só o ponto cardeal.', null],
  ['Pedro é mais velho que Ana. Ana é mais velha que Zeca. Quem é o mais velho? Responda só o nome.', 'Pedro'],
  // não deve se meter: quem responde é o modelo
  ['Explique o que é fotossíntese.', null],
  ['Qual é a capital da Austrália? Responda só a cidade.', null],
  ['Quem escreveu "Dom Casmurro"? Responda só o nome.', null],
  // até a rodada 135 isto era do modelo; a rodada 136 implementou a forma exata (codigoSoma)
  ['Escreva em uma linha de Python a soma dos números pares de 1 a 10. Responda só o código.', 'if x % 2 == 0'],
  ['Qual é o sinônimo mais próximo de "efêmero": (A) passageiro (B) eterno? Responda só a letra e a palavra.', 'passageiro']
];

// ARMADILHAS: perguntas que parecem as resolvíveis mas cuja resposta certa NÃO é a forma
// conhecida. Aqui o certo é o módulo ficar calado (ou responder o valor do campo `esperado`).
// Elas já acharam 6 respostas exatas erradas em 31/10/2026 — probabilidade encadeada, desconto,
// operário que adoece, rotação com sentido que inverte, código com .length e silogismo contraditório.
const ARMADILHAS = require('../armadilhas-do-chat.json').armadilhas;

let certos = 0;
const falhas = [];
for (const [q, esperado] of CASOS) {
  const r = R.resolver(q);
  const obtido = r ? String(r.texto) : null;
  let ok;
  if (esperado === null) ok = obtido === null;
  else ok = obtido !== null && obtido.toLowerCase().indexOf(esperado.toLowerCase()) !== -1;
  if (ok) certos++;
  else falhas.push({ q: q.slice(0, 70), esperado, obtido });
}
// --- armadilhas do módulo (as que dependem de _ferramenta ficam no auto-melhoria) ---
const SEM_MÓDULO = new Set(['porcentagem']);
for (const a of ARMADILHAS) {
  if (SEM_MÓDULO.has(a.por)) continue;
  const r = R.resolver(a.q);
  const obtido = r ? String(r.texto) : null;
  const temEsperado = Object.prototype.hasOwnProperty.call(a, 'esperado');
  const ok = temEsperado
    ? (obtido !== null && obtido.toLowerCase().indexOf(String(a.esperado).toLowerCase()) !== -1)
    : obtido === null;
  if (ok) certos++;
  else falhas.push({ q: 'ARMADILHA ' + a.id, esperado: temEsperado ? a.esperado : null, obtido });
}

for (const f of falhas) console.error('✘ ' + f.q + ' → ' + JSON.stringify(f.obtido) + ' (esperado ' + JSON.stringify(f.esperado) + ')');
console.log((falhas.length ? '✘ ' : '✔ ') + certos + '/' + (CASOS.length + (ARMADILHAS.length - SEM_MÓDULO.size)) + ' casos de raciocínio local (provas + armadilhas)');
process.exit(falhas.length ? 1 : 0);
