// Bateria DIFÍCIL — para achar o teto do chat, não para confirmar que ele acerta fácil.
// 31/10/2026. Correção automática; itens escolhidos para punir modelo pequeno e exigir
// raciocínio de vários passos.
'use strict';
const fs = require('fs');
const { Roteador } = require('/home/user/chat-main/roteador-ia.js');

const ITENS = [
  { id: 'd1', d: 'numérico', q: 'Sequência: 3, 7, 16, 35, 74, ? (a regra muda a cada passo: dobre e some 1, depois 2, depois 3, e assim por diante). Responda só o número.', ok: ['153'] },
  { id: 'd2', d: 'numérico', q: 'Quantos números inteiros de 1 a 1000 contêm pelo menos um dígito 7? Responda só o número.', ok: ['271'] },
  { id: 'd3', d: 'numérico', q: 'Uma torneira enche um tanque em 6 horas e outra em 4 horas. As duas abertas juntas enchem em quantas horas? Responda só o número decimal.', ok: ['2,4|2.4'] },
  { id: 'd4', d: 'numérico', q: 'Ana tem o dobro da idade de Bia. Em 10 anos, Ana terá uma vez e meia a idade de Bia. Quantos anos tem Bia hoje? Responda só o número.', ok: ['10'] },
  { id: 'd5', d: 'lógica', q: 'Nenhum A é B. Algum C é B. É válido concluir que algum C não é A? Responda SIM ou NÃO.', ok: ['sim'] },
  { id: 'd6', d: 'lógica', q: 'Todos os X são Y. Nenhum Y é Z. É válido concluir que nenhum X é Z? Responda SIM ou NÃO.', ok: ['sim'] },
  { id: 'd7', d: 'lógica', q: 'Cinco pessoas sentam em fila. Ana está antes de Bia. Bia está antes de Caio. Davi está antes de Ana. Edu está depois de Caio. Quem é o primeiro da fila? Responda só o nome.', ok: ['davi'] },
  { id: 'd8', d: 'verbal', q: 'Sequência de letras: A, C, F, J, O, ? (as distâncias crescem: 2, 3, 4, 5, 6). Responda só a letra.', ok: ['u'] },
  { id: 'd9', d: 'verbal', q: 'Qual palavra completa a analogia: "livro está para capítulo assim como sinfonia está para ______"? Responda só a palavra.', ok: ['movimento|movimentos'] },
  { id: 'd10', d: 'verbal', q: 'Numa frase: "O time jogou mal, mas venceu; o técnico, porém, não ficou satisfeito." O técnico ficou satisfeito com o resultado? Responda SIM ou NÃO.', ok: ['não|nao'] },
  { id: 'd11', d: 'probabilidade', q: 'Duas moedas justas são lançadas. Qual a probabilidade de sair exatamente uma cara? Responda só a fração.', ok: ['1/2|50'] },
  { id: 'd12', d: 'probabilidade', q: 'Numa urna há 3 bolas vermelhas e 2 azuis. Tiro duas sem repor. Qual a probabilidade de ambas serem vermelhas? Responda só a fração.', ok: ['3/10|0,3|0.3'] },
  { id: 'd13', d: 'execução', q: 'Quanto é 48271 vezes 3917? Responda só o número.', ok: ['189077507'] },
  { id: 'd14', d: 'execução', q: 'Quanto é 987654 dividido por 3? Responda só o número.', ok: ['329218'] },
  { id: 'd15', d: 'código', q: 'Em Python, o que imprime print([i*2 for i in range(3)])? Responda só a lista.', ok: ['[0, 2, 4]|[0,2,4]'] },
  { id: 'd16', d: 'código', q: 'Em JavaScript, o que vale typeof null? Responda só o valor.', ok: ['object'] },
  { id: 'd17', d: 'código', q: 'Qual é o resultado de 0.1 + 0.2 === 0.3 em JavaScript? Responda só SIM ou NÃO.', ok: ['não|nao'] },
  { id: 'd18', d: 'abstrato', q: 'Uma matriz 2x2 tem na primeira linha: quadrado preto, círculo branco; na segunda: círculo branco, quadrado preto. Se a regra é inverter as cores da diagonal principal, o que fica na posição (1,1)? Responda só: quadrado branco, quadrado preto, círculo branco ou círculo preto.', ok: ['quadrado branco'] },
];

const INSTRUCAO = '\nResponda SOMENTE com o valor pedido.';
const CONC = 3;
function numeros(t) {
  const limpo = t
    .replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1')
    .replace(/(\d),(\d)/g, '$1.$2');
  return (limpo.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}
function corrigir(item, texto) {
  const t = String(texto || '').toLowerCase().trim();
  if (!t) return false;
  const ns = numeros(t);
  return item.ok.some((alt) => alt.split('|').some((a) => {
    const alvo = a.toLowerCase().trim();
    if (/^-?[\d.,]+$/.test(alvo)) {
      const querido = numeros(alvo)[0];
      return ns.some((n) => n === querido);
    }
    return t.includes(alvo);
  }));
}
(async () => {
  const r = new Roteador({ amostrasAberto: 1 });
  const res = [];
  let i = 0;
  async function w() {
    while (i < ITENS.length) {
      const it = ITENS[i++];
      const t0 = Date.now();
      let o;
      try { o = await r.responder({ pergunta: it.q + INSTRUCAO, tipo: 'curto' }); }
      catch (e) { o = { texto: null, erro: String(e && e.message) }; }
      const ok = corrigir(it, o && o.texto);
      res.push({ id: it.id, d: it.d, ok, ms: Date.now() - t0, rota: (o && o.rota) || null,
        texto: String((o && o.texto) || '').slice(0, 200) });
      console.log((ok ? '✔' : '✘') + ' ' + it.id.padEnd(4) + String(Date.now() - t0).padStart(6) + 'ms '
        + String((o && o.rota) || '-').padEnd(12) + ' ' + String((o && o.texto) || '').replace(/\n/g, ' ').slice(0, 80));
    }
  }
  await Promise.all(Array.from({ length: CONC }, w));
  const certos = res.filter((x) => x.ok).length;
  const dom = {};
  for (const x of res) { dom[x.d] = dom[x.d] || { total: 0, certos: 0 }; dom[x.d].total++; if (x.ok) dom[x.d].certos++; }
  const ms = res.map((x) => x.ms).sort((a, b) => a - b);
  const saida = { quando: new Date().toISOString(), total: ITENS.length, certos,
    pct: +(100 * certos / ITENS.length).toFixed(1), porDominio: dom, medianaMs: ms[Math.floor(ms.length / 2)], tentativas: res };
  fs.writeFileSync('/home/user/qi-dificil.json', JSON.stringify(saida, null, 1));
  console.log('\n== DIFÍCIL', certos + '/' + saida.total, '(' + saida.pct + '%)');
  console.table(dom);
})();
