// CONTA FALADA (31/10/2026) — a calculadora do chat tem de entender português.
//
// DEFEITO MEDIDO: no teste de QI da casa, "quanto é 1234 vezes 5678?" não usou a calculadora
// local (ela só entendia `*`), foi parar num modelo pequeno e voltou ",170,000" — errado por
// dois milhões. Qualquer coisa depois da conta ("responda só o número") também desligava o
// atalho, e é assim que gente fala.
//
// Este teste roda offline: só a ferramenta local, sem rede, sem chave, sem modelo.
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

(async () => {
  const r = new Roteador({ ferramentasLigadas: true });
  const valor = async (q) => {
    const f = await r._ferramenta(q);
    return f ? String(f.texto) : null;
  };

  await testa('lê "vezes" como multiplicação', async () => {
    assert.equal(await valor('quanto é 1234 vezes 5678? Responda só o número.'), '7006652');
  });
  await testa('lê "dividido por"', async () => {
    assert.equal(await valor('quanto é 144 dividido por 12'), '12');
  });
  await testa('lê "mais" e "menos"', async () => {
    assert.equal(await valor('quanto é 40 mais 2'), '42');
    assert.equal(await valor('quanto é 40 menos 2'), '38');
  });
  await testa('lê "multiplicado por" e "elevado a"', async () => {
    assert.equal(await valor('calcule 12 multiplicado por 12'), '144');
    assert.equal(await valor('calcule 2 elevado a 10'), '1024');
  });
  await testa('aceita cauda depois da conta (é assim que gente fala)', async () => {
    assert.equal(await valor('quanto é 7 vezes 6? quero só o número, por favor'), '42');
  });
  await testa('aceita instrução em LINHA SEPARADA depois da conta', async () => {
    // Caso real: 48271 × 3917 com "Responda só o número." e uma segunda linha de instrução.
    // Com regex de ponto único, a última linha (a instrução) era lida como a conta.
    assert.equal(await valor('quanto é 48271 vezes 3917? Responda só o número.\nResponda SOMENTE com o valor pedido.'), '189077507');
    assert.equal(await valor('Quanto é 1234 vezes 5678? Responda só o número.\nResponda SOMENTE com o valor pedido.'), '7006652');
  });
  await testa('aceita x como sinal', async () => {
    assert.equal(await valor('calcule 16x12'), '192');
  });
  await testa('não engole porcentagem (continua na regra própria)', async () => {
    assert.equal(await valor('Quanto é 37% de 200?'), '74');
  });
  await testa('não transforma pergunta comum em conta', async () => {
    assert.equal(internos.contaFalada('quanto é a capital da França?'), null);
    assert.equal(internos.contaFalada('quantos jogos a casa tem publicados?'), null);
  });
  await testa('não aceita texto com operador demais (evita falso positivo)', async () => {
    assert.equal(internos.contaFalada('quanto é mais ou menos isso que eu falei antes, ok'), null);
  });
  await testa('a conta exata não depende de modelo nem de rede', async () => {
    const f = await r._ferramenta('quanto é 1234 vezes 5678?');
    assert.equal(f.ferramenta, 'calculo');
    assert.match(f.fonte, /local/);
  });
  await testa('preserva o caminho antigo com símbolos', async () => {
    assert.equal(await valor('quanto é 2*3+4'), '10');
    assert.equal(await valor('quanto é (10+2)/3'), '4');
  });
  await testa('divisão por zero não vira número inventado', async () => {
    const v = await valor('quanto é 5 dividido por 0');
    assert(v === null || !/Infinity|NaN/.test(v), 'devolveu ' + v);
  });

  console.log('');
  if (falhas.length) {
    console.error(falhas.length + ' de ' + (certos + falhas.length) + ' verificações da conta falada FALHARAM');
    process.exit(1);
  }
  console.log(certos + '/' + certos + ' verificações da conta falada passaram');
})();
