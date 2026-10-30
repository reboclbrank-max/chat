// Análise da janela de maior poder (2 repetições por item e por lado).
// Mostra o total, o pareamento item a item, o teste de McNemar exato (bilateral) e o detalhe dos
// itens que reprovaram por fato nas janelas anteriores. Não transforma efeito pequeno em vitória:
// imprime o p e o intervalo de confiança da diferença de proporções.
'use strict';
const fs = require('fs');
const path = require('path');

const arquivo = process.argv[2] || path.join(__dirname, 'resultado-cadeia-107.json');
const d = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const res = d.res || [];

const pares = new Map();
for (const r of res) {
  const k = r.grupo + ':' + r.id + ':' + r.repeticao;
  if (!pares.has(k)) pares.set(k, {});
  pares.get(k)[r.versao] = r;
}
const completos = [...pares.values()].filter((p) => p.A && p.B);

const A = res.filter((r) => r.versao === 'A'), B = res.filter((r) => r.versao === 'B');
const okA = A.filter((r) => r.ok).length, okB = B.filter((r) => r.ok).length;
const b = completos.filter((p) => !p.A.ok && p.B.ok).length;   // A erra, B acerta
const c = completos.filter((p) => p.A.ok && !p.B.ok).length;   // A acerta, B erra

// McNemar exato bilateral
function binom(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
  return r;
}
function pMcNemar(b, c) {
  const n = b + c;
  if (!n) return 1;
  let cauda = 0;
  const menor = Math.min(b, c);
  for (let i = 0; i <= menor; i++) cauda += binom(n, i);
  return Math.min(1, 2 * cauda / Math.pow(2, n));
}
// IC 95% aproximado da diferença de proporções (amostras pareadas, método de Wald simples)
function icDiferenca(okA, nA, okB, nB) {
  const pA = okA / nA, pB = okB / nB, dif = pB - pA;
  const se = Math.sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB);
  return [dif - 1.96 * se, dif + 1.96 * se];
}

console.log('Arquivo: ' + path.basename(arquivo));
console.log('A = ' + d.meta.versoes.A + '\nB = ' + d.meta.versoes.B);
console.log('respostas: ' + res.length + ' (' + completos.length + ' pares)\n');

console.log('A: ' + okA + '/' + A.length + '  (' + Math.round(1000 * okA / A.length) / 10 + '%)');
console.log('B: ' + okB + '/' + B.length + '  (' + Math.round(1000 * okB / B.length) / 10 + '%)');
const [lo, hi] = icDiferenca(okA, A.length, okB, B.length);
console.log('diferença B−A: ' + (okB / B.length - okA / A.length >= 0 ? '+' : '') +
  (Math.round(1000 * (okB / B.length - okA / A.length)) / 10) + ' pontos · IC95% [' +
  (Math.round(1000 * lo) / 10) + ', ' + (Math.round(1000 * hi) / 10) + ']');

console.log('\npareado (A erra/B acerta = ' + b + ' · A acerta/B erra = ' + c + ') · McNemar exato p = ' +
  pMcNemar(b, c).toFixed(4) + (pMcNemar(b, c) < 0.05 ? '  ← diferença detectável' : '  ← não detectável com este poder'));

const med = (v) => {
  const ms = res.filter((r) => r.versao === v).map((r) => r.ms).sort((x, y) => x - y);
  return ms[Math.floor(ms.length / 2)];
};
console.log('latência mediana: A ' + med('A') + ' ms · B ' + med('B') + ' ms (' +
  Math.round(100 * (med('B') - med('A')) / med('A')) + '%)');

console.log('\nPor grupo:');
for (const g of ['original', 'holdout', 'novo']) {
  const a = A.filter((r) => r.grupo === g), bb = B.filter((r) => r.grupo === g);
  console.log('  ' + g.padEnd(9) + 'A ' + a.filter((r) => r.ok).length + '/' + a.length +
    '   B ' + bb.filter((r) => r.ok).length + '/' + bb.length);
}

console.log('\nItens com reprovação por FATO (as três anteriores + as demais):');
const itens = {};
for (const r of res) {
  if (!r.falhas.some((f) => /fato/.test(f))) continue;
  const k = r.grupo + ':' + r.id;
  itens[k] = itens[k] || { A: 0, B: 0, nA: 0, nB: 0, exemplos: { A: null, B: null } };
  itens[k][r.versao]++;
  itens[k]['n' + r.versao]++;
  if (!itens[k].exemplos[r.versao]) itens[k].exemplos[r.versao] = r.falhas.join('; ');
}
for (const [k, v] of Object.entries(itens).sort((x, y) => (y[1].A + y[1].B) - (x[1].A + x[1].B))) {
  console.log('  ' + k.padEnd(14) + 'falhas por fato: A ' + v.A + '/' + v.nA + ' · B ' + v.B + '/' + v.nB);
  if (v.exemplos.A) console.log('        A: ' + v.exemplos.A);
  if (v.exemplos.B) console.log('        B: ' + v.exemplos.B);
}
