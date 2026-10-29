/* Equivalências verificáveis da rubrica aberta.
 *
 * Regra desta casa: NÃO se afrouxa gabarito por opinião. Só entra aqui o que cai em uma
 * destas categorias, com prova:
 *
 *   MORFOLOGIA  — a rubrica exigia uma forma e a língua usa outra (plural, flexão).
 *   ARITMÉTICA  — a rubrica exigia um rótulo e a resposta deu o valor equivalente (17xx = séc. XVIII).
 *   FATO        — a resposta nomeia o mesmo referente por outro nome consagrado NA FONTE,
 *                 com âncora que impede substituição de palavra solta.
 *
 * Os padrões das entradas #3 e #22 são copiados do banco já auditado na rodada 101
 * (bench/banco-aberto-auditado-101.json), inclusive as guardas de negação
 * `(?<!não )(?<!nunca )(?<!jamais )` — eles já existiam no repositório e já tinham teste.
 * A rodada 102 mediu com o banco ANTERIOR a essa auditoria; por isso o falso negativo voltou.
 *
 * Cada entrada tem exemplo positivo E negativo, e o teste permanente exige os dois.
 * Limite declarado: corrige vocabulário, morfologia e número. NÃO verifica se a afirmação
 * é verdadeira. Um texto pode passar aqui e continuar factualmente errado.
 */
'use strict';

const EQUIVALENCIAS = [
  {
    id: 'painel-plural',
    padraoOriginal: 'painel|placa',
    aceita: 'pain[ée]is',
    tipo: 'MORFOLOGIA',
    motivo: 'plural de "painel" é "painéis" (o l vira i); a rubrica só conhecia o singular',
    fonte: 'regra ortográfica do português; o substantivo é o mesmo',
    trecho: 'painel → painéis',
    exemploPositivo: 'As células solares interligadas formam os painéis solares.',
    exemploNegativo: 'As células solares captam a luz do Sol e geram corrente elétrica.'
  },
  {
    id: 'modulo-fotovoltaico',
    padraoOriginal: 'painel|placa',
    aceita: 'm[óo]dulos?\\s+(?:solar(?:es)?|fotovoltaicos?)',
    tipo: 'FATO',
    motivo: 'módulo solar é o agrupamento de células; o fato testado é "células se agrupam em conjunto maior"',
    fonte: 'BNDES — A energia solar no Brasil',
    trecho: 'fótons sobre semicondutor; células interligadas formam painéis',
    exemploPositivo: 'A usina usa módulos solares ligados ao inversor.',
    exemploNegativo: 'O módulo da rede elétrica distribui energia para as casas.'
  },
  {
    id: 'celulas-agrupadas-em-modulos',
    padraoOriginal: 'painel|placa',
    // padrão copiado do banco auditado 101: exige contexto fotovoltaico + "células ... agrupadas em módulos"
    aceita: '(?=[\\s\\S]*energia\\s+solar\\s+fotovoltaica)(?=[\\s\\S]*c[ée]lulas?[^.!?\\n]{0,160}(?<!n[ãa]o s[ãa]o )agrupadas?\\s+em\\s+m[óo]dulos?(?=\\s*(?:[,.;]|e\\s+conectad|para\\b)))',
    tipo: 'FATO',
    motivo: 'o texto diz que as células são agrupadas em módulos — é exatamente o fato pedido, sem usar a palavra "painel"',
    fonte: 'banco auditado da rodada 101 (bench/banco-aberto-auditado-101.json)',
    trecho: 'células agrupadas em módulos, no contexto de energia solar fotovoltaica',
    exemploPositivo: 'A energia solar fotovoltaica usa luz para gerar corrente; cada célula é agrupada em módulos e conectada ao sistema.',
    exemploNegativo: 'A energia solar fotovoltaica usa luz; as células são vendidas separadas.'
  },
  {
    id: 'gra-bretanha',
    padraoOriginal: 's[ée]culo (XVIII|18)|inglaterra',
    // guarda de negação copiada do banco auditado 101
    aceita: '(?<!n[ãa]o )(?<!nunca )(?<!jamais )(?:come[cç]ou|iniciou|surgiu|teve\\s+origem)\\s+(?:na|em)\\s+gr[ãa](?:-|\\s+)bretanha',
    tipo: 'FATO',
    motivo: 'a industrialização começou na Grã-Bretanha; "Inglaterra" é o uso corrente para o mesmo ponto de partida',
    fonte: 'Britannica — Industrial Revolution',
    trecho: 'a industrialização começou na Grã-Bretanha no século XVIII',
    exemploPositivo: 'A Revolução Industrial começou na Grã-Bretanha por volta de 1760.',
    exemploNegativo: 'A Revolução Industrial não começou na Grã-Bretanha, mas na França.'
  },
  {
    id: 'data-para-seculo',
    padraoOriginal: 's[ée]culo (XVIII|18)|inglaterra',
    aceita: '(?<!n[ãa]o )\\b17\\d\\d\\b',
    tipo: 'ARITMÉTICA',
    motivo: 'ano entre 1700 e 1799 é o século XVIII; "por volta de 1760" responde a data que a rubrica pede',
    fonte: 'conversão aritmética de ano para século',
    trecho: '1760 pertence ao século XVIII',
    exemploPositivo: 'Começou por volta de 1780, na Grã-Bretanha.',
    exemploNegativo: 'Começou por volta de 1860, nos Estados Unidos.'
  }
];

/* Retorna true se o padrão da rubrica casa direto OU se alguma equivalência declarada
   para aquele padrão casa. */
function satisfaz(texto, padrao) {
  const t = String(texto || '');
  if (new RegExp(padrao, 'i').test(t)) return true;
  return EQUIVALENCIAS.some((e) => {
    if (e.padraoOriginal !== padrao) return false;
    if (e.exige && !new RegExp(e.exige, 'i').test(t)) return false;
    return new RegExp(e.aceita, 'i').test(t);
  });
}

module.exports = { EQUIVALENCIAS, satisfaz };
