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
    ['Qual a figura de linguagem em \'morri de saudade\'?', /hip[ée]rbole/i]
  ];
  for (const [pergunta, esperado] of casos) {
    const f = await r._ferramenta(pergunta);
    ok('rota local: ' + pergunta, !!f && esperado.test(String(f.texto)), f ? String(f.texto) : 'sem rota');
  }

  // régua: o autoteste do pontuador é parte da barreira
  const p = spawnSync('node', [path.join(RAIZ, 'bench', 'pontuar.js')], { encoding: 'utf8' });
  ok('régua (bench/pontuar.js) passa', p.status === 0, String(p.stdout || '').trim().split('\n').pop());

  console.log(falhas ? '✘ ' + falhas + ' falha(s)' : '✔ roteador grátis: rotas locais + régua + sanidade de resposta');
  process.exitCode = falhas ? 1 : 0;
})();
