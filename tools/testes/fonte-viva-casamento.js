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
// A regra agora exige cobertura no TÍTULO (o resumo casa por acidente) e ao menos metade das
// palavras do título presentes no pedido. Os casos abaixo são os que a versão anterior aceitou
// errado na medição dos 36 itens.

ok('artigo tangencial cujo resumo cita o termo é recusado', () => {
  // Caso real medido: "caminho da água até a torneira" devolveu o artigo "Caminho".
  const r = internos.escolherFonte([{ title: 'Caminho', snippet: 'via, trajecto, percurso' }], TERMOS_AGUA);
  assert.strictEqual(r, null, 'aceitou artigo que só cobre 1 termo');
});

ok('episódio de série cujo resumo cita água é recusado', () => {
  const r = internos.escolherFonte([{ title: 'Lista de episódios de The Loud House', snippet: 'a água da chuva inunda a casa' }], TERMOS_AGUA);
  assert.strictEqual(r, null, 'aceitou página de episódios por causa do resumo');
});

ok('artigo com exatamente o tema do pedido é aceito', () => {
  const termos = internos.termosDeBusca('Explique em dois parágrafos como funciona a energia solar fotovoltaica.');
  const r = internos.escolherFonte([
    { title: 'Energia solar fotovoltaica', snippet: 'painéis convertem luz em eletricidade' }
  ], termos);
  assert(r, 'recusou o artigo certo');
  assert.strictEqual(r.temaSujeito, 3, 'não contou os termos-sujeito no título');
});

ok('título mais específico que o pedido é recusado (precisão antes de cobertura)', () => {
  // Custo conhecido e aceito: "Água pluvial" serviria para "caminho da água", mas a regra exige
  // que TODAS as palavras do título estejam no pedido. Contexto errado custa mais que ausência.
  const r = internos.escolherFonte([
    { title: 'Estação de tratamento de água', snippet: 'a água tratada segue para a torneira' },
    { title: 'Ciclo da água subterrânea', snippet: 'ciclo da água no subsolo' }
  ], TERMOS_AGUA);
  assert.strictEqual(r, null, 'aceitou título com palavra fora do pedido');
});

ok('título com palavra a mais muda o assunto e é recusado', () => {
  // Casos reais que a regra anterior aceitava e estavam errados.
  const vênus = internos.escolherFonte([{ title: 'Fases de Vênus', snippet: 'fases' }],
    internos.termosDeBusca('Explique em dois parágrafos por que a Lua apresenta fases.'));
  assert.strictEqual(vênus, null, 'aceitou Vênus para fases da Lua');
  const alimento = internos.escolherFonte([{ title: 'Alimento geneticamente modificado', snippet: 'alimento' }],
    internos.termosDeBusca('Dê quatro argumentos contra o desperdício de alimentos.'));
  assert.strictEqual(alimento, null, 'aceitou transgênico para desperdício de alimentos');
  const lingua = internos.escolherFonte([{ title: 'Língua artificial', snippet: 'língua artificial' }],
    internos.termosDeBusca('Explique em dois parágrafos o que é inteligência artificial, sem jargão.'));
  assert.strictEqual(lingua, null, 'aceitou língua artificial para inteligência artificial');
});

ok('sigla (LGPD) aceita o artigo titulado por extenso, mas só com a sigla no resumo', () => {
  const q = 'Explique o que é a LGPD em dois parágrafos.';
  const termos = internos.termosDeBusca(q), siglas = internos.termosDoPedido(q);
  const bom = internos.escolherFonte([{ title: 'Lei Geral de Proteção de Dados Pessoais', snippet: 'a LGPD entrou em vigor' }], termos, siglas);
  assert(bom, 'recusou o artigo certo para pergunta de sigla');
  const ruim = internos.escolherFonte([{ title: 'Café', snippet: 'bebida quente' }], termos, siglas);
  assert.strictEqual(ruim, null, 'aceitou artigo sem relação');
});

ok('título fora do assunto é recusado mesmo com termo do pedido no resumo', () => {
  // Caso real: "fases da Lua" -> "Super Mario Bros. 35" (o resumo fala de fases do jogo).
  const termos = internos.termosDeBusca('Explique em dois parágrafos por que a Lua apresenta fases.');
  const r = internos.escolherFonte([{ title: 'Super Mario Bros. 35', snippet: 'o jogo tem fases e lua' }], termos);
  assert.strictEqual(r, null, 'aceitou artigo de jogo para fases da Lua');
});

ok('receita de bolo não aceita artigo que só menciona passos', () => {
  const termos = internos.termosDeBusca('Explique em três passos como fazer um bolo simples.');
  const r = internos.escolherFonte([{ title: 'Cakewalk', snippet: 'a passada é composta de passos simples' }], termos);
  assert.strictEqual(r, null, 'aceitou Cakewalk para receita de bolo');
});

ok('plural não separa título e pedido (rede social / redes sociais)', () => {
  const termos = internos.termosDeBusca('Escreva um texto sobre os impactos das redes sociais na vida.');
  const r = internos.escolherFonte([{ title: 'Rede social', snippet: 'plataformas de interação' }], termos);
  assert(r, 'perdeu o artigo por causa do plural');
});

ok('a nota é comparativa: entre dois aceitos, escolhe o que cobre mais termos', () => {
  const r = internos.escolherFonte([
    { title: 'Água', snippet: 'líquido essencial' },
    { title: 'Chuva', snippet: 'a água da chuva chega até a torneira da casa' }
  ], TERMOS_AGUA);
  assert(r, 'nenhum aceito');
  assert.strictEqual(r.escolhido.title, 'Chuva', 'escolheu por ordem em vez de cobertura');
});

console.log('\n' + n + ' contratos da busca viva passaram');
