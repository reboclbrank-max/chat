// Lê o resultado pareado da busca viva e responde três perguntas, com os números na frente:
//   1. a nota total mudou? (A vs B, por grupo, e o diff item a item)
//   2. os itens que falhavam por FATO passaram a passar?
//   3. quanto custou (chamadas, ms e consultas de fonte)?
// Não julga se o texto é verdadeiro fora dos padrões do gabarito — a régua é a mesma das rodadas.
'use strict';
const fs = require('fs');
const path = require('path');

const arquivo = process.argv[2] || path.join(__dirname, 'resultado-fonte-viva-106.json');
const d = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const res = d.res || [];
const alvo = [16, 13, 14, 17, 22];

const grupos = ['original', 'holdout', 'novo', 'repeticoes', 'total'];
const doGrupo = (g) => (g === 'total' ? res : res.filter((r) =>
  g === 'repeticoes' ? r.repeticao > 0 : r.grupo === g && r.repeticao === 0));

console.log('Arquivo: ' + path.basename(arquivo));
console.log('Janela: ' + d.meta.iniciado + ' → ' + d.meta.terminado + '  ·  ' + res.length + ' respostas');
console.log('A = ' + d.meta.versoes.A + '\nB = ' + d.meta.versoes.B + '\n');

console.log('grupo          A            B            diff');
for (const g of grupos) {
  const ls = doGrupo(g);
  const a = ls.filter((r) => r.versao === 'A');
  const b = ls.filter((r) => r.versao === 'B');
  const pa = a.filter((r) => r.ok).length, pb = b.filter((r) => r.ok).length;
  const diff = pb - pa;
  console.log(g.padEnd(15) + (pa + '/' + a.length).padEnd(13) + (pb + '/' + b.length).padEnd(13) +
    (diff > 0 ? '+' + diff : String(diff)));
}

// pares: mesmo item, mesma repetição
const pares = new Map();
for (const r of res) {
  const k = r.grupo + ':' + r.id + ':' + r.repeticao;
  if (!pares.has(k)) pares.set(k, {});
  pares.get(k)[r.versao] = r;
}
const completos = [...pares.values()].filter((p) => p.A && p.B);
const ganhou = completos.filter((p) => !p.A.ok && p.B.ok);
const perdeu = completos.filter((p) => p.A.ok && !p.B.ok);
console.log('\npares completos: ' + completos.length + ' · B melhora em ' + ganhou.length + ' · B piora em ' + perdeu.length);
for (const p of ganhou) console.log('  + ' + p.B.grupo + ' #' + p.B.id + ' r' + p.B.repeticao + '  A: ' + p.A.falhas.join('; ') + '  →  B passa');
for (const p of perdeu) console.log('  - ' + p.B.grupo + ' #' + p.B.id + ' r' + p.B.repeticao + '  B: ' + p.B.falhas.join('; '));

// custo
const custo = (v) => {
  const ls = res.filter((r) => r.versao === v);
  const ms = ls.map((r) => r.ms).sort((x, y) => x - y);
  const fonte = ls.filter((r) => (r.fontesConsultadas || []).length).length;
  return { n: ls.length, mediana: ms.length ? ms[Math.floor(ms.length / 2)] : null, comFonte: fonte };
};
const cA = custo('A'), cB = custo('B');
console.log('\ncusto: mediana A ' + cA.mediana + ' ms · B ' + cB.mediana + ' ms (' +
  (cA.mediana && cB.mediana ? Math.round(100 * (cB.mediana - cA.mediana) / cA.mediana) : '?') + '%) · ' +
  'respostas de B com fonte citada: ' + cB.comFonte + '/' + cB.n);

// os itens que a régua reprovava por fato
console.log('\nItens reprovados por FATO na janela anterior — o que aconteceu agora:');
for (const id of alvo) {
  const ls = completos.filter((p) => p.B.grupo === 'original' && p.B.id === id)
    .concat(completos.filter((p) => p.B.grupo !== 'original' && p.B.id === id));
  if (!ls.length) { console.log('  #' + id + ' — não medido nesta janela'); continue; }
  for (const p of ls) {
    const falhaA = p.A.falhas.length ? p.A.falhas.join('; ') : 'passou';
    const falhaB = p.B.falhas.length ? p.B.falhas.join('; ') : 'passou';
    console.log('  #' + id + ' r' + p.B.repeticao + '  A: ' + falhaA + '  →  B: ' + falhaB +
      '   fonte: ' + ((p.B.fontesConsultadas || [])[0] || {}).titulo || '—');
  }
}
