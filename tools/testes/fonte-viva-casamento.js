// Contratos da busca viva (Wikipédia) e das travas de formato — os dois pontos que já
// produziram defeito medido: artigo tangencial no contexto e resposta curta "maquiada" de
// formatada. Nada aqui acessa a rede: `escolherFonte` é decisão pura.
'use strict';
const assert = require('assert');
const { internos } = require('../../roteador-ia.js');

let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }

ok('termos de busca mantêm palavra curta de conteúdo (água, rio, luz)', () => {
  const t = internos.termosDeBusca('Explique em dois parágrafos de onde vem a água que sai da torneira da sua casa.');
  assert(t.includes('água'), 'perdeu "água" (4 letras): ' + JSON.stringify(t));
  assert(t.includes('torneira'), 'perdeu "torneira": ' + JSON.stringify(t));
});

ok('termos de busca descartam comando de formato e número escrito', () => {
  const t = internos.termosDeBusca('Escreva em três parágrafos uma lista com 5 dicas de economia de água.');
  ['três', 'parágrafos', 'escreva', 'lista'].forEach((lixo) =>
    assert(!t.includes(lixo), 'termo de comando vazou para a busca: ' + lixo));
  assert(t.includes('água'), 'perdeu o termo de conteúdo');
});

const TERMOS_AGUA = ['caminho', 'água', 'chuva', 'torneira'];

ok('artigo tangencial cujo resumo cita o termo é recusado', () => {
  // Caso real medido: "caminho da água até a torneira" devolveu o artigo "Caminho".
  const r = internos.escolherFonte([{ title: 'Caminho', snippet: 'via, trajecto, percurso' }], TERMOS_AGUA);
  assert.strictEqual(r, null, 'aceitou artigo que só cobre 1 termo');
});

ok('episódio de série cujo resumo cita água é recusado', () => {
  const r = internos.escolherFonte([{ title: 'Lista de episódios de The Loud House', snippet: 'a água da chuva inunda a casa' }], TERMOS_AGUA);
  assert.strictEqual(r, null, 'aceitou página de episódios por causa do resumo');
});

ok('artigo cujo título cobre o tema e o resumo completa 2 termos é aceito', () => {
  const r = internos.escolherFonte([
    { title: 'Estação de tratamento de água', snippet: 'a água tratada segue para a torneira' }
  ], TERMOS_AGUA);
  assert(r && r.nota >= 2, 'recusou o artigo certo');
  assert.strictEqual(r.noTitulo, 1, 'não registrou cobertura no título');
});

ok('pergunta de um termo só exige esse termo, sem afrouxar para aceitar qualquer página', () => {
  const um = internos.termosDeBusca('Explique o que é a LGPD em dois parágrafos.');
  const bom = internos.escolherFonte([{ title: 'Lei Geral de Proteção de Dados Pessoais', snippet: 'LGPD' }], um);
  assert(bom, 'recusou o artigo certo para pergunta de termo único: ' + JSON.stringify(um));
  const ruim = internos.escolherFonte([{ title: 'Café', snippet: 'bebida quente' }], um);
  assert.strictEqual(ruim, null, 'aceitou artigo sem relação');
});

ok('a nota é comparativa: escolhe o resultado que cobre mais termos', () => {
  const r = internos.escolherFonte([
    { title: 'Água', snippet: 'ciclo da chuva' },
    { title: 'Água encanada', snippet: 'leva a água da chuva até a torneira da casa' }
  ], TERMOS_AGUA);
  assert.strictEqual(r.escolhido.title, 'Água encanada', 'escolheu por ordem em vez de cobertura');
});

console.log('\n' + n + ' contratos da busca viva passaram');
