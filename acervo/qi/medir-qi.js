// QI do chat, medido em itens no estilo de teste humano — 31/10/2026.
// Roda o roteador REAL do chat (roteador-ia.js) contra 30 itens de 7 domínios.
// Correção automática por gabarito. Não abre navegador: usa as mesmas rotas públicas.
'use strict';
const fs = require('fs');
const path = require('path');
const { Roteador } = require('/home/user/chat-main/roteador-ia.js');

const ITENS = [
  // ---- raciocínio numérico
  { id: 'num1', d: 'numérico', q: 'Qual número continua a sequência: 2, 6, 12, 20, 30, ?', ok: ['42'] },
  { id: 'num2', d: 'numérico', q: 'Qual número continua a sequência: 1, 4, 9, 16, 25, ?', ok: ['36'] },
  { id: 'num3', d: 'numérico', q: 'Um lápis custa 3 reais e uma caneta custa 7 reais. Comprei 4 lápis e 3 canetas. Quanto paguei, em reais?', ok: ['33'] },
  { id: 'num4', d: 'numérico', q: 'Se 5 operários fazem uma obra em 12 dias, quantos dias levam 10 operários no mesmo ritmo?', ok: ['6'] },
  { id: 'num5', d: 'numérico', q: 'Qual é 37% de 200?', ok: ['74'] },
  // ---- raciocínio verbal (analogia / vocabulário)
  { id: 'ver1', d: 'verbal', q: 'Complete a analogia: médico está para hospital assim como professor está para ______. Responda só a palavra.', ok: ['escola'] },
  { id: 'ver2', d: 'verbal', q: 'Qual palavra NÃO pertence ao grupo: cadeira, mesa, sofá, geladeira, estante? Responda só a palavra.', ok: ['geladeira'] },
  { id: 'ver3', d: 'verbal', q: 'Qual é o sinônimo mais próximo de "efêmero": (A) passageiro (B) eterno (C) pesado (D) barulhento? Responda só a letra e a palavra.', ok: ['passageiro'] },
  { id: 'ver4', d: 'verbal', q: 'Qual é o antônimo de "escasso": (A) raro (B) abundante (C) pequeno (D) frágil? Responda só a letra e a palavra.', ok: ['abundante'] },
  // ---- lógica dedutiva
  { id: 'log1', d: 'lógica', q: 'Todos os gatos são mamíferos. Alguns mamíferos voam. Conclui-se que todos os gatos voam? Responda SIM ou NÃO.', ok: ['não|nao'] },
  { id: 'log2', d: 'lógica', q: 'Se chove, a rua fica molhada. A rua não está molhada. Podemos concluir que não choveu? Responda SIM ou NÃO.', ok: ['sim'] },
  { id: 'log3', d: 'lógica', q: 'Ana é mais velha que Bia. Bia é mais velha que Carla. Quem é a mais nova? Responda só o nome.', ok: ['carla'] },
  { id: 'log4', d: 'lógica', q: 'Num grupo de 10 pessoas, 6 falam inglês, 5 falam espanhol e 3 falam as duas línguas. Quantas não falam nenhuma das duas?', ok: ['2'] },
  // ---- memória de trabalho
  { id: 'mem1', d: 'memória', q: 'Memorize esta lista: 7, azul, cadeira, 14, rápido. Escreva o terceiro item da lista. Responda só ele.', ok: ['cadeira'] },
  { id: 'mem2', d: 'memória', q: 'Memorize: 7, azul, cadeira, 14, rápido. Some o primeiro e o quarto número. Responda só o resultado.', ok: ['21'] },
  { id: 'mem3', d: 'memória', q: 'Repita de trás para frente a sequência de letras: C A S A. Responda só a sequência invertida.', ok: ['a s a c|asac'] },
  // ---- raciocínio abstrato (matriz descrita em texto)
  { id: 'abs1', d: 'abstrato', q: 'Uma figura aponta para o norte. A cada passo ela gira 90 graus no sentido horário. Para onde ela aponta no quinto passo? Responda só o ponto cardeal.', ok: ['leste'] },
  { id: 'abs2', d: 'abstrato', q: 'Se a regra é: cada figura da linha 2 tem o dobro de lados da figura da linha 1 na mesma coluna. A linha 1 tem triângulo, quadrado, pentágono. Quantos lados tem a primeira figura da linha 2?', ok: ['6'] },
  // ---- conhecimento geral
  { id: 'con1', d: 'conhecimento', q: 'Qual é a capital da Austrália? Responda só a cidade.', ok: ['canberra'] },
  { id: 'con2', d: 'conhecimento', q: 'Quem escreveu "Dom Casmurro"? Responda só o nome.', ok: ['machado'] },
  { id: 'con3', d: 'conhecimento', q: 'Qual é o maior planeta do Sistema Solar? Responda só o nome.', ok: ['júpiter|jupiter'] },
  { id: 'con4', d: 'conhecimento', q: 'Em que ano o Brasil proclamou a República? Responda só o ano.', ok: ['1889'] },
  { id: 'con5', d: 'conhecimento', q: 'Qual é a moeda oficial do Japão? Responda só o nome.', ok: ['iene|yen'] },
  // ---- código
  { id: 'cod1', d: 'código', q: 'Em Python, qual é o resultado de len([1,2,3]) + 2? Responda só o número.', ok: ['5'] },
  { id: 'cod2', d: 'código', q: 'Em JavaScript, qual é o resultado de [1,2,3].map(x => x * 2).join("-")? Responda só o resultado.', ok: ['2-4-6'] },
  { id: 'cod3', d: 'código', q: 'Escreva em uma linha de Python a soma dos números pares de 1 a 10. Responda só o código.', ok: ['sum'] },
  // ---- execução / ferramenta (aritmética exata do produto)
  { id: 'exe1', d: 'execução', q: 'Quanto é 1234 vezes 5678? Responda só o número.', ok: ['7006652|7.006.652'] },
  { id: 'exe2', d: 'execução', q: 'Qual é a raiz quadrada de 1764? Responda só o número.', ok: ['42'] },
  { id: 'exe3', d: 'execução', q: 'Quantos dias há entre 1 de janeiro de 2026 e 1 de março de 2026 (ano não bissexto)? Responda só o número.', ok: ['59'] },
];

