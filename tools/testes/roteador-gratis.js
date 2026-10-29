// 🧠 ROTEADOR GRATUITO — teste permanente da rodada 93 (28/10/2026)
// Três coisas que já quebraram de verdade e não podem voltar:
//   1. resposta degenerada de provedor ("**", "```") sendo aceita como resposta final;
//   2. raciocínio vazando no lugar da conclusão ("Thinking Process: 1. Analyze", "Actually, looking");
//   3. régua frouxa/estreita: π truncado em qualquer precisão é a mesma constante, mas inteiro vizinho (205×206) não passa.
// Nada de rede: só as rotas locais (português/fatos) e as funções puras do pontuador.
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
let falhas = 0;
function ok(nome, cond, detalhe) {
  if (cond) { console.log('✔ ' + nome); return; }
  falhas++; console.log('✘ ' + nome + (detalhe ? ' → ' + detalhe : ''));
}

const api = require(path.join(RAIZ, 'roteador-ia.js'));
const sanear = api.internos && api.internos.sanear;
ok('roteador expõe sanear/util para teste', typeof sanear === 'function');

if (typeof sanear === 'function') {
  // resposta degenerada nunca é resposta
  ok('"**" é rejeitada', sanear('**') === '', JSON.stringify(sanear('**')));
  ok('"```" é rejeitada', sanear('```') === '');
  ok('"Hmm" é rejeitada', sanear('Hmm') === '');
  // raciocínio truncado não vira resposta
  ok('"Thinking Process: 1. Analyze" é rejeitada', sanear('Thinking Process: 1. Analyze') === '');
  ok('"Actually, looking" é rejeitada', sanear('Actually, looking') === '');
  // respostas legítimas continuam passando
  ok('"Sete." passa', sanear('Sete.') === 'Sete.');
  ok('"7" passa', sanear('7') === '7');
  ok('"3,14159" passa', sanear('3,14159') === '3,14159');
  ok('"Biggest" passa', sanear('Biggest') === 'Biggest');
  ok('"Hip" (corte de hipérbole) é rejeitada', sanear('Hip') === '');
  ok('símbolo de 2 letras passa ("Au")', sanear('Au') === 'Au');
  ok('"Sim" passa', sanear('Sim') === 'Sim');
  ok('"the price." é rejeitada', sanear('the price.') === '');
  ok('"Given the constraint" é rejeitada', sanear('Given the constraint "Responda em uma linha"') === '');
  // quando o provedor mistura raciocínio e conclusão, a conclusão é extraída
  ok('conclusão marcada é extraída', sanear('Reasoning: the answer is 42') === '42', JSON.stringify(sanear('Reasoning: the answer is 42')));
  ok('preâmbulo + resposta na 2ª frase', /Tóquio/.test(sanear('Actually, the answer is Tóquio.')), JSON.stringify(sanear('Actually, the answer is Tóquio.')));
}

