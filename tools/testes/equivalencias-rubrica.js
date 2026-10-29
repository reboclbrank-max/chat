// Teste permanente das equivalências da rubrica.
// Exige, para cada equivalência: fonte, motivo, exemplo positivo e exemplo negativo.
// Equivalência que aceita o exemplo negativo é gabarito frouxo e quebra aqui.
'use strict';
const assert = require('assert');
const { EQUIVALENCIAS, satisfaz } = require('../../bench/equivalencias-rubrica');
let n = 0;
function ok(nome, fn) { fn(); n++; console.log('✔ ' + nome); }

ok('toda equivalência declara fonte, motivo, tipo e os dois exemplos', () => {
  assert(EQUIVALENCIAS.length >= 1);
  const tipos = new Set(['MORFOLOGIA', 'ARITMÉTICA', 'FATO']);
  for (const e of EQUIVALENCIAS) {
    assert(e.id && e.padraoOriginal && e.aceita, 'campos obrigatórios em ' + e.id);
    assert(e.fonte && e.motivo, 'sem prova não entra: ' + e.id);
    assert(tipos.has(e.tipo), 'tipo inválido: ' + e.id);
    assert(e.exemploPositivo && e.exemploNegativo, 'faltam exemplos: ' + e.id);
  }
});

ok('o padrão original continua valendo por si (nada foi substituído)', () => {
  assert(satisfaz('As células formam o painel solar.', 'painel|placa'));
  assert(satisfaz('Uma placa fotovoltaica no telhado.', 'painel|placa'));
  assert(satisfaz('Começou no século XVIII.', 's[ée]culo (XVIII|18)|inglaterra'));
  assert(satisfaz('Começou na Inglaterra.', 's[ée]culo (XVIII|18)|inglaterra'));
});

ok('plural de painel passa a ser reconhecido', () => {
  assert(satisfaz('As células interligadas formam os painéis solares.', 'painel|placa'));
});

ok('módulo só é aceito como módulo solar/fotovoltaico ou no contexto de células agrupadas', () => {
  assert(satisfaz('A usina usa módulos solares ligados ao inversor.', 'painel|placa'), 'módulo solar deve aceitar');
  assert(satisfaz('A energia solar fotovoltaica usa luz para gerar corrente; cada célula é agrupada em módulos e conectada ao sistema.', 'painel|placa'), 'contexto de agrupamento deve aceitar');
  assert(!satisfaz('O módulo da rede elétrica distribui energia para as casas.', 'painel|placa'), 'módulo genérico não pode aceitar');
});

ok('negação explícita não é aceita pela equivalência de Grã-Bretanha', () => {
  assert(!satisfaz('A Revolução Industrial não começou na Grã-Bretanha, mas na França.', 's[ée]culo (XVIII|18)|inglaterra'));
  assert(!satisfaz('A Revolução Industrial nunca iniciou na Grã-Bretanha.', 's[ée]culo (XVIII|18)|inglaterra'));
});

ok('Grã-Bretanha e ano do século XVIII são aceitos; ano de outro século não', () => {
  assert(satisfaz('A Revolução Industrial começou na Grã-Bretanha por volta de 1760.', 's[ée]culo (XVIII|18)|inglaterra'));
  assert(satisfaz('Começou por volta de 1780.', 's[ée]culo (XVIII|18)|inglaterra'));
  assert(!satisfaz('Começou por volta de 1860.', 's[ée]culo (XVIII|18)|inglaterra'), '1860 é século XIX');
  assert(!satisfaz('Começou por volta de 1650.', 's[ée]culo (XVIII|18)|inglaterra'), '1650 é século XVII');
});

ok('equivalência não vaza para padrão de outra pergunta', () => {
  assert(!satisfaz('As células formam painéis.', 'clorofila|luz solar'), 'padrão alheio não pode ser satisfeito');
});

ok('exemplo negativo de cada equivalência é de fato rejeitado', () => {
  for (const e of EQUIVALENCIAS) {
    assert(!satisfaz(e.exemploNegativo, e.padraoOriginal), 'aceitou o negativo de ' + e.id + ': ' + e.exemploNegativo);
    // o positivo pode depender do padrão original (INGLATERRA/XVIII) ou da equivalência
    const positivoVale = satisfaz(e.exemploPositivo, e.padraoOriginal) ||
      new RegExp(e.aceita, 'i').test(e.exemploPositivo);
    assert(positivoVale, 'positivo não reconhecido em ' + e.id);
  }
});

console.log('\n' + n + ' contratos de equivalência da rubrica passaram');