const INSTRUCAO = '\nResponda SOMENTE com o valor pedido, sem explicação, sem repetir a pergunta. Se for escolha, escreva a alternativa.';
const CONC = 3;

function corrigir(item, texto) {
  const t = String(texto || '').toLowerCase();
  if (!t.trim()) return false;
  return item.ok.some((alt) => alt.split('|').some((a) => {
    const alvo = a.toLowerCase();
    // número: casa como token isolado (evita "42" dentro de "1420")
    if (/^[\d.\-]+$/.test(alvo)) {
      const limpo = alvo.replace(/\./g, '');
      return new RegExp('(^|[^\\d])' + limpo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\d]|$)').test(t);
    }
    return t.includes(alvo);
  }));
}

(async () => {
  const r = new Roteador({ amostrasAberto: 1 });
  const resultados = [];
  let i = 0;
  async function trabalhador() {
    while (i < ITENS.length) {
      const item = ITENS[i++];
      const t0 = Date.now();
      let o;
      try {
        o = await r.responder({ pergunta: item.q + INSTRUCAO, tipo: 'curto' });
      } catch (e) { o = { texto: null, erro: String(e && e.message) }; }
      const ok = corrigir(item, o && o.texto);
      resultados.push({ id: item.id, d: item.d, ok, ms: Date.now() - t0,
        rota: (o && o.rota) || null, erro: (o && o.erro) || null,
        texto: String((o && o.texto) || '').slice(0, 160) });
      console.log((ok ? '✔' : '✘') + ' ' + item.id.padEnd(5) + String(Date.now() - t0).padStart(6) + 'ms  '
        + String((o && o.rota) || 'sem rota').padEnd(14) + ' ' + String((o && o.texto) || o && o.erro || '').replace(/\n/g, ' ').slice(0, 70));
    }
  }
  await Promise.all(Array.from({ length: CONC }, trabalhador));

  const porDominio = {};
  for (const x of resultados) {
    porDominio[x.d] = porDominio[x.d] || { total: 0, certos: 0 };
    porDominio[x.d].total++;
    if (x.ok) porDominio[x.d].certos++;
  }
  const certos = resultados.filter((x) => x.ok).length;
  const ms = resultados.map((x) => x.ms).sort((a, b) => a - b);
  const saida = {
    quando: new Date().toISOString(), total: ITENS.length, certos,
    pct: +(100 * certos / ITENS.length).toFixed(1),
    porDominio: Object.fromEntries(Object.entries(porDominio).map(([k, v]) =>
      [k, { ...v, pct: +(100 * v.certos / v.total).toFixed(1) }])),
    medianaMs: ms[Math.floor(ms.length / 2)],
    tentativas: resultados,
  };
  fs.writeFileSync('/home/user/qi-bruto.json', JSON.stringify(saida, null, 1));
  console.log('\n== RESULTADO', certos + '/' + saida.total, '(' + saida.pct + '%)', 'mediana', saida.medianaMs, 'ms');
  console.table(saida.porDominio);
})();
