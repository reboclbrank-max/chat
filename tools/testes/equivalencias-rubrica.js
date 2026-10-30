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

ok('ETA é aceita como Estação de Tratamento de Água, e só no contexto de água', () => {
  assert(satisfaz('A água captada segue para a ETA, onde é filtrada.', 'tratamento|esta[çc][ãa]o'));
  assert(!satisfaz('O aplicativo mostra a ETA até a entrega do pedido.', 'tratamento|esta[çc][ãa]o'), 'ETA de entrega não é tratamento');
});

ok('manancial, córrego, aquífero e poço contam como origem da água', () => {
  assert(satisfaz('A água da chuva alimenta aquíferos e córregos que servem de manancial.', 'rio|represa|reservat[óo]rio|a[çc]ude'));
  assert(!satisfaz('A água da chuva escorre pela calçada até o bueiro.', 'rio|represa|reservat[óo]rio|a[çc]ude'), 'sem origem nomeada não pode passar');
});

ok('patógeno/microrganismo valem como agente da vacina, e só no contexto de vacina', () => {
  assert(satisfaz('A vacina apresenta o patógeno enfraquecido e treina a memória imunológica.', 'ant[íi]geno|v[íi]rus|bact[ée]ri'));
  assert(!satisfaz('O iogurte é feito com microrganismos que fermentam o leite.', 'ant[íi]geno|v[íi]rus|bact[ée]ri'), 'microrganismo fora de vacina não vale');
});

ok('a linguagem simples do pedido conta como "entrada/parâmetro"', () => {
  assert(satisfaz('A função pode receber informações, como um nome, e usá-las na saudação.', 'par[âa]metro|entrada|argumento'));
  assert(!satisfaz('A empresa recebe informações do cliente por telefone.', 'par[âa]metro|entrada|argumento'), 'receber informação fora de função não vale');
});

ok('autoestima/solidão contam como efeito psicológico das redes sociais', () => {
  assert(satisfaz('O uso constante das redes sociais afeta a autoestima dos adolescentes.', 'isolamento|ansiedade|sa[úu]de mental|compara'));
  assert(!satisfaz('A autoestima do time subiu depois da vitória.', 'isolamento|ansiedade|sa[úu]de mental|compara'), 'autoestima fora de redes sociais não vale');
});

console.log('\n' + n + ' contratos de equivalência da rubrica passaram');