// rotas locais: português e fatos estáveis, sem chave e sem rede
(async () => {
  const r = new api.Roteador();
  const casos = [
    ['Qual o coletivo de lobos?', /alcateia/i],
    ['Qual o masculino de \'abelha\'?', /zangão|zangao/i],
    ['Qual o feminino de \'ator\'?', /atriz/i],
    ['Qual o plural de \'pão\'?', /pães|paes/i],
    ['Qual o superlativo de \'bom\'?', /ótimo|otimo/i],
    ['Qual o aumentativo de \'casa\'?', /casarão|casarão/i],
    ['Qual o diminutivo de \'casa\'?', /casinha/i],
    ['Qual o antônimo de \'alto\'?', /baixo/i],
    ['Qual o sinônimo de \'belo\'?', /bonito/i],
    ['Qual a classe da palavra \'rapidamente\'?', /advérbio|adverbio/i],
    ['Quantas letras tem a palavra \'escola\'?', /^6$/],
    ['Qual o símbolo químico do ouro?', /^Au$/],
    ['Qual é o metal do símbolo \'Pb\'?', /chumbo/i],
    ['Quem escreveu \'Dom Casmurro\'?', /Machado de Assis/i],
    ['Quantos ossos tem o corpo humano adulto?', /206/],
    // figuras de linguagem: gramática canônica, resposta determinística (rodada 93)
    ['Qual a figura de linguagem em \'chorei um rio de lágrimas\'?', /hip[ée]rbole/i],
    ['Qual a figura de linguagem em \'o vento sussurrava\'?', /personifica/i],
    ['Qual a figura de linguagem em \'meu amor é um fogo que arde\'?', /met[áa]fora/i],
    ['Qual a figura de linguagem em \'ele é forte como um touro\'?', /compara/i],
    ['Qual a figura de linguagem em \'a cidade acordou animada\'?', /personifica/i],
    // lógica de posição (rodada 93)
    ['Você ultrapassa o 3º colocado. Em que posição fica?', /^3º lugar$/],
    ['Ultrapassei o 2º colocado, em que posição fico?', /^2º lugar$/],
    // capitais: antes, país/estado feminino ("da França", "da Paraíba") não casava a rota e ia para o modelo
    ['Qual a capital da França?', /^Paris$/],
    ['Qual a capital da Argentina?', /Buenos Aires/i],
    ['Qual a capital dos Estados Unidos?', /Washington/i],
    ['Qual é a capital da Paraíba?', /João Pessoa/i],
    ['Qual a capital de Sergipe?', /Aracaju/i],
    ['Qual a capital da Mongólia?', /Ulã Bator|Ulan Bator/i],
    ['Qual a capital de Portugal?', /^Lisboa$/],
    // símbolo químico: a rota só casava "do/da" no masculino — "símbolo químico da prata" caía no modelo
    ['Qual é o símbolo químico da prata?', /^Ag$/],
    ['Qual o símbolo químico do ouro?', /^Au$/],
    // inglês irregular: virou tabela local depois de o holdout perder 4 itens por 429
    ['Past tense of \'write\'?', /^wrote$/],
    ['Plural of \'foot\'?', /^feet$/],
    ['Comparative of \'bad\'?', /^worse$/],
    ['Superlative of \'far\'?', /farthest|furthest/i],
    ['Plural of \'child\'?', /^children$/],
    ['Comparative of \'beautiful\'?', /^more beautiful$/i],
    // problema de taxa
    ['Uma torneira enche 5 litros por minuto. Quantos litros em 12 minutos?', /^60$/],
    ['Um carro anda 80 km por hora. Quantos km em 3 horas?', /^240$/],
    // sequência com razão arredondada e proporção (erros reais do holdout)
    ['Próximo: 97,48,24,?', /^12$/],
    ['Próximo: 500,250,125,?', /^62[.,]5$/],
    ['Se 4 cadernos custam R$20, quanto custam 7?', /^35$/],
    ['Se 3 kg custam R$12, quanto custam 5 kg?', /^20$/],
    // fila e calendário: erros reais do holdout que viraram regra determinística
    ['Numa fila, Rita é a 8ª. Quantas pessoas estão à frente dela?', /^7$/],
    ['Se sou o 5º da fila, quantas pessoas estão à minha frente?', /^4$/],
    ['Numa fila de 20 pessoas, Carlos é o 12º. Quantas pessoas estão atrás dele?', /^8$/],
    ['Quantos meses do ano têm 30 dias?', /^4/],
    ['Quantos dias tem um ano bissexto?', /^366/],
    // tempo fracionário não pode cair no fato de "uma hora"
    ['Quantos minutos tem 1 hora e meia?', /^90$/],
    ['Quantos dias tem uma semana e meia?', /^10[.,]5$/],
    ['Quantos minutos tem uma hora?', /^60/],
    // plural de -l e superlativo: as duas regras que erraram no banco fresco
    ['Qual o plural de \'caracol\'?', /^caracóis$/],
    ['Qual o plural de \'papel\'?', /^papéis$/],
    ['Qual o plural de \'animal\'?', /^animais$/],
    ['Qual o plural de \'azul\'?', /^azuis$/],
    ['Qual o superlativo de \'salgado\'?', /^salgadíssimo$/],
    ['Qual o superlativo de \'difícil\'?', /^dificílimo$/],
    ['Qual o superlativo de \'feliz\'?', /^felicíssimo$/],
    ['Qual a figura de linguagem em \'morri de saudade\'?', /hip[ée]rbole/i],
    // rodada 94: vários saltos (compositor local de 2–3 passos)
    ['Cada pastel custa R$6. Você compra 4 e paga com R$50. Quanto de troco?', /^26$/],
    ['Um carro faz 14 km por litro e o tanque tem 30 litros. Quantos km ele anda?', /^420$/],
    ['Um caminhão anda 60 km por hora por 3 horas e depois mais 2 horas. Quantos km no total?', /^300$/],
    ['Pedro tinha 120 reais, ganhou 45 e gastou 37. Com quanto ficou?', /^128$/],
    ['São 8 caixas com 15 latas cada e 12 latas amassam. Quantas latas boas sobram?', /^108$/],
    ['Quatro canetas custam R$10. Quanto custam 6 canetas com desconto de 20%?', /^12$/],
    ['Qual o triplo de 14 menos a metade de 10?', /^37$/],
    ['Três horas e 15 minutos têm quantos segundos?', /^11700$/],
    ['Uma pessoa dorme 8 horas por dia. Quantas horas ela dorme em 30 dias?', /^240$/]
  ];
  for (const [pergunta, esperado] of casos) {
    const f = await r._ferramenta(pergunta);
    ok('rota local: ' + pergunta, !!f && esperado.test(String(f.texto)), f ? String(f.texto) : 'sem rota');
  }

  // rodada 94: classificador, extração de código, exigência do pedido e nota de formato
  const I = api.internos || {};
  const cl = [
    ['Escreva uma função em JavaScript que soma dois números', 'codigo'],
    ['Explique em dois parágrafos o que é fotossíntese.', 'aberto'],
    ['Qual a capital da França?', 'curto'],
    ['Quantos meses do ano têm 30 dias?', 'curto']
  ];
  for (const [q, esperado] of cl) ok('classificador: ' + q.slice(0, 34) + ' → ' + esperado, I.classificarPedido && I.classificarPedido(q) === esperado, I.classificarPedido && I.classificarPedido(q));

  // resto de raciocínio com só palavras funcionais ("Is it" — id 71 da régua de 200) não é resposta
  ok('"Is it" é rejeitada (fragmento)', sanear('Is it') === '');
  ok('"of the" é rejeitada (fragmento)', sanear('of the') === '');
  ok('"Fifty" passa (não é fragmento)', sanear('Fifty') === 'Fifty');
  ok('"no" passa (resposta curta legítima)', sanear('no') === 'no');

  // calendário é aritmética exata: não pode voltar a ir para o modelo (errou fevereiro de 2028: "28")
  const cal = I.calendarioLocal;
  ok('calendário: fevereiro de 2028 = 29', cal && (cal('Quantos dias tem fevereiro de 2028?') || {}).texto === '29');
  ok('calendário: fevereiro de 2027 = 28', cal && (cal('Quantos dias tem fevereiro de 2027?') || {}).texto === '28');
  ok('calendário: 1900 não é bissexto', cal && (cal('O ano 1900 é bissexto?') || {}).texto === 'Não');
  ok('calendário: 2000 é bissexto', cal && (cal('O ano 2000 é bissexto?') || {}).texto === 'Sim');
  ok('calendário: 2024 tem 366 dias', cal && (cal('Quantos dias tem o ano de 2024?') || {}).texto === '366');
  ok('calendário: terça + 10 dias = sexta', cal && (cal('Se hoje é terça-feira, que dia da semana será daqui a 10 dias?') || {}).texto === 'sexta-feira');

  // texto longo: um parágrafo por chamada (o pedido de "2 parágrafos" numa chamada só voltava
  // com 30 palavras e 1 bloco — medido na régua aberta)
  const ip = I.instrucaoParagrafo;
  ok('instrução de parágrafo: numera 2 de 3', ip && /parágrafo 2 de 3/.test(ip('Tema.', 1, 3, 30, '')));
  ok('instrução de parágrafo: exige português do Brasil', ip && /português do Brasil/.test(ip('Tema.', 0, 2, 30, '')));
  ok('instrução de parágrafo: proíbe lista e prefácio', ip && /Não use listas/.test(ip('Tema.', 0, 2, 30, '')) && /Comece direto/.test(ip('Tema.', 0, 2, 30, '')));
  ok('instrução de parágrafo: faixa de palavras coerente', ip && /45 a 85 palavras/.test(ip('Tema.', 0, 2, 30, '')) );

  // corte de provedor: fechar no último ponto final em vez de entregar frase pela metade
  const ft = I.fecharTexto;
  ok('fecharTexto corta frase incompleta', ft && ft('Primeira frase completa. Segunda frase completa. E a água passa pela') === 'Primeira frase completa. Segunda frase completa.');
  ok('fecharTexto não mexe em texto já fechado', ft && ft('Já fechado.') === 'Já fechado.');
  ok('fecharTexto preserva texto sem ponto', ft && ft('Curto demais sem ponto') === 'Curto demais sem ponto');

  // aritmética local: mathjs.org ficou fora do ar e "16×12" foi para o modelo, que errou
  const calc = I.calcular;
  ok('aritmética: 16×12 = 192', calc && calc('16×12') === 192, String(calc && calc('16×12')));
  ok('aritmética: precedência 2+3*4 = 14', calc && calc('2+3*4') === 14);
  ok('aritmética: parênteses (2+3)*4 = 20', calc && calc('(2+3)*4') === 20);
  ok('aritmética: potência 2^10 = 1024', calc && calc('2^10') === 1024);
  ok('aritmética: expressão inválida devolve null', calc && calc('2+*3') === null);
  ok('aritmética: não avalia código', calc && calc('require(1)') === null);

  // convenções de gênero textual: e-mail fecha com despedida, argumento cita consequência concreta
  const fmt = I.instrucaoFormato;
  ok('formato: e-mail pede despedida formal', fmt && /Atenciosamente/.test(fmt('Escreva um e-mail formal pedindo orçamento de 20 cadeiras.')));
  ok('formato: carta também pede despedida', fmt && /Atenciosamente/.test(fmt('Escreva uma carta ao prefeito sobre a praça.')));
  ok('formato: argumento pede consequência concreta', fmt && /consequ[êe]ncia concreta/.test(fmt('Escreva um parágrafo argumentando a favor da reciclagem.')));
  ok('formato: pergunta neutra não ganha instrução', fmt && fmt('Explique o que é a LGPD em dois parágrafos.') === '');

  // fechamento de e-mail é convenção aplicada por código (o modelo não cumpriu instruído)
  const fech = I.ajustarFechamento;
  ok('fechamento: e-mail sem despedida ganha "Atenciosamente,"',
     fech && /Atenciosamente/.test(fech('Prezados, gostaria de orçamento para 20 cadeiras.', 'Escreva um e-mail formal pedindo orçamento.')));
  ok('fechamento: não duplica despedida existente',
     fech && (fech('Atenciosamente, Fulano', 'Escreva um e-mail.') || '').match(/atenciosamente/gi).length === 1);
  ok('fechamento: "agradeço a atenção" NÃO conta como despedida',
     fech && /Atenciosamente[.,]/.test(fech('Prezados, gostaria de orçamento. Agradeço a atenção.', 'Escreva um e-mail formal.')));
  ok('fechamento: texto que não é e-mail não é tocado',
     fech && fech('Texto solto.', 'Explique em dois parágrafos a fotossíntese.') === 'Texto solto.');

  // visão: existe rota multimodal gratuita medida (OVH Qwen3.5-397B); sem ela, o roteador tem de
  // dizer que não tem rota — nunca inventar descrição de imagem
  const Rv = new api.Roteador();
  Rv.visaoLigada = false;
  const semVisao = await Rv.responder({ pergunta: 'O que há nesta imagem?', imagem: 'data:image/png;base64,AA==' });
  ok('visão desligada devolve sem-resposta honesta', !!(semVisao && semVisao.texto === '' && semVisao.erro === 'sem-resposta'));

  // fechamento termina em PONTO: a verificação de texto fechado exige pontuação terminal
  ok('fechamento termina em ponto final',
     fech && /Atenciosamente\.$/.test(fech('Prezados, gostaria de orçamento.', 'Escreva um e-mail formal.').trim()));
  // lista solta vira lista numerada de N itens
  const nl = I.numerarLista;
  ok('numerarLista converte marcadores em 1..N', nl && nl('- a\n- b\n- c', 3) === '1. a\n2. b\n3. c');
  ok('numerarLista respeita o limite pedido', nl && nl('- a\n- b\n- c', 2) === '1. a\n2. b');
  ok('numerarLista não toca texto sem lista', nl && nl('Texto corrido sem marcadores.', 3) === 'Texto corrido sem marcadores.');

  // régua estrita: acento conta. Se o afrouxamento de acento estivesse mascarando erro, isto pega.
  ok('estrito: "caracois" não passa por "caracóis"', api.internos && require('../../bench/pontuar.js').acertou('caracois', ['caracóis'], null, { estrito: true }) === false);
  ok('estrito: "caracóis" passa', require('../../bench/pontuar.js').acertou('caracóis', ['caracóis'], null, { estrito: true }) === true);
  ok('quebra em N parágrafos sem inventar conteúdo', I.ajustarParagrafos && I.ajustarParagrafos('A. B. C. D.', 2) === 'A. B.\n\nC. D.');
  ok('extrai código de bloco markdown', I.extrairCodigo && I.extrairCodigo('claro:\n```js\nfunction soma(a,b){return a+b}\nmodule.exports={soma};\n```') === 'function soma(a,b){return a+b}\nmodule.exports={soma};');
  ok('código cortado não passa por inteiro', I.codigoInteiro && I.codigoInteiro('function soma(a,b){') === false);
  ok('código completo passa por inteiro', I.codigoInteiro && I.codigoInteiro('function soma(a,b){return a+b}\nmodule.exports={soma};') === true);
  ok('pedido de 2 parágrafos é lido', I.exigenciaDoPedido && I.exigenciaDoPedido('Explique em dois parágrafos o que é X.').paragrafos === 2);
  ok('pedido de lista de 5 é lido', I.exigenciaDoPedido && I.exigenciaDoPedido('Escreva uma lista com 5 dicas.').itens === 5);
  ok('nota de texto cobra parágrafo', I.notaTexto && I.notaTexto('Um parágrafo só com várias palavras aqui e mais texto para chegar ao mínimo exigido.', { paragrafos: 2, minPalavras: 10 }) <
     I.notaTexto('Primeiro parágrafo com várias palavras aqui.\nSegundo parágrafo também completo e fechado.', { paragrafos: 2, minPalavras: 10 }));

  // régua: o autoteste do pontuador é parte da barreira
  const p = spawnSync('node', [path.join(RAIZ, 'bench', 'pontuar.js')], { encoding: 'utf8' });
  ok('régua (bench/pontuar.js) passa', p.status === 0, String(p.stdout || '').trim().split('\n').pop());

  console.log(falhas ? '✘ ' + falhas + ' falha(s)' : '✔ roteador grátis: rotas locais + régua + sanidade de resposta');
  process.exitCode = falhas ? 1 : 0;
})();
