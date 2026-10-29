// Re-pontua os textos JÁ GRAVADOS de uma medição aplicando a normalização de parágrafos que o
// produto passou a fazer (ajustarParagrafos). Não gera resposta nova, não muda o gabarito:
// só reflete o que a resposta entregue viraria depois da formatação.
// Uso: node bench/reavaliar-paragrafos.js bench/resultado-pareado-105.json
'use strict';
const fs = require('fs');
const path = require('path');
const { avaliar } = require('./avaliar-aberto');
const { internos } = require('../roteador-ia');

const arquivo = process.argv[2] || path.join(__dirname, 'resultado-pareado-105.json');
const bruto = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const bancos = {
  original: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-aberto-novo-102.json'), 'utf8'))
};
const itemDe = (g, id) => (bancos[g] || []).find((x) => x.id === id);

const exigencias = (q) => internos.exigenciaDoPedido(q);

const linhas = bruto.res.map((r) => {
  const it = itemDe(r.grupo, r.id) || {};
  const ex = exigencias(it.q || r.q || '');
  // Só o candidato (B) tem a correção. O controle (A) veio de main@96b093c, onde a função
  // exigia 2 frases por parágrafo — aplicar a regra nova nele inflaria o controle e esconderia
  // o efeito real. Cada lado é avaliado com o código que ele de fato executa.
  // Mesmas travas do produto (padronizarFormato): geração cortada não é repartida e texto
  // abaixo do piso de conteúdo (90% do alvo) não vira "formatado".
  const palavras = String(r.texto || '').trim().split(/\s+/).filter(Boolean).length;
  const pisoConteudo = Math.floor((ex.minPalavras || 0) * 0.9);
  const podeFormatar = r.versao === 'B' && ex.paragrafos >= 2 && !r.parcial && !r.cortado &&
    palavras >= pisoConteudo;
  const formatado = podeFormatar
    ? internos.ajustarParagrafos(r.texto || '', ex.paragrafos) : (r.texto || '');
  const depois = avaliar(formatado, it);
  return { ...r, okAntes: r.ok, okDepois: depois.ok, falhasDepois: depois.falhas, mudouTexto: formatado !== (r.texto || '') };
});

const grupo = (r) => (r.repeticao > 0 ? 'repeticoes' : r.grupo);
const conta = (campo) => {
  const out = {};
  for (const g of ['original', 'holdout', 'novo', 'repeticoes', 'total']) {
    const ls = g === 'total' ? linhas : linhas.filter((r) => grupo(r) === g);
    out[g] = {};
    for (const v of ['A', 'B']) {
      const vs = ls.filter((r) => r.versao === v);
      out[g][v] = vs.filter((r) => r[campo]).length + '/' + vs.length;
    }
  }
  return out;
};
const antes = conta('okAntes'), depois = conta('okDepois');

console.log('Arquivo: ' + path.basename(arquivo));
console.log('Transformação: só agrupamento de parágrafos (nenhum texto novo, nenhuma frase criada)\n');
console.log('grupo          A antes -> depois      B antes -> depois');
for (const g of ['original', 'holdout', 'novo', 'repeticoes', 'total']) {
  const f = (x, y) => (x === y ? x + '        ' : x + ' -> ' + y);
  console.log(g.padEnd(14) + f(antes[g].A, depois[g].A).padEnd(23) + f(antes[g].B, depois[g].B));
}
const mudaram = linhas.filter((r) => r.okAntes !== r.okDepois);
console.log('\nItens que passariam a passar: ' + mudaram.length);
for (const r of mudaram) console.log('  ' + r.versao + ' #' + r.id + (r.repeticao ? ' r' + r.repeticao : '') +
  ' (' + r.grupo + ') falhava por [' + r.falhas.join('; ') + '] -> passa');
const corpo = linhas.filter((r) => r.mudouTexto).length;
console.log('\nRespostas que ganharam quebra de parágrafo: ' + corpo + ' de ' + linhas.length);
console.log('Nenhuma palavra foi acrescentada: a verificação compara o texto com espaços normalizados.');
const iguais = linhas.filter((r) => r.mudouTexto).every((r) => {
  const it = itemDe(r.grupo, r.id) || {};
  const ex = exigencias(it.q || r.q || '');
  const novo = internos.ajustarParagrafos(r.texto || '', ex.paragrafos);
  return novo.replace(/\s+/g, ' ').trim() === String(r.texto || '').replace(/\s+/g, ' ').trim();
});
console.log('Conferência palavra a palavra: ' + (iguais ? 'IDÊNTICO ✔' : 'DIVERGIU ✘'));
