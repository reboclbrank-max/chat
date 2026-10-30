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
  },
  {
    id: 'eta-estacao-de-tratamento',
    padraoOriginal: 'tratamento|esta[çc][ãa]o',
    aceita: '\\bETA\\b',
    tipo: 'FATO',
    motivo: 'ETA é a sigla de Estação de Tratamento de Água: o texto nomeia a mesma etapa pelo acrônimo consagrado',
    fonte: 'SAAE/SABESP — glossário de saneamento; a sigla aparece em todas as páginas de concessionárias consultadas',
    trecho: 'ETA = Estação de Tratamento de Água',
    exige: '(?:[áa]gua|saneamento|potabiliz|abastecimento)',
    unico: true,
    exemploPositivo: 'A água captada segue para a ETA, onde é filtrada e desinfetada antes da distribuição.',
    exemploNegativo: 'O aplicativo mostra a ETA até a entrega do pedido.'
  },
  {
    id: 'manancial-corrego-riacho-aquifero',
    padraoOriginal: 'rio|represa|reservat[óo]rio|a[çc]ude',
    aceita: 'riachos?|c[óo]rregos?|manancia(?:l|is)|aq[üu][íi]feros?|len[çc][óo]is?|po[çc]os?',
    tipo: 'FATO',
    motivo: 'o fato testado é "a resposta nomeia de onde a água é captada"; riacho, córrego, manancial, aquífero, lençol e poço são corpos/fontes de captação tanto quanto rio ou represa',
    fonte: 'ANA — Conjuntura dos Recursos Hídricos; definição de manancial e de captação subterrânea',
    trecho: 'manancial: corpo hídrico superficial ou subterrâneo usado para abastecimento',
    exige: '(?:[áa]gua|abastecimento|capta)',
    exemploPositivo: 'A água da chuva alimenta aquíferos e córregos que servem de manancial para a cidade.',
    exemploNegativo: 'A água da chuva escorre pela calçada e chega ao bueiro da esquina.'
  },
  {
    id: 'patogeno-microrganismo',
    padraoOriginal: 'ant[íi]geno|v[íi]rus|bact[ée]ri',
    aceita: 'pat[óo]genos?|microrganismos?|micro-organismos?|agentes? infecciosos?',
    tipo: 'FATO',
    motivo: 'o fato testado é "a vacina expõe o corpo ao agente causador"; patógeno/microrganismo é o termo genérico que substitui vírus/bactéria sem mudar o significado',
    fonte: 'Ministério da Saúde — Programa Nacional de Imunizações',
    trecho: 'a vacina apresenta ao sistema imunológico o agente infeccioso ou parte dele',
    exige: '(?:vacina|imuniz|imunidade|anticorpo)',
    exemploPositivo: 'A vacina apresenta ao corpo o patógeno enfraquecido e treina a memória imunológica.',
    exemploNegativo: 'O iogurte é feito com microrganismos que fermentam o leite.'
  },
  {
    id: 'entrada-em-linguagem-simples',
    padraoOriginal: 'par[âa]metro|entrada|argumento',
    aceita: '(?:recebe|recebem|recebendo)[^.!?\\n]{0,60}(?:informa[çc][õo]es|dados|valores)|(?:informa[çc][õo]es|dados|valores)[^.!?\\n]{0,60}(?:recebe|recebidas|de entrada)',
    tipo: 'MORFOLOGIA',
    motivo: 'o pedido é "para quem nunca programou": exigir a palavra técnica "parâmetro" contradiz o próprio pedido; "informações que a função recebe" é o mesmo conceito em linguagem simples',
    fonte: 'MDN — JavaScript Functions (parâmetros = valores recebidos pela função)',
    trecho: 'function parameters: the values a function receives when called',
    exige: '(?:fun[çc][ãa]o|function|programa|c[óo]digo)',
    exemploPositivo: 'A função pode receber informações, como um nome, e usá-las para montar a saudação.',
    exemploNegativo: 'A empresa recebe informações do cliente por telefone.'
  },
  {
    id: 'efeito-psicologico-redes',
    padraoOriginal: 'isolamento|ansiedade|sa[úu]de mental|compara',
    aceita: 'autoestima|solid[ãa]o|depress[ãa]o|bem-estar (?:emocional|psicol[óo]gico)|sofrimento psicol[óo]gico',
    tipo: 'FATO',
    motivo: 'o fato testado é "a resposta nomeia um efeito psicológico concreto das redes sociais"; autoestima, solidão e depressão são efeitos da mesma família e não sinônimos frouxos',
    fonte: 'OMS — Social media and adolescent mental health',
    trecho: 'efeitos sobre autoestima, solidão e sofrimento psicológico associados ao uso de redes',
    exige: '(?:rede|social|plataforma|instagram|facebook|tiktok)',
    exemploPositivo: 'O uso constante das redes sociais afeta a autoestima dos adolescentes.',
    exemploNegativo: 'A autoestima do time subiu depois da vitória no campeonato.'
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
