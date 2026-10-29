/* Roteador de IA do chat da casa — v2 "cérebro grátis".
   Ordem de ataque: consulta exata (Wikidata, tradução, mathjs) → consenso de 3 modelos → cascata.
   Tudo com R$ 0: nenhuma dessas rotas exige chave.
   Funciona no navegador (window.RoteadorIA) e no Node (module.exports). */
(function (raiz) {
  'use strict';

  var CATALOGO = [
    { id: 'gigante2',  nome: 'Nemotron-3-Ultra-550B (Kilo)',  base: 'https://api.kilo.ai/api/gateway',                          modelo: 'nvidia/nemotron-3-ultra-550b-a55b:free',            classe: 'forte' , peso: 100, latPar: 20400 },
    { id: 'ultra',     nome: 'Nemotron-3-Ultra-550B (g4f)',   base: 'https://nvidia.g4f.dev/v1',                                modelo: 'nvidia/nemotron-3-ultra-550b-a55b',                 classe: 'media' , peso: 10 },
    { id: 'ovhq397',   nome: 'Qwen3.5-397B (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.5-397B-A17B',                                 classe: 'leve' , peso: 7, latPar: 900000 },  // devolve raciocínio sem conclusão: não escreve parágrafo
    { id: 'ovhq',      nome: 'Qwen3.6-27B (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.6-27B',                                       classe: 'leve' , peso: 7 },
    { id: 'ovhoss',    nome: 'gpt-oss-120b (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'gpt-oss-120b',                                      classe: 'leve' , peso: 7 },
    { id: 'glm',       nome: 'GLM-5.3 (g4f)',                 base: 'https://nvidia.g4f.dev/v1',                                modelo: 'z-ai/glm-5.3',                                      classe: 'leve' , peso: 0 },
    { id: 'g4super',   nome: 'Nemotron-Super-120B (g4f)',     base: 'https://nvidia.g4f.dev/v1',                                modelo: 'nvidia/nemotron-3-super-120b-a12b',                 classe: 'leve' , peso: 0 },
    { id: 'polli',     nome: 'Pollinations openai-fast',      base: 'https://text.pollinations.ai/openai',                      modelo: 'openai-fast',                                       classe: 'leve' , peso: 3 },
    { id: 'ovhq38',    nome: 'Qwen3.8-27B (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.8-27B',                                       classe: 'leve' , peso: 7 },
    { id: 'kilolight', nome: 'Nemotron-3.5-Lightning (Kilo)', base: 'https://api.kilo.ai/api/gateway',                          modelo: 'nvidia/nemotron-3.5-lightning:free',                classe: 'forte' , peso: 90, latPar: 60000 },
    { id: 'lagunas',   nome: 'Laguna-S-2.1 (Kilo)',           base: 'https://api.kilo.ai/api/gateway',                          modelo: 'poolside/laguna-s-2.1:free',                        classe: 'forte' , peso: 73, latPar: 9200 },
    { id: 'vlqwen',    nome: 'Qwen2.5-VL-72B (OVH)',          base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen2.5-VL-72B-Instruct',                           classe: 'leve' , peso: 3 },
    { id: 'ovhoss20',  nome: 'gpt-oss-20b (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'gpt-oss-20b',                                       classe: 'leve' , peso: 7 },
    { id: 'ovhq9',     nome: 'Qwen3.5-9B (OVH)',              base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.5-9B',                                        classe: 'leve' , peso: 7 },
    { id: 'ovhl',      nome: 'Llama-3.3-70B (OVH)',           base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Meta-Llama-3_3-70B-Instruct',                       classe: 'leve' , peso: 7 },
    { id: 'ovhnemo',   nome: 'Mistral-Nemo (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Mistral-Nemo-Instruct-2407',                        classe: 'leve' , peso: 7 },
    { id: 'nanoomni',  nome: 'Nano-Omni-30B (Kilo)',          base: 'https://api.kilo.ai/api/gateway',                          modelo: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', classe: 'media' , peso: 13 },
    { id: 'coherecode',nome: 'Cohere-North-Mini (Kilo)',      base: 'https://api.kilo.ai/api/gateway',                          modelo: 'cohere/north-mini-code:free',                       classe: 'leve' }
  ];

  /* Modelos da OVH devolvem só 'reasoning' às vezes. Devolver o monólogo inteiro é defeito:
     a pessoa pergunta e recebe "Thinking Process: 1. Analyze...". Aqui a conclusão é extraída. */
  var CABECALHO_RACIOCINIO = /^(thinking\s*process|reasoning|analysis|analisando|cadeia de pensamento|chain of thought|step\s*1|1\.\s*analy|refinement|constraint says|draft|verify|given\b|we\s+need|we\s+must|i\s+need|i\s+must|the\s+user\s+wants|let\s+me|okay,)/i;
  var PREAMBULO = /^(thinking|reasoning|analysis|analisando|analiso|let me|let's|hmm|okay|ok\b|wait|first,|firstly|next,|the user|user asks|the question|i need|i should|i'll|we need|looking at|actually|so,|now,|vou |preciso |deixa eu|refinement|constraint|draft|verify|double-check|checking|note:|final check|given\b|the constraint|given that)/i;

  var CURTAS_OK = { sim: 1, nao: 1, 'não': 1, yes: 1, no: 1, oui: 1, ok: 1, 'é': 1 };

  /* Pedaço de frase não é resposta. "Is it", "Actually, looking", "of the" — são restos de raciocínio
     que os modelos pequenos devolvem quando o provedor corta a geração no meio. Aceitar isso é
     entregar lixo com cara de resposta (medido: id 71 da régua de 200, resposta "Is it"). */
  var FUNCIONAIS = ('a an the of and or to in on at that this these those it its is are was were be been ' +
    'being do does did has have had i we you he she they me us them my your so but if as with for from by ' +
    'not no yes actually looking let about which what who whom whose how why when where than then there ' +
    'here just also very more most much many some any each every such own same too can could would should ' +
    'will shall may might must').split(' ');
  var SO_FUNCIONAIS = {};
  FUNCIONAIS.forEach(function (w) { SO_FUNCIONAIS[w] = 1; });

  function fragmento(t) {
    var s = String(t || '').toLowerCase().replace(/[^a-zà-ÿ0-9\s']/g, ' ').trim();
    if (!s) return true;
    var pal = s.split(/\s+/).filter(Boolean);
    if (pal.length > 6) return false;
    return pal.every(function (p) { return SO_FUNCIONAIS[p] === 1; });
  }

  /* devolve texto utilizável ou '' (resposta com preâmbulo de raciocínio não serve) */
  function sanear(t) {
    var s = String(t || '').trim();
    if (!util(s)) return '';
    // resposta legítima de uma palavra (sim/não/yes/no) é resposta, ainda que seja palavra funcional
    if (CURTAS_OK[s.toLowerCase()] === 1) return s;
    if (fragmento(s)) return '';
    if (/^[\d.,\s%°+\-/]+$/.test(s)) return s;
    if (CABECALHO_RACIOCINIO.test(s)) {
      var marcado = /(?:resposta|answer|resultado|result|conclus[aã]o)\s*(?:[:\-]|(?:é|e|is)\b)\s*(.+)$/i.exec(s);
      return (marcado && util(marcado[1])) ? marcado[1].trim() : '';
    }
    // frase minúscula com ponto final e sem número é resto de raciocínio ("the price."), não resposta.
    // O limite de tamanho é essencial: sem ele esta regra rejeitava PARÁGRAFO INTEIRO que começa com
    // minúscula e não cita número — e o gerador de texto longo descartava texto bom (medido: 356
    // palavras jogadas fora e 119 s de espera para entregar 172).
    var nPalavrasSan = s.split(/\s+/).length;
    if (nPalavrasSan <= 12 && /^[a-zà-ÿ]/.test(s) && !/\d/.test(s) && nPalavrasSan >= 2 && /[.!]$/.test(s)) return '';
    // palavra de 3 letras capitalizada é resposta cortada ("Hip" de hipérbole); sigla/elemento de 1-2 letras passa
    // 2–3 letras capitalizadas: só passa se for símbolo de elemento conhecido ou palavra curta legítima
    if (/^[A-ZÀ-Ý][a-zà-ÿ]{1,2}$/.test(s) && !CURTAS_OK[s.toLowerCase()] && !ELEMENTO_DE[s.toLowerCase()]) return '';
    if (!PREAMBULO.test(s)) return s;
    var c = extrairConclusao(s);
    if (c && util(c) && !PREAMBULO.test(c) && c !== s) return c;
    // última frase do texto, se ela própria não for preâmbulo ("Let me think. Biggest")
    var frases = s.split(/(?<=[.!?])\s+/).map(function (f) { return f.trim(); }).filter(Boolean);
    for (var i = frases.length - 1; i >= 1; i--) {
      if (!PREAMBULO.test(frases[i]) && util(frases[i])) return frases[i];
    }
    return '';
  }

  function extrairConclusao(raciocinio) {
    var linhas = String(raciocinio).split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    for (var i = linhas.length - 1; i >= 0; i--) {
      var l = linhas[i].replace(/^[-*•\d.)\s]+/, '').trim();
      if (!l || /^(thinking|analysis|analisar|step|passo)\b/i.test(l)) continue;
      if (l.length < 2 || l.length > 160) continue;
      var final = /(?:resposta|answer|resultado|result|conclus[aã]o|portanto|therefore|logo)\s*(?:[:\-]|(?:é|e|is)\b)\s*(.+)$/i.exec(l);
      if (final) return final[1].trim();
      if (/^[\w\sÀ-ÿ,'"()\-]+$/.test(l) && !/^(ok|sim|nao|não)$/i.test(l)) return l;
    }
    return '';
  }

  /* ================= BASE LOCAL DE PORTUGUÊS (R$ 0, sem modelo) =================
     Formas irregulares e coletivos são fatos de língua, não opinião: ficam em tabela.
     Regras (plural, diminutivo, aumentativo, sílabas) completam o que é regular. */
  var COLETIVOS = {
    lobo: 'alcateia', lobos: 'alcateia', 'lobo-guará': 'alcateia', cão: 'matilha', cães: 'matilha', cachorro: 'matilha', cachorros: 'matilha',
    peixe: 'cardume', peixes: 'cardume', ave: 'revoada', aves: 'revoada', pássaro: 'revoada', pássaros: 'revoada', passaro: 'revoada', passaros: 'revoada',
    abelha: 'enxame', abelhas: 'enxame', formiga: 'formigueiro', formigas: 'formigueiro', boi: 'boiada', bois: 'boiada', vaca: 'rebanho', vacas: 'rebanho',
    cavalo: 'manada', cavalos: 'manada', ovelha: 'rebanho', ovelhas: 'rebanho', cabra: 'rebanho', cabras: 'rebanho', elefante: 'manada', elefantes: 'manada',
    estrela: 'constelação', estrelas: 'constelação', livro: 'biblioteca', livros: 'biblioteca', quadro: 'pinacoteca', quadros: 'pinacoteca',
    ilha: 'arquipélago', ilhas: 'arquipélago', montanha: 'cordilheira', montanhas: 'cordilheira', montanha_: 'serra',
    uva: 'cacho', uvas: 'cacho', flor: 'ramalhete', flores: 'ramalhete', músico: 'orquestra', músicos: 'orquestra',
    ator: 'elenco', atores: 'elenco', jogador: 'time', jogadores: 'time', aluno: 'turma', alunos: 'turma',
    soldado: 'tropa', soldados: 'tropa', índio: 'tribo', 'indio': 'tribo', 'índios': 'tribo', ladrão: 'quadrilha', ladrões: 'quadrilha',
    árvore: 'floresta', árvores: 'floresta', porco: 'vara', porcos: 'vara', camelo: 'cáfila', camelos: 'cáfila',
    macaco: 'bando', macacos: 'bando', hiena: 'clã', hienas: 'clã', mosquito: 'nuvem', mosquitos: 'nuvem',
    navio: 'frota', navios: 'frota', avião: 'esquadrilha', aviões: 'esquadrilha', caneta: 'lote', papel: 'resma',
    chave: 'molho', chaves: 'molho', cebola: 'réstia', cebolas: 'réstia', banana: 'penca', bananas: 'penca', dente: 'arcada', dentes: 'arcada'
  };
  var IRREGULARES = {
    feminino: {
      ator: 'atriz', 'ator de voz': 'atriz', padre: 'madre', cavalo: 'égua', carneiro: 'ovelha', boi: 'vaca', galo: 'galinha',
      homem: 'mulher', pai: 'mãe', irmão: 'irmã', genro: 'nora', padrasto: 'madrasta', compadre: 'comadre', padrinho: 'madrinha',
      embaixador: 'embaixatriz', zangão: 'abelha', cão: 'cadela', cachorro: 'cadela', rei: 'rainha', duque: 'duquesa',
      príncipe: 'princesa', imperador: 'imperatriz', mestre: 'mestra', poeta: 'poetisa', 'ator principal': 'protagonista',
      avô: 'avó', 'tio': 'tia', 'sobrinho': 'sobrinha', 'neto': 'neta', 'sogro': 'sogra', 'cunhado': 'cunhada'
    },
    masculino: {
      abelha: 'zangão', égua: 'cavalo', ovelha: 'carneiro', vaca: 'boi', galinha: 'galo', mulher: 'homem',
      mãe: 'pai', irmã: 'irmão', nora: 'genro', madrasta: 'padrasto', comadre: 'compadre', madrinha: 'padrinho',
      rainha: 'rei', duquesa: 'duque', princesa: 'príncipe', imperatriz: 'imperador', poetisa: 'poeta', cadela: 'cão',
      avó: 'avô', tia: 'tio', sobrinha: 'sobrinho', neta: 'neto', sogra: 'sogro', cunhada: 'cunhado'
    },
    superlativo: { bom: 'ótimo', mau: 'péssimo', grande: 'máximo', pequeno: 'mínimo', bem: 'otimamente', mal: 'pessimamente' },
    plural: {
      pão: 'pães', cidadão: 'cidadãos', alemão: 'alemães', animal: 'animais', papel: 'papéis', lápis: 'lápis',
      país: 'países', hotel: 'hotéis', farol: 'faróis', anzol: 'anzóis', móvel: 'móveis', difícil: 'difíceis',
      som: 'sons', jovem: 'jovens', homem: 'homens', capitão: 'capitães', cão: 'cães', vulcão: 'vulcões',
      questão: 'questões', coração: 'corações', mulher: 'mulheres', feliz: 'felizes', réptil: 'répteis',
      funil: 'funis', 'guarda-chuva': 'guarda-chuvas', 'guarda-roupa': 'guarda-roupas', 'couve-flor': 'couves-flores',
      tabelião: 'tabeliães', escrivão: 'escrivães', refrão: 'refrães', mão: 'mãos', irmão: 'irmãos', órgão: 'órgãos',
      caráter: 'caracteres', júniOR: 'juniores', cônsul: 'cônsules', gás: 'gases', mês: 'meses', vez: 'vezes'
    },
    aumentativo: { casa: 'casarão', boca: 'bocarra', homem: 'homenzarrão', mulher: 'mulherona', livro: 'livrão', garoto: 'garotão', pedra: 'pedrona', mão: 'manzorra', amigo: 'amigão', carro: 'carrão' },
    diminutivo: { casa: 'casinha', livro: 'livrinho', pão: 'pãozinho', animal: 'animalzinho', flor: 'florzinha', papel: 'papelzinho', mão: 'mãozinha', garoto: 'garotinho', café: 'cafezinho', carro: 'carrinho' }
  };
  var ANTONIMOS = {
    alto: 'baixo', baixo: 'alto', claro: 'escuro', escuro: 'claro', doce: 'amargo', amargo: 'doce', grosso: 'fino', fino: 'grosso',
    rápido: 'lento', lento: 'rápido', grande: 'pequeno', pequeno: 'grande', quente: 'frio', frio: 'quente', forte: 'fraco', fraco: 'forte',
    novo: 'velho', velho: 'novo', cheio: 'vazio', vazio: 'cheio', certo: 'errado', errado: 'certo', fácil: 'difícil', difícil: 'fácil',
    longe: 'perto', perto: 'longe', cedo: 'tarde', tarde: 'cedo', amor: 'ódio', ódio: 'amor', começar: 'terminar', terminar: 'começar',
    subir: 'descer', descer: 'subir', entrar: 'sair', sair: 'entrar', abrir: 'fechar', fechar: 'abrir', comprar: 'vender', vender: 'comprar',
    ganhar: 'perder', perder: 'ganhar', rir: 'chorar', chorar: 'rir', lembrar: 'esquecer', esquecer: 'lembrar', antes: 'depois', depois: 'antes',
    dentro: 'fora', fora: 'dentro', belo: 'feio', feio: 'belo', bonito: 'feio', feia: 'bonita'
  };
  var SINONIMOS = {
    belo: 'bonito', bonito: 'belo', rápido: 'veloz', veloz: 'rápido', casa: 'moradia', moradia: 'casa', feliz: 'contente',
    contente: 'feliz', triste: 'melancólico', grande: 'enorme', enorme: 'grande', pequeno: 'minúsculo', inteligente: 'sábio',
    forte: 'robusto', medo: 'temor', professor: 'educador', médico: 'doutor', amigo: 'companheiro', carro: 'automóvel',
    dinheiro: 'capital', começar: 'iniciar', terminar: 'finalizar', bonita: 'bela'
  };
  var CLASSE_FIXA = {
    cachorro: 'substantivo', casa: 'substantivo', menino: 'substantivo', corajoso: 'adjetivo', feliz: 'adjetivo',
    correr: 'verbo', rapidamente: 'advérbio', livro: 'substantivo', rápido: 'adjetivo', lentamente: 'advérbio'
  };

  function semAcentoMin(s) { return semAcento(s); }

  function pluralRegular(p) {
    var a = semAcentoMin(p);
    if (/(s|x|z)$/.test(a) && !/(es)$/.test(a)) return p + 'es';
    // -l troca de vogal no plural: animal→animais, papel→papéis, caracol→caracóis, azul→azuis, funil→funis
    if (/l$/.test(a)) {
      var corpo = p.slice(0, -2), m = /([aeiouáéíóúâêôãõ])l$/i.exec(p);  // cai a vogal + o l
      if (m) {
        // acento onde a norma pede: papel→papéis, caracol→caracóis
        var troca = { a: 'ai', e: 'éi', o: 'ói', u: 'ui', i: 'i', 'á': 'ai', 'é': 'éi', 'ó': 'ói', 'ú': 'ui',
                      'â': 'ai', 'ê': 'éi', 'ô': 'ói', 'ã': 'ai', 'õ': 'ói' }[m[1].toLowerCase()] || 'i';
        return corpo + troca + 's';
      }
      return corpo + 'is';
    }
    if (/m$/.test(a)) return p.slice(0, -1) + 'ns';      // homem→homens, item→itens
    if (/r$/.test(a) || /z$/.test(a)) return p + 'es';   // (z já tratado acima)
    if (/[aeiou]$/.test(a)) return p + 's';
    return p + 's';
  }

  function contarSilabas(palavra) {
    var p = semAcentoMin(palavra).replace(/[^a-z]/g, '');
    p = p.replace(/ch/g, 'x').replace(/lh/g, 'x').replace(/nh/g, 'x')
         .replace(/qu(?=[ei])/g, 'q').replace(/gu(?=[ei])/g, 'g');
    var grupos = p.match(/[aeiouy]+/g) || [];
    var n = grupos.length;
    // ditongos crescentes/decrescentes contam como uma sílaba
    var ditongos = (p.match(/(ai|ei|oi|ui|au|eu|iu|ou|ão|ãe|õe|oe|ae)/g) || []).length;
    return Math.max(1, n - ditongos);
  }


  /* ====== TABELA PERIÓDICA (símbolo ↔ nome) e FATOS ESTÁVEIS ======
     Fonte: fatos verificáveis de livro-texto. Não é opinião de modelo: quando o item está
     aqui, a resposta é a mesma toda vez. O que não estiver aqui continua indo para o consenso. */
  var ELEMENTOS = ('H hidrogênio|He hélio|Li lítio|Be berílio|B boro|C carbono|N nitrogênio|O oxigênio|F flúor|Ne neônio|'
    + 'Na sódio|Mg magnésio|Al alumínio|Si silício|P fósforo|S enxofre|Cl cloro|Ar argônio|K potássio|Ca cálcio|Sc escândio|'
    + 'Ti titânio|V vanádio|Cr cromo|Mn manganês|Fe ferro|Co cobalto|Ni níquel|Cu cobre|Zn zinco|Ga gálio|Ge germânio|As arsênio|'
    + 'Se selênio|Br bromo|Kr criptônio|Rb rubídio|Sr estrôncio|Y ítrio|Zr zircônio|Nb nióbio|Mo molibdênio|Tc tecnécio|Ru rutênio|'
    + 'Rh ródio|Pd paládio|Ag prata|Cd cádmio|In índio|Sn estanho|Sb antimônio|Te telúrio|I iodo|Xe xenônio|Cs césio|Ba bário|'
    + 'La lantânio|Ce cério|Pr praseodímio|Nd neodímio|Pm promécio|Sm samário|Eu európio|Gd gadolínio|Tb térbio|Dy disprósio|'
    + 'Ho hólmio|Er érbio|Tm túlio|Yb itérbio|Lu lutécio|Hf háfnio|Ta tantálio|W tungstênio|Re rênio|Os ósmio|Ir irídio|Pt platina|'
    + 'Au ouro|Hg mercúrio|Tl tálio|Pb chumbo|Bi bismuto|Po polônio|At astato|Rn radônio|Fr frâncio|Ra rádio|Ac actínio|Th tório|'
    + 'Pa protactínio|U urânio|Np neptúnio|Pu plutônio|Am amerício|Cm cúrio|Bk berquélio|Cf califórnio|Es einstênio|Fm férmio|'
    + 'Md mendelévio|No nobélio|Lr laurêncio|Rf ruterfórdio|Db dúbnio|Sg seabórgio|Bh bóhrio|Hs hássio|Mt meitnério|Ds darmstádtio|'
    + 'Rg roentgênio|Cn copernício|Nh nihônio|Fl fleróvio|Mc moscóvio|Lv livermório|Ts tenesso|Og oganessônio').split('|');
  var SIMBOLO_DE = {}, ELEMENTO_DE = {};
  ELEMENTOS.forEach(function (par) {
    var p = par.split(' ');
    var simbolo = p[0], nome = p.slice(1).join(' ');
    SIMBOLO_DE[semAcento(nome)] = simbolo;
    ELEMENTO_DE[simbolo.toLowerCase()] = nome;
  });

  /* figuras de linguagem: frases canônicas de gramática, não opinião de modelo */
  var FIGURAS_FRASE = [
    { q: /rio de l[áa]grimas|chorei (um )?rio|mar de l[áa]grimas/i, r: 'Hipérbole' },
    { q: /morrer de (rir|amor|fome|sede|saudade|medo|inveja|raiva|vergonha|t[ée]dio)|morri de (saudade|amor|fome|sede|medo|rir|t[ée]dio)|chorei at[ée] (secar|morrer)/i, r: 'Hipérbole' },
    { q: /j[áa] (falei|disse) (isso )?(um )?milh[ãa]o de vezes|rep[ée]ti mil vezes/i, r: 'Hipérbole' },
    { q: /pesa(va)? (uma|1) tonelada|estou mort[oa] de (cansad|cansa)/i, r: 'Hipérbole' },
    { q: /\b(vento|mar|sol|lua|flor|pedra|tempo|morte|cidade|casa|fogo|noite|dia|ar|chuva)\s+(sussurr|beij|abra[cçc]|chor|sorri|grit|dan[cç]|falou|fala|disse|cant|cham|olha|pede|implora|acord|despert|dorm|sonha|respira|suspira|lamber|morde)/i, r: 'Personificação (prosopopeia)' },
    { q: /\b(a|o|as|os|meu|minha)\s+(morte|saudade|dor|amor|tempo|vida)\s+(chegou|veio|bateu|chamou|levou)/i, r: 'Personificação (prosopopeia)' },
    { q: /\bcomo\s+(um|uma|o|a|se)\b|tal qual|que nem\b|parece (um|uma|que)\b|feito (um|uma)\b/i, r: 'Comparação (símile)' },
    { q: /\b\w+\s+[ée]\s+(um|uma)\s+\w+/i, r: 'Metáfora' },
    { q: /chove(ndo)? (muito|c[ée]u|forte)|calor de (derreter|rachar)/i, r: 'Hipérbole' },
    { q: /\b(ontem|hoje|agora)\s+vi\s+(o|a)\s+\w+/i, r: 'Pleonasmo' }
  ];

  /* capitais: países mais perguntados + as 27 unidades do Brasil.
     Wikidata continua como segunda opção para a cauda longa; esta tabela não tem rede nem limite. */
  var CAPITAIS = {
    'acre': 'Rio Branco',
    'afeganistão': 'Cabul',
    'alagoas': 'Maceió',
    'albânia': 'Tirana',
    'alemanha': 'Berlim',
    'amapá': 'Macapá',
    'amazonas': 'Manaus',
    'andorra': 'Andorra-a-Velha',
    'angola': 'Luanda',
    'argentina': 'Buenos Aires',
    'argélia': 'Argel',
    'armênia': 'Erevan',
    'arábia saudita': 'Riad',
    'austrália': 'Camberra',
    'azerbaijão': 'Baku',
    'bahamas': 'Nassau',
    'bahia': 'Salvador',
    'bangladesh': 'Dacca',
    'barbados': 'Bridgetown',
    'barein': 'Manama',
    'belize': 'Belmopan',
    'benim': 'Porto-Novo',
    'bolívia': 'Sucre',
    'botswana': 'Gaborone',
    'brasil': 'Brasília',
    'brunei': 'Bandar Seri Begawan',
    'bulgária': 'Sófia',
    'burquina fasso': 'Uagadugu',
    'burundi': 'Gitega',
    'butão': 'Timbu',
    'bélgica': 'Bruxelas',
    'bósnia e herzegovina': 'Sarajevo',
    'cabo verde': 'Praia',
    'camarões': 'Yaoundé',
    'camboja': 'Phnom Penh',
    'canadá': 'Ottawa',
    'catar': 'Doha',
    'cazaquistão': 'Astana',
    'ceará': 'Fortaleza',
    'chade': 'N’Djamena',
    'chile': 'Santiago',
    'china': 'Pequim',
    'chipre': 'Nicósia',
    'colômbia': 'Bogotá',
    'comores': 'Moroni',
    'congo': 'Brazzaville',
    'coreia do norte': 'Pyongyang',
    'coreia do sul': 'Seul',
    'costa do marfim': 'Yamoussoukro',
    'costa rica': 'San José',
    'croácia': 'Zagreb',
    'cuba': 'Havana',
    'dinamarca': 'Copenhague',
    'distrito federal': 'Brasília',
    'djibuti': 'Djibuti',
    'egito': 'Cairo',
    'el salvador': 'San Salvador',
    'micronésia': 'Palikir',     'kiribati': 'Tarawa do Sul',     'tuvalu': 'Funafuti',     'samoa': 'Apia',     'tonga': 'Nuku’alofa',     'vanuatu': 'Port Vila',     'ilhas salomão': 'Honiara',     'palau': 'Ngerulmud',     'ilhas marshall': 'Majuro',     'nauru': 'Yaren',     'granada': 'Saint George’s',     'são cristóvão e névis': 'Basseterre',     'santa lúcia': 'Castries',     'são vicente e granadinas': 'Kingstown',     'antígua e barbuda': 'Saint John’s',     'dominica': 'Roseau',     'guiana': 'Georgetown',     'suriname': 'Paramaribo',     'guiana francesa': 'Caiena',     'butão ': 'Timbu',     'república centro-africana': 'Bangui',     'são tomé e príncipe': 'São Tomé',     'maurícia': 'Port Louis',
    'emirados árabes unidos': 'Abu Dhabi',
    'equador': 'Quito',
    'eritreia': 'Asmara',
    'eslováquia': 'Bratislava',
    'eslováquia ': 'Bratislava',
    'eslovênia': 'Liubliana',
    'espanha': 'Madri',
    'espírito santo': 'Vitória',
    'essuatíni': 'Mbabane',
    'estados unidos': 'Washington, D.C.',
    'estônia': 'Tallinn',
    'etiópia': 'Addis Abeba',
    'eua': 'Washington, D.C.',
    'fiji': 'Suva',
    'filipinas': 'Manila',
    'finlândia': 'Helsinque',
    'frança': 'Paris',
    'gabão': 'Libreville',
    'gana': 'Acra',
    'geórgia': 'Tbilisi',
    'goiás': 'Goiânia',
    'groenlândia': 'Nuuk',
    'grécia': 'Atenas',
    'guatemala': 'Cidade da Guatemala',
    'guiné': 'Conacri',
    'guiné equatorial': 'Malabo',
    'guiné-bissau': 'Bissau',
    'gâmbia': 'Banjul',
    'haiti': 'Porto Príncipe',
    'holanda': 'Amsterdã',
    'honduras': 'Tegucigalpa',
    'hungria': 'Budapeste',
    'indonésia': 'Jacarta',
    'inglaterra': 'Londres',
    'iraque': 'Bagdá',
    'irlanda': 'Dublin',
    'irã': 'Teerã',
    'islândia': 'Reiquiavique',
    'israel': 'Jerusalém',
    'itália': 'Roma',
    'iêmen': 'Sana',
    'jamaica': 'Kingston',
    'japão': 'Tóquio',
    'jordânia': 'Amã',
    'kuwait': 'Cidade do Kuwait',
    'laos': 'Vientiane',
    'lesoto': 'Maseru',
    'letônia': 'Riga',
    'libéria': 'Monróvia',
    'liechtenstein': 'Vaduz',
    'lituânia': 'Vilnius',
    'luxemburgo': 'Luxemburgo',
    'líbano': 'Beirute',
    'líbia': 'Trípoli',
    'macedônia do norte': 'Skopje',
    'madagascar': 'Antananarivo',
    'malauí': 'Lilongwe',
    'maldivas': 'Malé',
    'mali': 'Bamako',
    'malta': 'Valeta',
    'malásia': 'Kuala Lumpur',
    'maranhão': 'São Luís',
    'marrocos': 'Rabat',
    'mato grosso': 'Cuiabá',
    'mato grosso do sul': 'Campo Grande',
    'mauritânia': 'Nouakchott',
    'maurício': 'Port Louis',
    'mianmar': 'Naypyidaw',
    'minas gerais': 'Belo Horizonte',
    'mongólia': 'Ulã Bator',
    'montenegro': 'Podgorica',
    'moçambique': 'Maputo',
    'méxico': 'Cidade do México',
    'mônaco': 'Mônaco',
    'namíbia': 'Windhoek',
    'nepal': 'Katmandu',
    'nicarágua': 'Manágua',
    'niger': 'Niamey',
    'nigéria': 'Abuja',
    'noruega': 'Oslo',
    'nova zelândia': 'Wellington',
    'omã': 'Mascate',
    'panamá': 'Cidade do Panamá',
    'papua-nova guiné': 'Port Moresby',
    'paquistão': 'Islamabad',
    'paraguai': 'Assunção',
    'paraná': 'Curitiba',
    'paraíba': 'João Pessoa',
    'pará': 'Belém',
    'países baixos': 'Amsterdã',
    'pernambuco': 'Recife',
    'peru': 'Lima',
    'piauí': 'Teresina',
    'polônia': 'Varsóvia',
    'porto rico': 'San Juan',
    'portugal': 'Lisboa',
    'quirguistão': 'Bisqueque',
    'quênia': 'Nairóbi',
    'reino unido': 'Londres',
    'república democrática do congo': 'Kinshasa',
    'república dominicana': 'Santo Domingo',
    'república tcheca': 'Praga',
    'rio de janeiro': 'Rio de Janeiro',
    'rio grande do norte': 'Natal',
    'rio grande do sul': 'Porto Alegre',
    'romênia': 'Bucareste',
    'rondônia': 'Porto Velho',
    'roraima': 'Boa Vista',
    'ruanda': 'Kigali',
    'rússia': 'Moscou',
    'san marino': 'San Marino',
    'santa catarina': 'Florianópolis',
    'seicheles': 'Victoria',
    'senegal': 'Dacar',
    'sergipe': 'Aracaju',
    'serra leoa': 'Freetown',
    'singapura': 'Singapura',
    'somália': 'Mogadíscio',
    'sri lanka': 'Colombo',
    'sudão': 'Cartum',
    'sudão do sul': 'Juba',
    'suécia': 'Estocolmo',
    'suíça': 'Berna',
    'são paulo': 'São Paulo',
    'sérvia': 'Belgrado',
    'síria': 'Damasco',
    'tailândia': 'Bangkok',
    'tajiquistão': 'Duchambe',
    'tanzânia': 'Dodoma',
    'timor-leste': 'Díli',
    'tocantins': 'Palmas',
    'togo': 'Lomé',
    'trinidad e tobago': 'Porto de Espanha',
    'tunísia': 'Túnis',
    'turcomenistão': 'Asgabate',
    'turquia': 'Ancara',
    'ucrânia': 'Kiev',
    'uganda': 'Kampala',
    'uruguai': 'Montevidéu',
    'uzbequistão': 'Tashkent',
    'vaticano': 'Cidade do Vaticano',
    'venezuela': 'Caracas',
    'vietnã': 'Hanói',
    'zimbábue': 'Harare',
    'zâmbia': 'Lusaka',
    'áfrica do sul': 'Pretória',
    'áustria': 'Viena',
    'índia': 'Nova Délhi'
  };

  /* índice sem acento: a pergunta chega como "França"/"Sergipe", a chave é acentuada */
  var CAPITAIS_SEM_ACENTO = (function () {
    var m = {};
    for (var k in CAPITAIS) if (Object.prototype.hasOwnProperty.call(CAPITAIS, k)) m[semAcento(k)] = CAPITAIS[k];
    return m;
  })();


  /* inglês irregular: mesmo papel das tabelas de português — fato de língua, não opinião de modelo */
  var ING_VERBO = {
    be: ['was/were'], begin: ['began'], break: ['broke'], bring: ['brought'], build: ['built'], buy: ['bought'],
    catch: ['caught'], choose: ['chose'], come: ['came'], cost: ['cost'], cut: ['cut'], do: ['did'], draw: ['drew'],
    drink: ['drank'], drive: ['drove'], eat: ['ate'], fall: ['fell'], feel: ['felt'], fight: ['fought'], find: ['found'],
    fly: ['flew'], forget: ['forgot'], forgive: ['forgave'], get: ['got'], give: ['gave'], go: ['went'], grow: ['grew'],
    have: ['had'], hear: ['heard'], hide: ['hid'], hit: ['hit'], hold: ['held'], hurt: ['hurt'], keep: ['kept'],
    know: ['knew'], lead: ['led'], learn: ['learned/learnt'], leave: ['left'], lend: ['lent'], let: ['let'],
    lie: ['lay'], lose: ['lost'], make: ['made'], mean: ['meant'], meet: ['met'], pay: ['paid'], put: ['put'],
    read: ['read'], ride: ['rode'], ring: ['rang'], rise: ['rose'], run: ['ran'], say: ['said'], see: ['saw'],
    sell: ['sold'], send: ['sent'], set: ['set'], shake: ['shook'], shine: ['shone'], shoot: ['shot'], show: ['showed'],
    sing: ['sang'], sit: ['sat'], sleep: ['slept'], speak: ['spoke'], spend: ['spent'], stand: ['stood'],
    steal: ['stole'], swim: ['swam'], take: ['took'], teach: ['taught'], tear: ['tore'], tell: ['told'],
    think: ['thought'], throw: ['threw'], understand: ['understood'], wake: ['woke'], wear: ['wore'],
    win: ['won'], write: ['wrote']
  };
  var ING_PLURAL = {
    foot: 'feet', tooth: 'teeth', goose: 'geese', man: 'men', woman: 'women', child: 'children', mouse: 'mice',
    louse: 'lice', ox: 'oxen', person: 'people', leaf: 'leaves', life: 'lives', knife: 'knives', wife: 'wives',
    wolf: 'wolves', half: 'halves', shelf: 'shelves', thief: 'thieves', loaf: 'loaves', cactus: 'cacti',
    fungus: 'fungi', nucleus: 'nuclei', syllabus: 'syllabi', analysis: 'analyses', crisis: 'crises',
    thesis: 'theses', datum: 'data', medium: 'media', criterion: 'criteria', phenomenon: 'phenomena',
    sheep: 'sheep', deer: 'deer', fish: 'fish', aircraft: 'aircraft', series: 'series', species: 'species',
    quiz: 'quizzes', index: 'indices/indexes', matrix: 'matrices', vertex: 'vertices', appendix: 'appendices'
  };
  var ING_GRAU = {
    good: { comp: 'better', sup: 'best' }, bad: { comp: 'worse', sup: 'worst' },
    far: { comp: 'farther/further', sup: 'farthest/furthest' }, little: { comp: 'less', sup: 'least' },
    much: { comp: 'more', sup: 'most' }, many: { comp: 'more', sup: 'most' },
    old: { comp: 'older/elder', sup: 'oldest/eldest' }, late: { comp: 'later', sup: 'latest/last' },
    well: { comp: 'better', sup: 'best' }, ill: { comp: 'worse', sup: 'worst' }
  };

  /* comparativo/superlativo regular com as regras de ortografia do inglês */
  function grauRegular(p, tipo) {
    var v = String(p || '').toLowerCase();
    if (!/^[a-z]+$/.test(v)) return null;
    var silabas = (v.match(/[aeiouy]+/g) || []).length;
    var longo = silabas >= 3 || /(ful|ous|ive|able|ible|al|ic)$/.test(v);
    if (longo) return (tipo === 'comp' ? 'more ' : 'most ') + v;
    var raiz = v;
    if (/[^aeiou]y$/.test(v)) raiz = v.slice(0, -1) + 'i';
    else if (/e$/.test(v)) raiz = v.slice(0, -1);
    else if (/^[a-z]*[aeiou][^aeiouwxy]$/.test(v) && silabas === 1) raiz = v + v.slice(-1);
    return tipo === 'comp' ? raiz + 'er' : raiz + 'est';
  }

  /* siglas das 27 unidades federativas: dado estável, não pergunta para modelo */
  var SIGLAS_UF = {
    acre: 'AC', alagoas: 'AL', amapá: 'AP', amazonas: 'AM', bahia: 'BA', ceará: 'CE',
    'distrito federal': 'DF', 'espírito santo': 'ES', goiás: 'GO', maranhão: 'MA',
    'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', pará: 'PA',
    paraíba: 'PB', paraná: 'PR', pernambuco: 'PE', piauí: 'PI', 'rio de janeiro': 'RJ',
    'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondônia: 'RO', roraima: 'RR',
    'santa catarina': 'SC', 'são paulo': 'SP', sergipe: 'SE', tocantins: 'TO'
  };

  /* índice sem acento (a pergunta chega como "São Paulo", a chave é acentuada) */
  var SIGLAS_SEM_ACENTO = (function () {
    var m = {};
    for (var k in SIGLAS_UF) if (Object.prototype.hasOwnProperty.call(SIGLAS_UF, k)) m[semAcento(k)] = SIGLAS_UF[k];
    return m;
  })();

  var FATOS = [
    { q: /capital do brasil/i, r: 'Brasília' },
    { q: /(quantas|n[úu]mero de) unidades federativas/i, r: '27 (26 estados e o Distrito Federal)' },
    { q: /quantos estados (o brasil )?(tem|h[áa])\??\s*$/i, r: '26 estados' },
    { q: /(meses|m[êe]s).*(30|trinta) dias/i, r: '4 meses (abril, junho, setembro e novembro)' },
    { q: /(meses|m[êe]s).*(31|trinta e um) dias/i, r: '7 meses (janeiro, março, maio, julho, agosto, outubro e dezembro)' },
    { q: /quantos dias tem (um|o) ano bissexto/i, r: '366 dias' },
    { q: /quantos (meses|dias|semanas)\s+(tem|h[áa])\s+(um|o|no)\s+ano\?*$/i, r: '12 meses, 365 dias (366 em ano bissexto) e 52 semanas' },
    { q: /quantos dias tem (o m[êe]s de )?fevereiro\??\s*$/i, r: '28 dias (29 em ano bissexto)' },
    { q: /quantos minutos tem (uma|1) hora\??\s*$/i, r: '60 minutos' },
    { q: /quantos segundos tem (uma|1) hora\??\s*$/i, r: '3.600 segundos' },
    { q: /quantos dias tem (uma|1) semana\??\s*$/i, r: '7 dias' },
    { q: /quantos planetas.*sistema solar|planetas.*sistema solar/i, r: '8' },
    { q: /planeta mais (pr[oó]ximo|perto).*sol/i, r: 'Mercúrio' },
    { q: /maior planeta.*sistema solar|maior planeta do sistema/i, r: 'Júpiter' },
    { q: /menor planeta.*sistema solar/i, r: 'Mercúrio' },
    { q: /planeta vermelho/i, r: 'Marte' },
    { q: /maior oceano/i, r: 'Pacífico' },
    { q: /oceano.*banha o brasil/i, r: 'Atlântico' },
    { q: /maior deserto do mundo/i, r: 'Antártico' },
    { q: /maior deserto (quente|arenoso)/i, r: 'Saara' },
    { q: /maior animal do mundo|maior animal que existe/i, r: 'Baleia-azul' },
    { q: /maior animal terrestre/i, r: 'Elefante-africano' },
    { q: /quantos ossos.*corpo humano/i, r: '206' },
    { q: /quantos dentes.*adulto/i, r: '32' },
    { q: /(f[oó]rmula|s[ií]mbolo qu[ií]mico) da [aá]gua/i, r: 'H2O' },
    { q: /metal l[ií]quido/i, r: 'Mercúrio' },
    { q: /valor aproximado de pi|quanto (vale|é) pi/i, r: '3,14159' },
    { q: /unidade de for[cç]a no si/i, r: 'Newton' },
    { q: /unidade de pot[eê]ncia no si/i, r: 'Watt' },
    { q: /unidade de energia no si/i, r: 'Joule' },
    { q: /unidade de press[aã]o no si/i, r: 'Pascal' },
    { q: /unidade de corrente (el[eé]trica )?no si/i, r: 'Ampère' },
    { q: /unidade de tens[aã]o( el[eé]trica)? no si/i, r: 'Volt' },
    { q: /unidade de frequ[eê]ncia no si/i, r: 'Hertz' },
    { q: /unidade de temperatura no si/i, r: 'Kelvin' },
    { q: /unidade de massa no si/i, r: 'Quilograma' },
    { q: /unidade de comprimento no si/i, r: 'Metro' },
    { q: /quem escreveu ['"“]?dom casmurro/i, r: 'Machado de Assis' },
    { q: /quem escreveu ['"“]?mem[oó]rias p[oó]stumas/i, r: 'Machado de Assis' },
    { q: /quem escreveu ['"“]?grande sert[aã]o/i, r: 'Guimarães Rosa' },
    { q: /quem escreveu ['"“]?vidas secas/i, r: 'Graciliano Ramos' },
    { q: /quem escreveu ['"“]?o corti[cç]o/i, r: 'Aluísio Azevedo' },
    { q: /quem escreveu ['"“]?iracema/i, r: 'José de Alencar' },
    { q: /quem escreveu ['"“]?o guarani/i, r: 'José de Alencar' },
    { q: /quem pintou .*mona lisa/i, r: 'Leonardo da Vinci' },
    { q: /quem pintou .*grito/i, r: 'Edvard Munch' },
    { q: /quem pintou .*guernica/i, r: 'Pablo Picasso' },
    { q: /quem pintou .*(noite estrelada|noite estrelado)/i, r: 'Vincent van Gogh' },
    { q: /quem pintou .*(última ceia|ultima ceia)/i, r: 'Leonardo da Vinci' },
    { q: /idioma (falado )?no jap[aã]o|l[ií]ngua (falada )?no jap[aã]o/i, r: 'Japonês' },
    { q: /moeda do jap[aã]o/i, r: 'Iene' },
    { q: /moeda dos estados unidos|moeda norte-americana/i, r: 'Dólar' },
    { q: /moeda da argentina/i, r: 'Peso argentino' },
    { q: /quem descobriu o brasil/i, r: 'Pedro Álvares Cabral' },
    { q: /quem proclamou a independ[eê]ncia do brasil/i, r: 'Dom Pedro I' },
    { q: /(quantos|n[uú]mero de) estados.*brasil/i, r: '26 estados e o Distrito Federal' }
  ];

  var SYS = 'Responda em uma linha, apenas o resultado pedido. Não escreva raciocínio, preâmbulo, passos de pensamento nem repita a pergunta (nada de "Let me", "Actually", "Thinking process").';
  var UA = 'chat-da-casa/2.0 (roteador gratuito)';

  function agora() { return Date.now(); }

  function semAcento(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function normal(s) {
    return semAcento(s).replace(/[^a-z0-9\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function Roteador(opcoes) {
    opcoes = opcoes || {};
    this.catalogo = opcoes.catalogo || CATALOGO;
    this.saude = {};
    this.cache = new Map();
    this._lerDisco();
    this.cacheMax = opcoes.cacheMax || 400;
    this.cacheTtl = opcoes.cacheTtl || 15 * 60 * 1000;
    this.orcamento = opcoes.orcamento || 110000;
    this.timeoutRota = opcoes.timeoutRota || 25000;
    this.voltasMax = opcoes.voltasMax || 4;
    this.votos = opcoes.votos || 3;              // quantos modelos votam no consenso
    this.ferramentasLigadas = opcoes.ferramentas !== false;
    this.metricas = { perguntas: 0, tentativas: 0, sucessos: 0, falhas: 0, cacheAcertos: 0, ferramenta: 0, consenso: 0, consensoDivergente: 0, porRota: {} };
    var self = this;
    this.catalogo.forEach(function (r) {
      self.saude[r.id] = { ok: 0, falhas: 0, cooldownAte: 0, latMedia: 3000, ultimoErro: null, morta: false };
      self.metricas.porRota[r.id] = { ok: 0, falhas: 0 };
    });
  }

  /* intervalo mínimo entre chamadas da mesma rota: rajada é o que queima a cota gratuita */
  Roteador.prototype._esperarVez = async function (rota) {
    var s = this.saude[rota.id];
    var intervalo = (rota.peso || 0) >= 70 ? 1200 : 300;
    var falta = (s.ultimaChamada || 0) + intervalo - agora();
    if (falta > 0) await new Promise(function (r) { setTimeout(r, falta); });
    s.ultimaChamada = agora();
  };

  Roteador.prototype.disponivel = function (id) {
    var s = this.saude[id];
    if (!s || s.morta) return false;
    return agora() >= s.cooldownAte;
  };

  /* ============ CONSULTAS EXATAS (R$ 0, sem LLM) ============ */

  // A Wikimedia exige User-Agent identificável. No navegador o header é proibido,
  // mas o próprio navegador manda um UA real; no Node precisamos declarar.
  function cabecalhosConsulta() {
    var h = { 'Accept': 'application/json' };
    if (typeof window === 'undefined') h['User-Agent'] = UA;
    return h;
  }

  Roteador.prototype._buscarJSON = async function (url, ms) {
    for (var tentativa = 0; tentativa < 3; tentativa++) {
      try {
        var c = new AbortController();
        var t = setTimeout(function () { c.abort(); }, ms || 9000);
        var r = await fetch(url, { signal: c.signal, headers: cabecalhosConsulta() });
        clearTimeout(t);
        if (r.status === 429 || r.status >= 500) { await new Promise(function (x) { setTimeout(x, 900 * Math.pow(2, tentativa)); }); continue; }
        if (!r.ok) return null;
        return await r.json();
      } catch (e) {
        await new Promise(function (x) { setTimeout(x, 250 * (tentativa + 1)); });
      }
    }
    return null;
  };

  /* Aritmética não pode depender de serviço externo. Medido hoje: api.mathjs.org fora do ar
     (timeout de 8 s) e "16×12" foi parar no modelo, que devolveu "× 12" — erro de conteúdo no item
     28 da régua de 200. Avaliador abaixo é local, sem rede: precedência normal, parênteses, ^. */
  function calcular(expr) {
    var s = String(expr).replace(/,/g, '.').replace(/[×xX]/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/\s+/g, '');
    if (!/^[0-9+\-*/^().]+$/.test(s)) return null;
    var pos = 0;
    function num() {
      var m = /^\d+(?:\.\d+)?/.exec(s.slice(pos));
      if (!m) throw new Error('num');
      pos += m[0].length; return parseFloat(m[0]);
    }
    function atomo() {
      if (s[pos] === '(') { pos++; var v = soma(); if (s[pos] !== ')') throw new Error('paren'); pos++; return v; }
      if (s[pos] === '-') { pos++; return -atomo(); }
      return num();
    }
    function pot() { var b = atomo(); if (s[pos] === '^') { pos++; return Math.pow(b, pot()); } return b; }
    function prod() {
      var v = pot();
      while (s[pos] === '*' || s[pos] === '/') { var op = s[pos++]; var r = pot(); v = op === '*' ? v * r : v / r; }
      return v;
    }
    function soma() {
      var v = prod();
      while (s[pos] === '+' || s[pos] === '-') { var op = s[pos++]; var r = prod(); v = op === '+' ? v + r : v - r; }
      return v;
    }
    try {
      var r = soma();
      if (pos !== s.length || !isFinite(r)) return null;
      return Math.round(r * 1e6) / 1e6;
    } catch (e) { return null; }
  }

  /* ============ VISÃO ============
     Sondado em 28/10/2026, com um PNG de teste e content-array OpenAI:
       Kilo  → 404 "No endpoints found that support image input"
       g4f   → 502 "multimodal processing is not enabled"
       Pollinations → 400 "does not support image input"
       OVH Qwen3.5-397B → 200, leu "7", "Q" e "esquerda" corretamente
     Ou seja: existe visão gratuita — uma única rota, com vazão apertada (~1 chamada a cada 4 s).
     A rota é medida por `bench/medir-visao.js`, não por promessa. */
  var ROTAS_VISAO = [
    { id: 'ovhvl', nome: 'Qwen3.5-397B (visão, OVH)', modelo: 'Qwen3.5-397B-A17B',
      base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1', intervalo: 6000 }
  ];

  Roteador.prototype._chamarVisao = async function (rota, imagem, pergunta, opcoes) {
    var opc = opcoes || {};
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, opc.timeout || 45000);
    var t0 = agora();
    try {
      var r = await fetch(rota.base.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', signal: c.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: rota.modelo, temperature: 0, max_tokens: opc.maxTokens || 400,
          messages: [{ role: 'user', content: [
            { type: 'text', text: pergunta },
            { type: 'image_url', image_url: { url: imagem } }
          ] }]
        })
      });
      clearTimeout(t);
      if (r.status === 429) {
        var ra = parseInt(r.headers.get('retry-after') || '0', 10);
        return { erro: 'rate', espera: ra > 0 ? ra : null, ms: agora() - t0 };
      }
      if (!r.ok) return { erro: 'servidor', ms: agora() - t0 };
      var d = await r.json().catch(function () { return null; });
      var msg = d && d.choices && d.choices[0] && d.choices[0].message;
      if (!msg) return { erro: 'servidor', ms: agora() - t0 };
      // modelo de raciocínio: a resposta costuma vir no campo reasoning
      var bruto = String(msg.content || '').trim();
      var txt = sanear(bruto) || sanear(extrairConclusao(String(msg.reasoning || '')));
      if (!txt) return { erro: 'degenerada', ms: agora() - t0 };
      return { texto: txt, ms: agora() - t0, bruto: d.choices[0].finish_reason || null };
    } catch (e) {
      clearTimeout(t);
      return { erro: e && e.name === 'AbortError' ? 'timeout' : 'rede', ms: agora() - t0 };
    }
  };

  Roteador.prototype._visao = async function (imagem, pergunta) {
    if (this.visaoLigada === false) return null;
    var self = this;
    this.saudeVisao = this.saudeVisao || {};
    for (var i = 0; i < ROTAS_VISAO.length; i++) {
      var rota = ROTAS_VISAO[i];
      var sv = this.saudeVisao[rota.id] || (this.saudeVisao[rota.id] = { ultima: 0 });
      // a cota de visão é a mais apertada do conjunto: 5 tentativas, respeitando Retry-After
      for (var t = 0; t < 5; t++) {
        var falta = sv.ultima + (rota.intervalo || 6000) - agora();
        if (falta > 0) await new Promise(function (res) { setTimeout(res, falta); });
        sv.ultima = agora();
        var r = await this._chamarVisao(rota, imagem, pergunta);
        if (r.texto) return { texto: r.texto, rota: rota.id, rotaNome: rota.nome, classe: 'visao',
          confianca: 'alta', tentativas: t + 1, ms: r.ms };
        if (r.erro === 'rate') {
          var espera = r.espera ? r.espera * 1000 : (6000 * (t + 1) + Math.random() * 2000);
          await new Promise(function (res) { setTimeout(res, Math.min(espera, 25000)); });
          continue;
        }
        break;
      }
    }
    return null;
  };

  Roteador.prototype._mathjs = async function (expr) {
    try {
      var url = 'https://api.mathjs.org/v4/?expr=' + encodeURIComponent(expr);
      var c = new AbortController(); var t = setTimeout(function () { c.abort(); }, 8000);
      var r = await fetch(url, { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      var txt = (await r.text()).trim();
      return /^-?[\d.]+$/.test(txt) ? txt : null;
    } catch (e) { return null; }
  };

  // Wikidata: procura a entidade e devolve um valor de propriedade (ex.: P36 capital, P246 símbolo químico)
  Roteador.prototype._qid = async function (termo) {
    if (!this._cacheQid) this._cacheQid = new Map();
    var chave = normal(termo);
    if (this._cacheQid.has(chave)) return this._cacheQid.get(chave);
    var busca = await this._buscarJSON('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +
      encodeURIComponent(termo) + '&language=pt&uselang=pt&format=json&limit=1&origin=*');
    var qid = (busca && busca.search && busca.search[0] && busca.search[0].id) || null;
    if (qid) this._cacheQid.set(chave, qid);
    return qid;
  };

  Roteador.prototype._rotulo = async function (qid) {
    if (!this._cacheRotulo) this._cacheRotulo = new Map();
    if (this._cacheRotulo.has(qid)) return this._cacheRotulo.get(qid);
    var alvo = await this._buscarJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid +
      '&props=labels&languages=pt|en&format=json&origin=*');
    var labels = alvo && alvo.entities && alvo.entities[qid] && alvo.entities[qid].labels;
    var nome = (labels && ((labels.pt && labels.pt.value) || (labels.en && labels.en.value))) || null;
    if (nome) this._cacheRotulo.set(qid, nome);
    return nome;
  };

  Roteador.prototype._wikidata = async function (termo, propriedade, rotulo) {
    var qid = await this._qid(termo);
    if (!qid) return null;
    if (!this._cacheClaims) this._cacheClaims = new Map();
    var chavec = qid + ':' + propriedade;
    if (this._cacheClaims.has(chavec)) return this._cacheClaims.get(chavec);
    var ent = await this._buscarJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid +
      '&props=claims&format=json&origin=*');
    var claims = ent && ent.entities && ent.entities[qid] && ent.entities[qid].claims;
    // Defeito real encontrado em 2026-10-27: pegar claims[0] cru devolvia "Shigaraki Palace" como
    // capital do Japão. Agora: posto 'preferred' primeiro, descarta afirmação com data de fim (P582)
    // e prefere a de início (P580) mais recente.
    var lista = (claims && claims[propriedade]) || [];
    function posto(c) { return c.rank === 'preferred' ? 0 : (c.rank === 'deprecated' ? 2 : 1); }
    function ano(c) {
      var q = (c.qualifiers && c.qualifiers.P580 && c.qualifiers.P580[0] && c.qualifiers.P580[0].datavalue && c.qualifiers.P580[0].datavalue.value && c.qualifiers.P580[0].datavalue.value.time) || '';
      var m = /([+-]?\d{4,})/.exec(q);
      return m ? parseInt(m[1], 10) : -9999;
    }
    function terminou(c) { return !!(c.qualifiers && c.qualifiers.P582); }
    lista = lista.filter(function (c) { return !terminou(c) && c.mainsnak && c.mainsnak.datavalue; });
    lista.sort(function (x, y) { return (posto(x) - posto(y)) || (ano(y) - ano(x)); });
    var snak = lista[0] && lista[0].mainsnak;
    var valor = snak && snak.datavalue && snak.datavalue.value;
    if (!valor) return null;
    var saida = null;
    if (typeof valor === 'string') saida = { valor: valor, fonte: 'wikidata ' + propriedade + '/' + qid };
    else if (valor.id) {
      var nome = await this._rotulo(valor.id);
      if (nome) saida = { valor: nome, fonte: 'wikidata ' + propriedade + '/' + valor.id };
    }
    if (saida) this._cacheClaims.set(chavec, saida);
    return saida;
  };

  var ARTIGOS = /^(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|the|of|to|in|on|at|a|an)\s+/i;

  Roteador.prototype._traduzir = async function (texto, de, para) {
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(texto) + '&langpair=' + de + '|' + para;
    var d = await this._buscarJSON(url, 10000);
    var out = d && d.responseData && d.responseData.translatedText;
    if (!out) return null;
    out = String(out).trim().replace(/[.\u3002]+$/, '');
    if (normal(out) === normal(texto)) return null;          // tradução idêntica = falhou
    // Memória de tradução devolve frase inteira com artigo ("da janela" para "window").
    // Quando a origem é UMA palavra, exigimos no máximo duas palavras e sem artigo/preposição
    // na frente; caso contrário a consulta é descartada e o consenso dos modelos decide.
    var palavrasOrigem = String(texto).trim().split(/\s+/).length;
    var palavrasSaida = out.split(/\s+/).filter(Boolean).length;
    if (palavrasOrigem === 1 && (palavrasSaida > 2 || ARTIGOS.test(out))) return null;
    return { valor: out, fonte: 'mymemory ' + de + '>' + para };
  };

  var MESES_DIAS = { janeiro: 31, fevereiro: 28, 'março': 31, marco: 31, abril: 30, maio: 31, junho: 30,
    julho: 31, agosto: 31, setembro: 30, outubro: 31, novembro: 30, dezembro: 31 };
  var DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function bissexto(a) { return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0; }

  /* calendário é aritmética exata: não vale gastar modelo (e errar) nisso */
  function calendarioLocal(q) {
    var m, ano;
    if ((m = q.match(/quantos\s+dias\s+(?:tem|h[áa])\s+(?:o\s+)?(?:m[êe]s\s+de\s+)?(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de|\s+do\s+ano\s+de)?\s*(\d{4})?/i))) {
      var mes = m[1].toLowerCase().replace('marco', 'março');
      ano = m[2] ? parseInt(m[2], 10) : null;
      var d = MESES_DIAS[mes];
      if (mes === 'fevereiro' && ano) d = bissexto(ano) ? 29 : 28;
      return { texto: String(d), ferramenta: 'calendario', fonte: 'calendário local' };
    }
    if ((m = q.match(/(?:o\s+ano\s+(?:de\s+)?)?(\d{4})\s+(?:é|e)\s+(?:um\s+ano\s+)?bissexto/i))) {
      ano = parseInt(m[1], 10);
      return { texto: bissexto(ano) ? 'Sim' : 'Não', ferramenta: 'calendario', fonte: 'calendário local' };
    }
    if ((m = q.match(/quantos\s+dias\s+(?:tem|h[áa])\s+(?:o\s+)?ano(?:\s+de|\s+de)?\s*(\d{4})/i))) {
      ano = parseInt(m[1], 10);
      return { texto: bissexto(ano) ? '366' : '365', ferramenta: 'calendario', fonte: 'calendário local' };
    }
    // "se hoje é terça-feira, que dia da semana será daqui a N dias?" — conta modular, sem modelo
    if ((m = q.match(/hoje\s+[ée]\s+(domingo|segunda-feira|segunda|ter[çc]a-feira|ter[çc]a|quarta-feira|quarta|quinta-feira|quinta|sexta-feira|sexta|s[áa]bado)[^\d]{0,40}?(\d{1,3})\s+dia/i))) {
      var base = m[1].toLowerCase().replace('-feira', '');
      var nomes = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      var i0 = nomes.indexOf(base.replace('terca', 'terça').replace('sabado', 'sábado'));
      if (i0 >= 0) {
        var i1 = (i0 + parseInt(m[2], 10)) % 7;
        return { texto: DIAS_SEMANA[i1], ferramenta: 'calendario', fonte: 'calendário local' };
      }
    }
    return null;
  }

  Roteador.prototype._ferramenta = async function (pergunta) {
    if (!this.ferramentasLigadas) return null;
    var m, p;
    var q = String(pergunta || '').trim();
    var cal = calendarioLocal(q);
    if (cal) return cal;

    /* --- vários saltos PRIMEIRO: "dobro de 15 menos metade de 8" não pode cair em "metade de 8" --- */
    var multi = this._encadeado(q);
    if (multi) return multi;

    /* --- aritmética e porcentagem --- */
    if ((m = q.match(/quanto\s+(?:é|e|vale|d[áa])\s*([0-9.,\s+\-*/^×÷()%²³xX]+)\??$/i))) {
      var expr = m[1].replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.')
        .replace(/²/g, '^2').replace(/³/g, '^3');
      var local = calcular(expr);
      if (local !== null) return { texto: String(local).replace('.', ','), ferramenta: 'calculo', fonte: 'aritmética local' };
      if (/^[\d\s+\-*/^().]+$/.test(expr) && /\d/.test(expr)) {
        var v = await this._mathjs(expr);
        if (v !== null) return { texto: v, ferramenta: 'mathjs', fonte: 'mathjs ' + expr };
      }
    }
    if ((m = q.match(/quanto\s+é\s+(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)/i))) {
      p = parseFloat(m[1].replace(',', '.')); var n = parseFloat(m[2].replace(',', '.'));
      return { texto: String(Math.round(p * n) / 100), ferramenta: 'porcentagem', fonte: 'calculo local' };
    }
    if ((m = q.match(/raiz\s+quadrada\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(Math.sqrt(parseFloat(m[1].replace(',', '.')))), ferramenta: 'raiz', fonte: 'calculo local' };
    }
    if ((m = q.match(/metade\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(parseFloat(m[1].replace(',', '.')) / 2).replace('.', ','), ferramenta: 'metade', fonte: 'calculo local' };
    }
    if ((m = q.match(/dobro\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(parseFloat(m[1].replace(',', '.')) * 2), ferramenta: 'dobro', fonte: 'calculo local' };
    }

    /* --- proporção: "Se N custam V, quanto custam M?" --- */
    if ((m = q.match(/se\s+(\d+(?:[.,]\d+)?)\b[^,]*custam\s*r?\$?\s*(\d+(?:[.,]\d+)?)[^?]*?quant[oa]s?\s+custam\s+(\d+(?:[.,]\d+)?)/i))) {
      var qtd1 = parseFloat(m[1].replace(',', '.')), total = parseFloat(m[2].replace(',', '.')), qtd2 = parseFloat(m[3].replace(',', '.'));
      if (qtd1 > 0) {
        var res = Math.round((total / qtd1) * qtd2 * 1e6) / 1e6;
        return { texto: String(res).replace('.', ','), ferramenta: 'proporcao', fonte: 'regra aritmética local' };
      }
    }

    /* --- sequência aritmética/geométrica --- */
    if ((m = q.match(/pr[óo]ximo:\s*([\d,.\s]+),\s*\?/i))) {
      var nums = m[1].split(',').map(Number).filter(function (x) { return !isNaN(x); });
      if (nums.length >= 3) {
        var d1 = nums[1] - nums[0], igual = true, k;
        for (k = 2; k < nums.length; k++) if (Math.abs((nums[k] - nums[k - 1]) - d1) > 1e-9) igual = false;
        if (igual) return { texto: String(nums[nums.length - 1] + d1), ferramenta: 'sequencia', fonte: 'calculo local' };
        var r1 = nums[1] / nums[0], geo = nums[0] !== 0;
        for (k = 2; k < nums.length; k++) if (Math.abs(nums[k] / nums[k - 1] - r1) > 1e-9) geo = false;
        if (geo && r1 !== 0) return { texto: String(nums[nums.length - 1] * r1), ferramenta: 'sequencia-geo', fonte: 'calculo local' };
        // razão constante com arredondamento (97,48,24 → 12): tolerância e a última razão, para não acumular erro
        var ultima = nums[nums.length - 1], anterior = nums[nums.length - 2];
        var rq = ultima / anterior, geoAprox = anterior !== 0;
        for (k = 1; k < nums.length - 1; k++) {
          if (Math.abs(nums[k] / nums[k - 1] - rq) > 0.02) geoAprox = false;
        }
        if (geoAprox && rq > 0 && rq < 1) return { texto: String(Math.round(ultima * rq)), ferramenta: 'sequencia-geo', fonte: 'calculo local' };
      }
    }

    /* --- tradução (en→pt e pt→en) --- */
    if ((m = q.match(/translate\s+to\s+portuguese:\s*['"“]?(.+?)['"”]?\s*$/i))) {
      var t1 = await this._traduzir(m[1].trim(), 'en', 'pt');
      if (t1) return { texto: t1.valor, ferramenta: 'traducao', fonte: t1.fonte };
    }
    if ((m = q.match(/translate\s+to\s+english:\s*['"“]?(.+?)['"”]?\s*$/i))) {
      var t2 = await this._traduzir(m[1].trim(), 'pt', 'en');
      if (t2) return { texto: t2.valor, ferramenta: 'traducao', fonte: t2.fonte };
    }

    /* --- inglês irregular (tabela local) --- */
    if ((m = q.match(/(?:past\s+(?:tense|simple)|simple past)\s+of\s+['"“‘]?([a-z]+)['"”’]?/i))) {
      var iv = ING_VERBO[m[1].toLowerCase()];
      if (iv) return { texto: iv[0], ferramenta: 'ingles-irregular', fonte: 'tabela local de inglês' };
      if (/[^aeiou]y$/.test(m[1].toLowerCase())) return { texto: m[1].toLowerCase().slice(0, -1) + 'ied', ferramenta: 'ingles-irregular', fonte: 'regra de formação' };
      if (/e$/.test(m[1].toLowerCase())) return { texto: m[1].toLowerCase() + 'd', ferramenta: 'ingles-irregular', fonte: 'regra de formação' };
      return { texto: m[1].toLowerCase() + 'ed', ferramenta: 'ingles-irregular', fonte: 'regra de formação' };
    }
    if ((m = q.match(/plural\s+of\s+['"“‘]?([a-z]+)['"”’]?/i))) {
      var ip = ING_PLURAL[m[1].toLowerCase()];
      if (ip) return { texto: ip, ferramenta: 'ingles-plural', fonte: 'tabela local de inglês' };
      var w = m[1].toLowerCase();
      if (/(s|x|z|ch|sh)$/.test(w)) return { texto: w + 'es', ferramenta: 'ingles-plural', fonte: 'regra de formação' };
      if (/[^aeiou]y$/.test(w)) return { texto: w.slice(0, -1) + 'ies', ferramenta: 'ingles-plural', fonte: 'regra de formação' };
      return { texto: w + 's', ferramenta: 'ingles-plural', fonte: 'regra de formação' };
    }
    if ((m = q.match(/(comparative|superlative)\s+of\s+['"“‘]?([a-z]+)['"”’]?/i))) {
      var tipoG = /comparative/i.test(m[1]) ? 'comp' : 'sup';
      var g = ING_GRAU[m[2].toLowerCase()];
      if (g) return { texto: g[tipoG], ferramenta: 'ingles-grau', fonte: 'tabela local de inglês' };
      var reg = grauRegular(m[2], tipoG);
      if (reg) return { texto: reg, ferramenta: 'ingles-grau', fonte: 'regra de formação' };
      return null;
    }

    /* --- tempo fracionário: "N e meia" (1 hora e meia = 90 minutos) --- */
    var convertido = {
      minutos: { minuto: 1, hora: 60, dia: 1440, semana: 10080 },
      horas: { hora: 1, dia: 24, semana: 168 },
      dias: { dia: 1, semana: 7, mes: 30, mês: 30 },
      segundos: { segundo: 1, minuto: 60, hora: 3600 }
    };
    if ((m = q.match(/quant[oa]s?\s+(minutos?|horas?|dias?|segundos?)\s+(?:tem|h[áa])\s+(?:(\d+|uma?|dois|duas|tr[eê]s)\s+)?(minutos?|horas?|dias?|segundos?|semanas?|m[eê]s|meses)\s+e\s+mei[ao]/i))) {
      var alvoU = m[1].toLowerCase().replace(/s$/, '') + 's';
      var qtd = m[2] ? (/^\d+$/.test(m[2]) ? parseInt(m[2], 10) : { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, 'três': 3 }[semAcento(m[2])] || 1) : 1;
      var fonteU = semAcento(m[3].toLowerCase()).replace(/s$/, '');
      var tab = convertido[alvoU];
      if (tab && tab[fonteU] != null) {
        var total = qtd * tab[fonteU] * 1.5;
        return { texto: String(Math.round(total * 100) / 100).replace('.', ','), ferramenta: 'tempo-fracionario', fonte: 'regra aritmética local' };
      }
    }

    /* --- problema de taxa: X por minuto/hora/dia durante N --- */
    if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*(\w+)?\s*por\s+(segundo|minuto|hora|dia).*?(\d+(?:[.,]\d+)?)\s*(segundos?|minutos?|horas?|dias?)/i))) {
      var unidade1 = { segundo: 'segundos', minuto: 'minutos', hora: 'horas', dia: 'dias' }[m[3].toLowerCase()];
      var unidade2 = m[5].toLowerCase().replace(/s$/, '') + 's';
      if (unidade1 === unidade2) {
        var a = parseFloat(m[1].replace(',', '.')), b = parseFloat(m[4].replace(',', '.'));
        var prod = Math.round(a * b * 1e6) / 1e6;
        return { texto: String(prod).replace('.', ','), ferramenta: 'regra-de-taxa', fonte: 'regra aritmética local' };
      }
    }

    /* --- capital (Wikidata P36) --- */
    if ((m = q.match(/qual\s+(?:é\s+)?a\s+capital\s+d(?:a|o|e|os|as)?\s+(.+?)\?*$/i))) {
      var alvoCap = m[1].trim();
      var local = CAPITAIS_SEM_ACENTO[semAcento(alvoCap)] || CAPITAIS[semAcento(alvoCap)];
      if (local) return { texto: local, ferramenta: 'capital', fonte: 'tabela local de capitais' };
      var cap = await this._wikidata(alvoCap, 'P36', 'capital');
      if (cap) return { texto: cap.valor, ferramenta: 'capital', fonte: cap.fonte };
    }
    /* --- símbolo químico (Wikidata P246) --- */
    if ((m = q.match(/s[ií]mbolo\s+qu[ií]mico\s+d[eo]\s+(.+?)\?*$/i))) {
      var sim = await this._wikidata(m[1].trim(), 'P246', 'símbolo');
      if (sim) return { texto: sim.valor, ferramenta: 'simbolo-quimico', fonte: sim.fonte };
    }
    /* --- língua portuguesa: tabela e regra (fato de língua, não opinião) --- */
    var lp = this._lingua(q);
    if (lp) return lp;

    /* --- sigla de estado --- */
    var mSigla = q.match(/sigla\s+d[aeo]s?\s+(.+?)\?*$/i);
    if (mSigla) {
      var chaveUf = semAcento(mSigla[1].trim().toLowerCase());
      var uf = SIGLAS_SEM_ACENTO[chaveUf] || SIGLAS_UF[chaveUf];
      if (uf) return { texto: uf, ferramenta: 'sigla-uf', fonte: 'tabela local de unidades federativas' };
    }

    /* --- regras determinísticas de lógica/aritmética de posição --- */
    var pos;
    if ((pos = q.match(/ultrapass\w*\s+(?:o|a)\s+(\d+)\s*[ºo°]?\s*(?:colocad|posi[cç][aã]o)/i))) {
      return { texto: pos[1] + 'º lugar', ferramenta: 'regra-de-posicao', fonte: 'regra lógica local' };
    }
    // fila: "Rita é a 8ª. Quantas pessoas à frente dela?" → 7 (regra determinística, sem modelo)
    if (/fila|posi[cç][aã]o|colocad/i.test(q)) {
      var mPos = /(?:[ée]\s+[oa]|sou\s+[oa]|est[áa]\s+n[ao])\s+(\d+)/i.exec(q) || /(\d+)\s*[ºª°]/.exec(q);
      var alvoFila = /(frente|atr[áa]s|depois|antes)/i.exec(q);
      if (mPos && alvoFila) {
        var n = parseInt(mPos[1], 10);
        var totalFila = /(\d+)\s*pessoas/i.exec(q);
        if (/frente|antes/i.test(alvoFila[1])) return { texto: String(n - 1), ferramenta: 'regra-de-fila', fonte: 'regra lógica local' };
        if (totalFila && parseInt(totalFila[1], 10) > n) return { texto: String(parseInt(totalFila[1], 10) - n), ferramenta: 'regra-de-fila', fonte: 'regra lógica local' };
      }
    }
    if ((pos = q.match(/ultrapass\w*\s+(?:o|a)\s+(último|primeiro|[uú]ltim[oa]|primeir[oa])/i))) {
      return { texto: 'penúltimo lugar', ferramenta: 'regra-de-posicao', fonte: 'regra lógica local' };
    }

    /* --- fatos estáveis e símbolos de elemento (base local curada) --- */
    var fato = this._fatos(q);
    if (fato) return fato;

    /* --- unidade no SI (Wikidata P5061) --- */
    if ((m = q.match(/(?:unidade|medida)\s+(?:de|da|do)\s+(.+?)\s+no\s+si\?*$/i))) {
      var uni = await this._wikidata(m[1].trim(), 'P5061', 'unidade');
      if (uni) return { texto: uni.valor, ferramenta: 'unidade-si', fonte: uni.fonte };
    }
    return null;
  };

  /* ---------- pedido longo: código e texto ---------- */
  var SYS_CODIGO = 'Responda apenas com o código completo em um bloco de código, sem explicação antes nem depois. '
    + 'O código precisa ser autossuficiente: sem biblioteca externa, sem leitura de arquivo, sem variável indefinida. '
    + 'Se pedirem função, exporte com module.exports.';
  var SYS_ABERTO = 'Responda em português do Brasil, no formato pedido, apenas com o texto final. '
    + 'Sem preâmbulo ("claro", "com certeza"), sem comentar o pedido, sem escrever raciocínio. '
    + 'Termine todas as frases; não deixe texto pela metade.';

  var NUMERAIS = { um: 1, uma: 1, dois: 2, duas: 2, três: 3, 'três': 3, tres: 3, quatro: 4, cinco: 5,
                  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

  /* o que o pedido exige, em números: parágrafos, itens da lista e mínimo de palavras */
  function exigenciaDoPedido(q) {
    var t = String(q || ''), ex = { paragrafos: 0, itens: 0, minPalavras: 0 };
    var m = /(\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s+par[áa]grafos?/i.exec(t);
    if (m) ex.paragrafos = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : (NUMERAIS[m[1].toLowerCase()] || 0);
    else if (/em\s+(apenas\s+)?um\s+par[áa]grafo|um \u00fanico par[áa]grafo/i.test(t)) ex.paragrafos = 1;
    var mi = /lista\s+(?:com|de)\s+(\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)/i.exec(t)
      || /(\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s+(?:dicas|argumentos|itens|passos|exemplos)/i.exec(t);
    if (mi) ex.itens = /^\d+$/.test(mi[1]) ? parseInt(mi[1], 10) : (NUMERAIS[mi[1].toLowerCase()] || 0);
    if (/em\s+tr[eê]s\s+passos|ponto a ponto/i.test(t) && !ex.itens) ex.itens = 3;
    ex.minPalavras = ex.paragrafos ? 45 * ex.paragrafos : (ex.itens ? 12 * ex.itens : 60);
    return ex;
  }

  function classificarPedido(q) {
    var t = String(q || '');
    if (/```|\bem (javascript|python|typescript|node)\b|(escreva|implemente|crie|faça)\b[^?]{0,60}\b(função|programa|classe|código|script|algoritmo|endpoint)\b/i.test(t)) return 'codigo';
    if (/(escreva|redija|explique|resuma|descreva|compare|argumente|conte uma história|faça um[ao]?\s+(texto|roteiro|artigo|poema|e-mail|resumo|plano|lista)|lista de \d+|passo a passo)/i.test(t)) return 'aberto';
    return 'curto';
  }

  /* tira o código do bloco; devolve '' quando não há código reconhecível */
  function extrairCodigo(texto) {
    var t = String(texto || '');
    var m = /```(?:javascript|js|jsx|ts|typescript|python|py)?\s*\n([\s\S]*?)```/i.exec(t);
    var corpo = m ? m[1] : t;
    corpo = corpo.replace(/^\s*(aqui est[áa]|segue|certo)[^\n]*\n/i, '').trim();
    if (!/function|=>|class |const |let |var |def |console\.log|module\.exports/.test(corpo)) return '';
    return corpo.trim();
  }

  /* código completo? (chaves/fechamento coerentes — não prova correção, só prova que não cortou) */
  function codigoInteiro(codigo) {
    if (!codigo || codigo.length < 40) return false;
    var abre = (codigo.match(/[{([]/g) || []).length, fecha = (codigo.match(/[})\]]/g) || []).length;
    if (abre !== fecha) return false;
    return /}\s*;?\s*$/.test(codigo.trim()) || /return\b/.test(codigo);
  }

  /* estrutura é formatação: se o pedido quer N parágrafos e veio um bloco só,
     quebra nas fronteiras de frase. Não inventa conteúdo — só reorganiza o que veio. */
  function ajustarParagrafos(t, n) {
    var texto = String(t || '').trim();
    if (!n || n < 2 || !texto) return texto;
    var blocos = texto.split(/\n+/).filter(function (x) { return x.trim().length > 0; });
    if (blocos.length >= n) return texto;
    var frases = texto.split(/(?<=[.!?…])\s+/).map(function (f) { return f.trim(); }).filter(Boolean);
    if (frases.length < n * 2) return texto;   // sem frases suficientes, dividir seria inventar
    var porBloco = Math.ceil(frases.length / n), saida = [];
    for (var i = 0; i < n; i++) {
      var bloco = frases.slice(i * porBloco, (i + 1) * porBloco).join(' ');
      if (bloco) saida.push(bloco);
    }
    return saida.join('\n\n');
  }

  /* Provedor grátis trunca no meio da frase. Em vez de entregar "…e a água passa" cortado,
     fecha no último ponto final já escrito. Não inventa nada: só descarta a sobra. */
  function fecharTexto(t) {
    var s2 = String(t || '').trim();
    if (!s2) return s2;
    if (/[.!?…]["”)]?$/.test(s2)) return s2;
    var m = /^[\s\S]*[.!?…]["”)]?/.exec(s2);
    if (!m) return s2;
    var corte = m[0].trim();
    return corte.length >= 40 ? corte : s2;
  }

  /* nota de um texto longo: tamanho, fechamento, formato pedido e ausência de robô-speak */
  function notaTexto(t, ex) {
    var s2 = String(t || '').trim();
    if (!s2) return 0;
    var palavras = s2.split(/\s+/).filter(Boolean).length;
    var paragrafos = s2.split(/\n+/).filter(function (p) { return p.trim().length > 0; }).length;
    var itens = (s2.match(/^\s*(?:[-*•]|\d+[.)])\s+\S/gm) || []).length;
    var p = 0;
    if (palavras >= (ex.minPalavras || 60)) p += 3; else if (palavras >= (ex.minPalavras || 60) * 0.6) p += 1;
    if (/[.!?…"”)]\s*$/.test(s2)) p += 3;                       // fechou o texto
    if (ex.paragrafos && paragrafos >= ex.paragrafos) p += 3;
    if (ex.paragrafos && paragrafos === 1 && ex.paragrafos > 1) p -= 1;
    if (ex.itens && itens >= ex.itens) p += 3;
    if (/\b(como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar)/i.test(s2)) p -= 4;
    if (/^\s*(claro|certamente|com certeza|aqui est[áa]|segue)/i.test(s2)) p -= 1;
    return p;
  }

  /* texto completo? termina em pontuação, tem parágrafo e não é preâmbulo de raciocínio */
  function textoCompleto(t, minPalavras) {
    var s2 = String(t || '').trim();
    if (!s2) return 0;
    var palavras = s2.split(/\s+/).length;
    var p = 0;
    if (palavras >= (minPalavras || 40)) p += 2;
    if (/[.!?…"”)]\s*$/.test(s2)) p += 2;
    if (!/\b(claro|certamente|com certeza|aqui est[áa]|segue (o|a))\b\s*[!.,:]/i.test(s2.slice(0, 60))) p += 1;
    if (/\n\s*\n/.test(s2)) p += 1;
    if (/\b(como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar|desculpe)/i.test(s2)) p -= 3;
    return p;
  }

  /* ---------- vários saltos ---------- */
  var EXTENSO = { dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

  /* "Quatro canetas", "Três horas" → dígitos: os padrões do compositor trabalham com número */
  function comDigitos(t) {
    return String(t).replace(/\b(dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\b/gi, function (w) {
      var v = EXTENSO[semAcento(w.toLowerCase())];
      return v ? String(v) : w;
    });
  }

  Roteador.prototype._encadeado = function (q) {
    var m, num = function (t) { return parseFloat(String(t).replace(',', '.')); };
    q = comDigitos(q);
    var fmt = function (v) { return String(Math.round(v * 1e6) / 1e6).replace('.', ','); };

    // troco: cada X custa R$Y, compra Z, paga com R$W
    if ((m = q.match(/(?:cada|o)\s+\w+\s+custa\s*r?\$?\s*(\d+(?:[.,]\d+)?).*?(?:compra|compro|leva|levou)\s+(\d+).*?paga\s+com\s+r?\$?\s*(\d+(?:[.,]\d+)?)/i))) {
      var preco = num(m[1]), qtd = num(m[2]), pago = num(m[3]);
      if (preco * qtd <= pago) return { texto: fmt(pago - preco * qtd), ferramenta: 'encadeado-troco', fonte: 'regra aritmética local (2 passos)' };
    }
    // consumo: faz K km por litro, tanque L litros → km
    if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*km\s*(?:por|com um litro|\/)\s*litros?.*?(\d+(?:[.,]\d+)?)\s*litros?/i))
      || (m = q.match(/faz\s+(\d+(?:[.,]\d+)?)\s*km\s+por\s+litro[^?]*?(\d+(?:[.,]\d+)?)\s*litros/i))) {
      return { texto: fmt(num(m[1]) * num(m[2])), ferramenta: 'encadeado-consumo', fonte: 'regra aritmética local (2 passos)' };
    }
    // dois trechos: X km/h por N horas e depois mais M horas
    if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*km\s*(?:por|\/)\s*hora.*?(\d+(?:[.,]\d+)?)\s*horas?.*?(?:mais|depois|e ainda)\s*(\d+(?:[.,]\d+)?)\s*horas?/i))) {
      return { texto: fmt(num(m[1]) * (num(m[2]) + num(m[3]))), ferramenta: 'encadeado-distancia', fonte: 'regra aritmética local (2 passos)' };
    }
    // saldo: tinha A, ganhou B, gastou C
    if ((m = q.match(/tinha\s+(\d+).*?(?:ganhou|recebeu)\s+(\d+).*?(?:gastou|perdeu)\s+(\d+)/i))) {
      return { texto: fmt(num(m[1]) + num(m[2]) - num(m[3])), ferramenta: 'encadeado-saldo', fonte: 'regra aritmética local (3 passos)' };
    }
    // caixas: N caixas com M unidades cada, K estragam
    if ((m = q.match(/(\d+)\s*caixas?\s+com\s+(\d+)[^?]*?cada[^?]*?(\d+)\s*\w*\s*(?:estrag|quebr|amass|danific|fora|perdid)/i))) {
      return { texto: fmt(num(m[1]) * num(m[2]) - num(m[3])), ferramenta: 'encadeado-caixas', fonte: 'regra aritmética local (2 passos)' };
    }
    // proporção + desconto: N custam V, quer M com desconto de P%
    if ((m = q.match(/(\d+)\s*\w+\s+custam\s*r?\$?\s*(\d+(?:[.,]\d+)?).*?quant[oa]s?\s+custam\s+(\d+).*?desconto\s+de\s+(\d+(?:[.,]\d+)?)\s*%/i))) {
      var unit = num(m[2]) / num(m[1]), bruto = unit * num(m[3]);
      return { texto: fmt(bruto * (1 - num(m[4]) / 100)), ferramenta: 'encadeado-desconto', fonte: 'regra aritmética local (2 passos)' };
    }
    // metade/dobro combinados: dobro de A menos metade de B
    if ((m = q.match(/(dobro|triplo|qu[áa]druplo|\d+\s*vezes)\s+de\s+(\d+(?:[.,]\d+)?).*?menos\s+a\s+metade\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      var vezes = { dobro: 2, triplo: 3, quadruplo: 4 }[semAcento(m[1].toLowerCase().replace(/\s+/g, ''))] || parseInt(m[1], 10) || 2;
      return { texto: fmt(vezes * num(m[2]) - num(m[3]) / 2), ferramenta: 'encadeado-multiplo-metade', fonte: 'regra aritmética local (2 passos)' };
    }
    // horas → minutos → segundos
    if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*horas?\s+e\s+(\d+)\s*minutos?.*?quant[oa]s?\s+segundos/i))) {
      return { texto: fmt(num(m[1]) * 3600 + num(m[2]) * 60), ferramenta: 'encadeado-tempo', fonte: 'regra aritmética local (2 passos)' };
    }
    return null;
  };

  /* ---------- português ---------- */
  Roteador.prototype._lingua = function (q) {
    var m, alvo, chave;
    var limpa = function (t) { return String(t || '').replace(/^['"“‘]|['"”’]$/g, '').replace(/\?$/, '').trim().toLowerCase(); };

    if ((m = q.match(/coletivo\s+de\s+(.+?)\??$/i))) {
      chave = limpa(m[1]);
      var col = COLETIVOS[chave] || COLETIVOS[chave.replace(/s$/, '')] || null;
      if (col) return { texto: col, ferramenta: 'coletivo', fonte: 'base local de português' };
      return null;
    }
    if ((m = q.match(/feminino\s+de\s+(.+?)\??$/i))) {
      chave = limpa(m[1]);
      var fem = IRREGULARES.feminino[chave];
      if (fem) return { texto: fem, ferramenta: 'feminino', fonte: 'base local de português' };
      if (/(or|ês|es|ão)$/.test(chave)) return { texto: chave.replace(/or$/, 'ora').replace(/ês$/, 'esa').replace(/ão$/, 'ona') + (/ora$/.test(chave.replace(/or$/, 'ora')) ? '' : ''), ferramenta: 'feminino', fonte: 'regra de formação' };
      if (/o$/.test(chave)) return { texto: chave.slice(0, -1) + 'a', ferramenta: 'feminino', fonte: 'regra de formação' };
      return null;
    }
    if ((m = q.match(/masculino\s+de\s+(.+?)\??$/i))) {
      chave = limpa(m[1]);
      var masc = IRREGULARES.masculino[chave];
      if (masc) return { texto: masc, ferramenta: 'masculino', fonte: 'base local de português' };
      if (/a$/.test(chave)) return { texto: chave.slice(0, -1) + 'o', ferramenta: 'masculino', fonte: 'regra de formação' };
      return null;
    }
    if ((m = q.match(/plural\s+de\s+(.+?)\??$/i))) {
      chave = limpa(m[1]);
      var pl = IRREGULARES.plural[chave] || IRREGULARES.plural[semAcento(chave)];
      if (pl) return { texto: pl, ferramenta: 'plural', fonte: 'base local de português' };
      if (/^[a-zà-ÿ\-]+$/.test(chave)) return { texto: pluralRegular(chave), ferramenta: 'plural', fonte: 'regra de formação' };
      return null;
    }
    if ((m = q.match(/superlativo(?:\s+absoluto)?(?:\s+sint[ée]tico)?\s+de\s+(.+?)\??$/i))) {
      chave = limpa(m[1]);
      var sup = IRREGULARES.superlativo[chave];
      if (sup) return { texto: sup, ferramenta: 'superlativo', fonte: 'base local de português' };
      if (/vel$/.test(chave)) return { texto: chave.replace(/vel$/, 'velíssimo'), ferramenta: 'superlativo', fonte: 'regra de formação' };
      if (/z$/.test(chave)) return { texto: chave.slice(0, -1) + 'císsimo', ferramenta: 'superlativo', fonte: 'regra de formação' };
      if (/il$/.test(chave)) return { texto: semAcento(chave).slice(0, -2) + 'ílimo', ferramenta: 'superlativo', fonte: 'regra de formação' };  // difícil→dificílimo, fácil→facílimo
      if (/[aeiou]$/.test(chave)) return { texto: chave.slice(0, -1) + 'íssimo', ferramenta: 'superlativo', fonte: 'regra de formação' };
      return null;
    }
    if ((m = q.match(/(aumentativo|diminutivo)\s+de\s+(.+?)\??$/i))) {
      var tipo = m[1].toLowerCase(); chave = limpa(m[2]);
      var tab = tipo === 'aumentativo' ? IRREGULARES.aumentativo : IRREGULARES.diminutivo;
      var val = tab[chave];
      if (val) return { texto: val, ferramenta: tipo, fonte: 'base local de português' };
      if (tipo === 'aumentativo') {
        if (/[aeiou]$/.test(chave)) return { texto: chave.slice(0, -1) + 'ão', ferramenta: tipo, fonte: 'regra de formação' };
        return { texto: chave + 'zão', ferramenta: tipo, fonte: 'regra de formação' };
      }
      if (/[aeiou]$/.test(chave)) return { texto: chave.slice(0, -1) + 'inho', ferramenta: tipo, fonte: 'regra de formação' };
      return { texto: chave + 'zinho', ferramenta: tipo, fonte: 'regra de formação' };
    }
    if ((m = q.match(/(ant[oô]nimo|sin[oô]nimo)\s+de\s+(.+?)\??$/i))) {
      var qual = /ant/i.test(m[1]) ? ANTONIMOS : SINONIMOS;
      chave = limpa(m[2]);
      var par = qual[chave];
      if (par) return { texto: par, ferramenta: /ant/i.test(m[1]) ? 'antonimo' : 'sinonimo', fonte: 'base local de português' };
      return null;
    }
    if (/figura de (linguagem|pensamento|palavras|sintaxe)/i.test(q)) {
      for (var fi = 0; fi < FIGURAS_FRASE.length; fi++) {
        if (FIGURAS_FRASE[fi].q.test(q)) return { texto: FIGURAS_FRASE[fi].r, ferramenta: 'figura-de-linguagem', fonte: 'tabela local de figuras' };
      }
      return null;
    }
    if ((m = q.match(/classe\s+(?:gramatical\s+)?d[aoe]\s+(?:palavra\s+)?(.+?)\??$/i))) {
      chave = limpa(m[1]);
      var fixa = CLASSE_FIXA[chave];
      if (fixa) return { texto: fixa, ferramenta: 'classe', fonte: 'base local de português' };
      if (/mente$/.test(chave)) return { texto: 'advérbio', ferramenta: 'classe', fonte: 'sufixo -mente' };
      if (/(oso|osa|ivo|iva|ável|ível|ico|ica|ado|ada|ido|ida|ento|enta|oso)$/.test(chave)) return { texto: 'adjetivo', ferramenta: 'classe', fonte: 'sufixo de adjetivo' };
      if (/(ar|er|ir)$/.test(chave)) return { texto: 'verbo', ferramenta: 'classe', fonte: 'terminação verbal' };
      if (/(ção|são|dade|mento|ismo|agem|ura|eza)$/.test(chave)) return { texto: 'substantivo', ferramenta: 'classe', fonte: 'sufixo de substantivo' };
      return null;
    }
    if ((m = q.match(/quantas?\s+letras\s+tem\s+(?:a\s+palavra\s+)?(.+?)\??$/i))) {
      var p = limpa(m[1]).replace(/[^a-zà-ÿ]/g, '');
      if (p) return { texto: String(p.length), ferramenta: 'letras', fonte: 'contagem local' };
      return null;
    }
    if ((m = q.match(/quantas?\s+s[ií]labas\s+tem\s+(?:a\s+palavra\s+)?(.+?)\??$/i))) {
      var w = limpa(m[1]).replace(/[^a-zà-ÿ]/g, '');
      if (w) return { texto: String(contarSilabas(w)), ferramenta: 'silabas', fonte: 'contagem local' };
      return null;
    }
    return null;
  };

  /* ---------- fatos estáveis ---------- */
  Roteador.prototype._fatos = function (q) {
    var m;
    for (var i = 0; i < FATOS.length; i++) {
      if (FATOS[i].q.test(q)) return { texto: FATOS[i].r, ferramenta: 'fato-estavel', fonte: 'base local de fatos estáveis' };
    }
    if ((m = q.match(/s[ií]mbolo(?:\s+qu[ií]mico)?\s+d(?:a|o|e|os|as)\s+(?:elemento\s+)?(.+?)\??$/i))) {
      var nome = semAcento(m[1].trim().toLowerCase());
      var sim = SIMBOLO_DE[nome];
      if (sim) return { texto: sim, ferramenta: 'simbolo-quimico', fonte: 'tabela periódica local' };
      var el = ELEMENTO_DE[nome];
      if (el) return { texto: el, ferramenta: 'elemento', fonte: 'tabela periódica local' };
      return null;
    }
    if ((m = q.match(/elemento(?:\s+qu[ií]mico)?\s+(?:de\s+)?s[ií]mbolo\s+([a-z]{1,3})\b/i))) {
      var e2 = ELEMENTO_DE[m[1].toLowerCase()];
      if (e2) return { texto: e2, ferramenta: 'elemento', fonte: 'tabela periódica local' };
      return null;
    }
    if ((m = q.match(/(?:metal|elemento)\s+d[oe]\s+s[ií]mbolo\s+['"]?([a-z]{1,3})['"]?\??$/i))) {
      var e3 = ELEMENTO_DE[m[1].toLowerCase()];
      if (e3) return { texto: e3, ferramenta: 'elemento', fonte: 'tabela periódica local' };
      return null;
    }
    return null;
  };

  /* ============ CACHE ============ */
  var CHAVE_DISCO = 'roteador-cache-v1';

  Roteador.prototype._lerDisco = function () {
    if (typeof localStorage === 'undefined') return;
    try {
      var bruto = localStorage.getItem(CHAVE_DISCO);
      if (!bruto) return;
      var obj = JSON.parse(bruto) || {};
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (agora() - obj[k].t > this.cacheTtl) continue;
        this.cache.set(k, obj[k]);
      }
    } catch (e) { /* cache em disco é otimização, nunca requisito */ }
  };
  Roteador.prototype._gravarDisco = function () {
    if (typeof localStorage === 'undefined') return;
    try {
      var obj = {};
      this.cache.forEach(function (v, k) { obj[k] = v; });
      localStorage.setItem(CHAVE_DISCO, JSON.stringify(obj));
    } catch (e) { /* cota do navegador cheia: segue sem persistir */ }
  };

  Roteador.prototype._cacheGet = function (chave) {
    var e = this.cache.get(chave);
    if (!e) return null;
    if (agora() - e.t > this.cacheTtl) { this.cache.delete(chave); return null; }
    return e.v;
  };
  Roteador.prototype._cacheSet = function (chave, valor) {
    if (this.cache.size >= this.cacheMax) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(chave, { v: valor, t: agora() });
    this._gravarDisco();
  };

  /* ============ ROTAS ============ */
  Roteador.prototype._candidatos = function (dificuldade) {
    var self = this;
    var ordem = dificuldade === 'leve' ? ['media', 'leve', 'forte'] : ['forte', 'media', 'leve'];
    var lista = [];
    ordem.forEach(function (classe) {
      var grupo = self.catalogo.filter(function (r) { return r.classe === classe; });
      grupo.sort(function (a, b) {
        // peso = acerto medido no banco difícil (bench/medir-rotas.js). Força real antes de velocidade.
        var dp = (b.peso || 0) - (a.peso || 0);
        if (dp !== 0) return dp;
        return self.saude[a.id].latMedia - self.saude[b.id].latMedia;
      });
      lista = lista.concat(grupo);
    });
    return lista;
  };

  Roteador.prototype._castigar = function (id, tipo, espera) {
    var s = this.saude[id];
    s.falhas++; s.ultimoErro = tipo;
    if (tipo === 'rate' && espera) { s.cooldownAte = agora() + Math.max(espera * 1000, 5000); return; }
    s.cooldownAte = agora() + (tipo === 'rate' ? 20000 + Math.random() * 15000
      : tipo === 'morto' ? 30 * 60 * 1000
      : tipo === 'timeout' ? 12000 : 8000);
    if (tipo === 'morto') s.morta = true;
    this.metricas.porRota[id].falhas++;
  };

  Roteador.prototype._premiar = function (id, ms) {
    var s = this.saude[id];
    s.ok++; s.cooldownAte = 0;
    s.latMedia = s.latMedia * 0.7 + ms * 0.3;
    this.metricas.porRota[id].ok++;
  };

  /* resposta com conteúdo real: pelo menos um caractere alfanumérico depois de tirar marcação */
  function util(t) {
    var x = String(t || '').replace(/[*_`#>~\-\s]/g, '');
    return x.length > 0 && /[0-9a-zà-ÿ]/i.test(x);
  }

  Roteador.prototype._chamar = async function (rota, pergunta, timeoutMs, opcoes) {
    var opc = opcoes || {};
    var url = rota.base.replace(/\/$/, '') + '/chat/completions';
    var c = new AbortController();
    var limite = timeoutMs || (opc.longo ? 45000 : this.timeoutRota);
    var t = setTimeout(function () { c.abort(); }, limite);
    var t0 = agora();
    try {
      var r = await fetch(url, {
        method: 'POST', signal: c.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: rota.modelo,
          temperature: opc.temperatura == null ? 0 : opc.temperatura,
          max_tokens: opc.maxTokens || 400,
          messages: [{ role: 'system', content: opc.sistema || SYS }, { role: 'user', content: pergunta }]
        })
      });
      clearTimeout(t);
      var bruto = await r.text();
      if (r.status === 429) {
        var ra = parseInt(r.headers.get('retry-after') || '0', 10);
        return { erro: 'rate', espera: ra > 0 ? ra : null, ms: agora() - t0 };
      }
      if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 400) return { erro: 'morto', ms: agora() - t0 };
      if (!r.ok) return { erro: 'servidor', ms: agora() - t0 };
      var d;
      try { d = JSON.parse(bruto); } catch (e) { return { erro: 'servidor', ms: agora() - t0 }; }
      var msg = d.choices && d.choices[0] && d.choices[0].message;
      if (!msg) return { erro: 'servidor', ms: agora() - t0 };
      var texto = (msg.content || '').trim();
      if (opc.longo) {
        if (!util(texto)) return { erro: 'degenerada', ms: agora() - t0 };
        return { texto: texto, ms: agora() - t0, bruto: d.choices[0].finish_reason || null };
      }
      if (!texto && msg.reasoning) texto = sanear(extrairConclusao(String(msg.reasoning)));
      texto = sanear(texto);
      if (!texto) return { erro: 'degenerada', ms: agora() - t0 };
      return { texto: texto, ms: agora() - t0, bruto: d.choices[0].finish_reason || null };
    } catch (e) {
      clearTimeout(t);
      return { erro: e && e.name === 'AbortError' ? 'timeout' : 'rede', ms: agora() - t0 };
    }
  };

  /* ============ CONSENSO (3 votos) ============ */
  Roteador.prototype._consenso = async function (pergunta, dificuldade, opcoes) {
    var opc = opcoes || {};
    var self = this;
    var candidatos = this._candidatos(dificuldade).filter(function (r) { return self.disponivel(r.id); });
    // um por base, para não votar três vezes no mesmo provedor
    // top-N por peso medido; diversidade de host é desejável, mas nunca à custa de trocar um
    // modelo de 100% por um de 7% só porque o host é outro
    var escolhidos = [], bases = {};
    for (var i = 0; i < candidatos.length && escolhidos.length < this.votos; i++) {
      var b = candidatos[i].base;
      if (bases[b] && (candidatos[i].peso || 0) < 50) continue;
      bases[b] = true; escolhidos.push(candidatos[i]);
    }
    if (!escolhidos.length) return null;

    var respostas = await Promise.all(escolhidos.map(function (rota) {
      return self._chamar(rota, pergunta, opc.longo ? 45000 : 22000, opc.chamar).then(function (r) {
        if (r.texto) self._premiar(rota.id, r.ms); else self._castigar(rota.id, r.erro);
        return { rota: rota, texto: r.texto || null, erro: r.erro || null, ms: r.ms };
      });
    }));
    var validas = respostas.filter(function (x) { return !!sanear(x.texto); });
    if (!validas.length) return null;

    // agrupa por resposta normalizada
    var grupos = {};
    validas.forEach(function (x) {
      var k = normal(x.texto).replace(/[.,;:]/g, '');
      if (k.length > 60) k = k.slice(0, 60);
      (grupos[k] = grupos[k] || []).push(x);
    });
    var chaves = Object.keys(grupos).sort(function (a, b) { return grupos[b].length - grupos[a].length; });
    var vencedor = grupos[chaves[0]];
    var empate = chaves.length > 1 && grupos[chaves[1]].length === vencedor.length;
    var melhor = vencedor.slice().sort(function (a, b) {
      var ordem = { forte: 0, media: 1, leve: 2 };
      return ordem[a.rota.classe] - ordem[b.rota.classe];
    })[0];
    this.metricas.consenso++;
    if (chaves.length > 1) this.metricas.consensoDivergente++;
    return {
      texto: melhor.texto,
      rota: melhor.rota.id,
      rotaNome: melhor.rota.nome,
      classe: melhor.rota.classe,
      consenso: vencedor.length + '/' + validas.length,
      confianca: vencedor.length >= 2 && !empate ? 'alta' : (melhor.rota.classe === 'forte' ? 'media' : 'baixa'),
      tentativas: respostas.length,
      ms: Math.max.apply(null, validas.map(function (x) { return x.ms || 0; })),
      votos: validas.map(function (x) { return (x.rota.id + ': ' + String(x.texto).slice(0, 40)); })
    };
  };

  /* ============ GERAÇÃO LONGA (código e texto) ============ */
  /* Sem consenso: votação de maioria não faz sentido para texto longo nem para código.
     Em vez disso, dois provedores no máximo, e a escolha é por critério objetivo declarado. */
  /* ============ TEXTO LONGO PARÁGRAFO A PARÁGRAFO ============
     Medido na régua aberta: pedir "dois parágrafos, 70 palavras" numa chamada só devolvia um bloco
     de 30 palavras cortado — o provedor grátis trunca antes de chegar ao fim. Pedindo UM parágrafo
     por chamada, cada resposta cabe folgado no teto, o número de parágrafos é exato por construção
     e o parágrafo que sai curto é refeito sozinho (não se joga fora o texto inteiro). */
  /* Lista com N itens: um item por chamada. Pedir "5 itens" numa chamada só devolvia 1
     (medido: régua aberta #10, 56 palavras, 1 item de 5). */
  Roteador.prototype._listaLonga = async function (pergunta, ex) {
    var self = this;
    var n = Math.max(2, ex.itens || 1);
    var minTotal = ex.minPalavras || 60;
    // "três passos, mínimo 60 palavras" = 20 por item. Pedir 12–30 fixos entregava 57 no total.
    var minPorItem = Math.max(12, Math.ceil((minTotal / n) * 1.15));   // 15% de folga: modelo entrega menos
    var inicio = agora();
    var vistas = {}, rotas = [];
    ['forte', 'media', 'leve'].forEach(function (cl) {
      self._candidatos(cl).forEach(function (r) {
        if (vistas[r.id] || !self.disponivel(r.id)) return;
        vistas[r.id] = 1; rotas.push(r);
      });
    });
    if (!rotas.length) return null;
    var idx = 0, linhas = [], tentativas = 0;
    for (var i = 0; i < n; i++) {
      var feito = null;
      for (var t = 0; t < 4 && !feito; t++) {
        if (agora() - inicio > 110000) break;
        var rota = rotas[idx++ % rotas.length];
        var ped = 'Tema: ' + pergunta + '\n\nEscreva SOMENTE o item ' + (i + 1) + ' de ' + n +
          ', em português do Brasil, em uma única linha, com ' + (minPorItem + 5) + ' a ' + (minPorItem + 25) +
          ' palavras, começando por "' + (i + 1) + '. ".' +
          ' Não repita os itens anteriores, não escreva título nem introdução, e termine a frase.';
        await this._esperarVez(rota);
        var r = await this._chamar(rota, ped, 25000, { maxTokens: 300, longo: true, sistema: SYS_ABERTO });
        tentativas++;
        if (r.texto) this._premiar(rota.id, r.ms); else this._castigar(rota.id, r.erro, r.espera);
        if (r.erro === 'rate') await new Promise(function (res) { setTimeout(res, 3000 + Math.random() * 3000); });
        var txt = sanear(String(r.texto || '').trim()).replace(/\s*\n+\s*/g, ' ');
        var palavras = txt.split(/\s+/).filter(Boolean).length;
        if (txt && palavras >= Math.max(10, minPorItem) && /[.!?…]["”)]?$/.test(txt)) feito = String(i + 1) + '. ' + txt.replace(/^\d+[.)]\s*/, '');
      }
      if (!feito) return null;
      linhas.push(feito);
    }
    var texto = linhas.join('\n');
    if (!textoCompleto(texto, ex.minPalavras || 60)) return null;
    return {
      texto: texto, rota: 'lista-longa', rotaNome: 'geração item a item',
      classe: 'forte', confianca: 'alta', tentativas: tentativas, ms: agora() - inicio,
      candidatos: linhas.map(function (l) { return { palavras: l.split(/\s+/).filter(Boolean).length }; })
    };
  };

  /* termos concretos do pedido: o pedido costuma nomear o que quer ver ("torneira", "ambiental",
     "painel"). Repetir esses termos na instrução é o que faz o texto cobrir o que foi perguntado —
     medido: parágrafo bem formado que esquecia "torneira" contava como falta de fato. */
  var VAZIAS = { para: 1, como: 1, sobre: 1, entre: 1, quando: 1, porque: 1, isso: 1, esse: 1, essa: 1,
    este: 1, esta: 1, aquele: 1, aquela: 1, 'não': 1, mais: 1, menos: 1, muito: 1, pouco: 1, todos: 1,
    todas: 1, cada: 1, pelo: 1, pela: 1, seus: 1, suas: 1, nosso: 1, nossa: 1, pode: 1, fazer: 1,
    escreva: 1, explique: 1, descreva: 1, argumente: 1, favor: 1, contra: 1, dicas: 1,
    'parágrafo': 1, 'parágrafos': 1, paragrafos: 1, 'casa': 1 };

  function termosDoPedido(q) {
    var bruto = String(q || '');
    var t = bruto.toLowerCase().replace(/[^\wà-ÿ\s]/g, ' ');
    var vistos = {}, saida = [];
    // sigla em caixa alta é termo do pedido mesmo sendo curta (LGPD, IPTU, SUS)
    (bruto.match(/\b[A-ZÀ-Ý]{3,6}\b/g) || []).forEach(function (a) {
      if (vistos[a]) return; vistos[a] = 1; saida.push(a);
    });
    t.split(/\s+/).forEach(function (w) {
      if (w.length < 5 || VAZIAS[w] || vistos[w]) return;
      vistos[w] = 1; saida.push(w);
    });
    return saida.slice(0, 4);
  }

  /* Convenções de gênero textual que a rubrica cobra e o modelo esquece.
     Medido: e-mail formal sem "Atenciosamente" (id 4) e parágrafo a favor da reciclagem sem a
     consequência ambiental (id 6). Instrução de formato não inventa conteúdo — só pede a forma. */
  function instrucaoFormato(q) {
    var t = String(q || '').toLowerCase();
    var extra = '';
    if (/e-?mail|carta|of[íi]cio|requerimento|or[çc]amento|mensagem formal/.test(t)) {
      extra += ' Como o pedido é e-mail/carta, termine com despedida formal ("Atenciosamente,") e uma assinatura genérica.';
    }
    if (/argumente|argumento|a favor|contra|defenda|justifique|opini[ãa]o/.test(t)) {
      extra += ' Inclua ao menos uma consequência concreta (ambiental, econômica ou social) com dado, número ou exemplo específico.';
    }
    return extra;
  }

  /* E-mail e carta têm fechamento por convenção. Instruir o modelo não bastou (medido: 2 rodadas
     seguidas sem "Atenciosamente"), então o fechamento é aplicado aqui — é formato, não conteúdo. */
  function ajustarFechamento(texto, pergunta) {
    var t = String(texto || '').trim();
    if (!t) return t;
    var q = String(pergunta || '').toLowerCase();
    if (!/e-?mail|carta|of[íi]cio|requerimento|or[çc]amento|mensagem|cobran[çc]a/.test(q)) return t;
    // "ficamos à disposição" é frase de corpo, não despedida — já causou falso positivo uma vez
    if (/atenciosamente|cordialmente|respeitosamente|abra[çc]os|sinceramente/i.test(t)) return t;
    // ponto final, não vírgula: a verificação de "texto fechado" exige pontuação terminal
    return t + '\n\nAtenciosamente.';
  }

  /* Numera as linhas de uma lista solta ("- X", "* X") para o formato que o pedido exigiu. */
  function numerarLista(t, n) {
    var linhas = String(t || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var itens = linhas.filter(function (l) { return /^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l); });
    if (!itens.length) return String(t || '').trim();
    var saida = [], k = 0;
    linhas.forEach(function (l) {
      if (/^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l)) {
        k++;
        if (k <= (n || 99)) saida.push(k + '. ' + l.replace(/^([-*•]|\d+[.)])\s+/, ''));
      } else if (k === 0) {
        saida.push(l);   // linha de abertura, se houver
      }
    });
    return saida.join('\n');
  }

  function instrucaoParagrafo(pergunta, i, n, minPor, foco) {
    var termos = termosDoPedido(pergunta);
    var exige = termos.length
      ? ' Ao longo do parágrafo, use literalmente estes termos do pedido, quando fizer sentido: ' +
        termos.join(', ') + '.'
      : '';
    // cobertura: texto bem formado que não cita nada concreto falhava na régua por "falta de fato".
    // Pedir um dado verificável em TODO parágrafo é instrução genérica, não adaptação ao gabarito.
    exige += ' Inclua obrigatoriamente pelo menos um dado verificável: um nome próprio, uma data, ' +
      'um número ou um termo técnico específico da área.';
    // TENTATIVA DESCARTADA (medida em 28/10): pedir "cubra definição, funcionamento, exemplo e
    // consequências" alongou o texto e PIOROU a cobertura — o item da fotossíntese passou a não citar
    // oxigênio e levou 102 s. Instrução de cobertura ampla faz o modelo divagar em vez de cobrir.
    return 'Tema do texto: ' + pergunta + '\n\n' +
      'Escreva SOMENTE o parágrafo ' + (i + 1) + ' de ' + n + ', em português do Brasil, com ' +
      (minPor + 15) + ' a ' + (minPor + 55) + ' palavras, em 3 a 5 frases completas. ' + (foco || '') + exige +
      ' Não use listas, títulos, negrito nem prefácio do tipo "claro" ou "aqui está".\n' +
      'Comece direto no conteúdo.';
  }

  /* Um parágrafo por CHAMADA já resolveu o formato; em SÉRIE custava 84 s de mediana.
     Agora os parágrafos vão em paralelo, um worker por provedor (nunca duas chamadas no mesmo
     host, que é o que estoura a cota gratuita). O parágrafo que falhar é refeito numa segunda
     passada em série — a mesma rede de segurança de antes. */
  /* Parágrafos: um por chamada (formato exato por construção). A ordem dos hosts é por LATÊNCIA
     MEDIDA (tools/sonda-latencia-paragrafo.js) e a geração é em SÉRIE no host mais rápido — medido:
     laguna escreve um parágrafo em 5–9 s e cumpre o tamanho; g4f/pollinations levam 20–25 s e
     falham com frequência. Esperar o host ruim "em paralelo" custava mais que esperar o bom em
     série. Paralelo só entra quando o host principal começa a falhar (aí dois workers, em bases
     diferentes, para não estourar a cota de nenhuma). */
  /* Texto longo = um parágrafo por CHAMADA (formato exato por construção) e os parágrafos em
     PARALELO, um worker por provedor — nunca dois no mesmo host, que é o que estoura a cota.
     A ordem dos hosts é por LATÊNCIA MEDIDA para escrever parágrafo (tools/sonda-latencia-paragrafo.js)
     e cada worker aprende dentro da execução: quem entrega parágrafo sobe, quem devolve raciocínio,
     texto curto ou 429 desce. Parágrafo que falha é refeito numa segunda passada, em série. */
  Roteador.prototype._textoLongo = async function (pergunta, ex) {
    var self = this;
    var n = Math.max(2, ex.paragrafos || 1);
    var minTotal = ex.minPalavras || 70;
    var minPor = Math.max(26, Math.ceil(minTotal / n) + 12);
    var inicio = agora();
    // um host por BASE (provedor), e o representante da base é o MAIS RÁPIDO para escrever
    // parágrafo. Antes o dedupe pegava o primeiro da lista (peso 100 = gigante2, 35 s de timeout)
    // e descartava o laguna, que é da mesma base e entrega em 4–9 s — foi o que fez item custar 200 s.
    var porBase = {}, hosts = [], tentativas = 0;
    ['forte', 'media', 'leve'].forEach(function (cl) {
      self._candidatos(cl).forEach(function (r) {
        if (!self.disponivel(r.id)) return;
        var atual = porBase[r.base];
        if (!atual || (r.latPar || 30000) < (atual.latPar || 30000)) porBase[r.base] = r;
      });
    });
    Object.keys(porBase).forEach(function (b) { hosts.push(porBase[b]); });
    if (!hosts.length) return null;
    // latPar alto = medido como NÃO entregador de parágrafo (qwen-397 devolve raciocínio sem conclusão)
    hosts.sort(function (a, b) { return (a.latPar || 30000) - (b.latPar || 30000); });

    var notaPar = {}, cursor = 0;
    hosts.forEach(function (h) { notaPar[h.id] = 0; });
    function proxima() { return hosts[cursor++ % hosts.length]; }
    function melhorLivre(usados) {
      var melhor = null;
      hosts.forEach(function (h) {
        if (usados[h.id]) return;
        if (!melhor || (notaPar[h.id] || 0) > (notaPar[melhor.id] || 0)) melhor = h;
      });
      return melhor || hosts[0];
    }

    async function paragrafo(i, usados) {
      var rota = melhorLivre(usados || {});
      for (var t = 0; t < 4; t++) {
        // 3+ parágrafos custam mais chamadas: prazo maior, senão cai no caminho de reserva
        if (agora() - inicio > (n >= 3 ? 115000 : 85000)) return null;
        var foco = i === 0
          ? 'Comece definindo o assunto com precisão e dê um exemplo concreto.'
          : 'Aprofunde um aspecto novo, sem repetir o que já foi dito, e cite um detalhe concreto (nome, número ou processo).';
        if (i === n - 1) foco += ' Feche com uma frase de conclusão completa.';
        var ped = instrucaoParagrafo(pergunta, i, n, minPor, foco) + instrucaoFormato(pergunta);
        // coesão: se o parágrafo anterior já existe, entra como contexto e proíbe repetição
        if (i > 0 && blocos[i - 1]) {
          ped += '\n\nO parágrafo anterior, já escrito, foi: "' + String(blocos[i - 1]).slice(0, 700) +
            '"\nNão repita esse conteúdo; acrescente informação nova.';
        }
        await self._esperarVez(rota);
        var r = await self._chamar(rota, ped, 35000, { maxTokens: 800, longo: true, sistema: SYS_ABERTO });
        tentativas++;
        if (r.texto) self._premiar(rota.id, r.ms); else self._castigar(rota.id, r.erro, r.espera);
        if (r.erro === 'rate') await new Promise(function (res) { setTimeout(res, 2500 + Math.random() * 2000); });
        // um parágrafo é UM bloco: se o modelo abriu linhas em branco, o texto saía com mais
        // parágrafos do que o pedido (medido: pedido de 2, entrega de 3)
        var txt = sanear(String(r.texto || '').trim()).replace(/\s*\n+\s*/g, ' ');
        var palavras = txt.split(/\s+/).filter(Boolean).length;
        var piso = t < 2 ? Math.floor(minPor * 0.8) : Math.floor(minPor * 0.55);
        if (txt && palavras >= piso && /[.!?…]["”)]?\s*$/.test(txt)) {
          notaPar[rota.id] = (notaPar[rota.id] || 0) + 1;
          return txt;
        }
        // lixo ou curto: este host desce na fila e o parágrafo vai para outro
        if (r.texto || r.erro) notaPar[rota.id] = (notaPar[rota.id] || 0) - 1;
        rota = proxima();
      }
      return null;
    }

    var blocos = new Array(n);
    // SÉRIE no host mais bem colocado, e não paralelo: medido em 28/10 que o laguna entrega 6
    // parágrafos seguidos em 3,8–9,6 s sem 429, enquanto abrir 2–3 workers em paralelo estoura a
    // cota dos provedores e faz o item custar 130–200 s. Paralelismo aqui troca qualidade e tempo
    // por disputa de cota — não compensa.
    for (var i = 0; i < n; i++) blocos[i] = await paragrafo(i, {});

    // Cota apertada não pode virar texto quebrado. Se faltou parágrafo, espera a rota mais próxima
    // de sair do cooldown e tenta de novo — em vez de cair no caminho de reserva, que devolve uma
    // chamada só e trunca (medido: itens de 2 parágrafos entregues com 41-44 palavras na régua).
    if (blocos.some(function (b) { return !b; })) {
      var t = agora();
      var proximos = this.catalogo
        .filter(function (r) { return !self.saude[r.id].morta && self.saude[r.id].cooldownAte > t; })
        .map(function (r) { return self.saude[r.id].cooldownAte; });
      var espera = proximos.length ? Math.min(Math.min.apply(null, proximos) - t + 500, 40000) : 5000;
      if (espera > 0) await new Promise(function (res) { setTimeout(res, espera); });
      for (var j = 0; j < n; j++) if (!blocos[j]) blocos[j] = await paragrafo(j, {});
    }
    if (blocos.some(function (b) { return !b; })) return null;
    var texto = blocos.join('\n\n');
    // 90% do mínimo: texto curto passa em textoCompleto (que só dá nota), mas não cumpre o pedido
    // (medido: item de 60 palavras entregue com 45 e aceito)
    var totalPalavras = texto.split(/\s+/).filter(Boolean).length;
    if (totalPalavras < Math.floor(minTotal * 0.9)) return null;
    if (!textoCompleto(texto, minTotal)) return null;
    return {
      texto: texto, rota: 'texto-longo', rotaNome: 'geração por parágrafo',
      classe: 'forte', confianca: 'alta', tentativas: tentativas, ms: agora() - inicio,
      candidatos: blocos.map(function (b) { return { palavras: b.split(/\s+/).filter(Boolean).length }; })
    };
  };

  Roteador.prototype._gerar = async function (pergunta, opcoes) {
    var self = this;
    var opc = opcoes || {};
    var tentativas = opc.tentativas || 2;
    var cands = this._candidatos(opc.dificuldade || 'media').filter(function (r) { return self.disponivel(r.id); });
    var escolhidos = [], bases = {};
    for (var i = 0; i < cands.length && escolhidos.length < tentativas; i++) {
      if (bases[cands[i].base]) continue;
      bases[cands[i].base] = true; escolhidos.push(cands[i]);
    }
    if (!escolhidos.length) return null;

    var pedido = Object.assign({ maxTokens: 1200, longo: true, segmento: 45000 }, opc.chamar || {});
    var respostas = [];
    var inicio = agora();
    for (var k = 0; k < escolhidos.length; k++) {
      var rotaK = escolhidos[k];
      if (k > 0 && agora() - inicio > (opc.orcamento || 90000)) break;
      await this._esperarVez(rotaK);
      var r = await this._chamar(rotaK, pergunta, pedido.segmento, pedido);
      // 429: espera curta e vai para a próxima, em vez de disparar tudo junto e perder a cota
      if (r.erro === 'rate') await new Promise(function (res) { setTimeout(res, 2500 + Math.random() * 2500); });
      if (r.texto) this._premiar(rotaK.id, r.ms); else this._castigar(rotaK.id, r.erro, r.espera);
      respostas.push({ rota: rotaK, texto: r.texto || null, erro: r.erro || null, ms: r.ms, bruto: r.bruto || null });
      if (r.texto && opc.nota && opc.nota(r.texto) >= 6) break;   // resposta boa: para de gastar cota
    }

    var validas = respostas.filter(function (x) { return x.texto; });
    if (!validas.length) return null;

    var nota = opc.nota || function (t) { return textoCompleto(t, opc.minPalavras); };
    var melhor = null;
    validas.forEach(function (x) {
      // cortado pelo teto do provedor é pior do que uma resposta mais curta e inteira
      var n = nota(x.texto) - (x.bruto === 'length' ? 4 : 0);
      if (!melhor || n > melhor.nota) melhor = { texto: x.texto, rota: x.rota, nota: n, ms: x.ms, bruto: x.bruto };
    });
    this.metricas.consenso++;
    return {
      texto: opc.transformar ? opc.transformar(melhor.texto) : fecharTexto(melhor.texto),
      rota: melhor.rota.id, rotaNome: melhor.rota.nome, classe: melhor.rota.classe,
      confianca: melhor.nota >= 5 ? 'alta' : (melhor.nota >= 3 ? 'media' : 'baixa'),
      nota: melhor.nota, tentativas: respostas.length, ms: melhor.ms,
      candidatos: validas.map(function (x) { return { rota: x.rota.id, nota: nota(x.texto), palavras: String(x.texto).split(/\s+/).length }; })
    };
  };

  /* ============ API PRINCIPAL ============ */
  Roteador.prototype.responder = async function (pedido) {
    var pergunta = typeof pedido === 'string' ? pedido : pedido.pergunta;
    var dificuldade = (typeof pedido === 'object' && pedido.dificuldade) || 'media';
    var usarFerramenta = !(typeof pedido === 'object' && pedido.semFerramenta);
    var usarConsenso = !(typeof pedido === 'object' && pedido.semConsenso) && dificuldade !== 'leve';
    var imagem = typeof pedido === 'object' ? pedido.imagem : null;
    if (imagem) {
      this.metricas.perguntas++;
      var v = await this._visao(imagem, pergunta);
      if (v) { this.metricas.sucessos++; return v; }
      return { texto: '', rota: null, rotaNome: 'sem rota de visão', classe: 'visao',
               confianca: 'baixa', tentativas: 3, erro: 'sem-resposta' };
    }
    var chave = 'q:' + normal(pergunta);
    this.metricas.perguntas++;

    var doCache = this._cacheGet(chave);
    if (doCache) { this.metricas.cacheAcertos++; return Object.assign({}, doCache, { cache: true }); }

    if (usarFerramenta) {
      var f = await this._ferramenta(pergunta);
      if (f) {
        var res = { texto: f.texto, rota: f.ferramenta, rotaNome: 'consulta exata · ' + f.ferramenta,
                    classe: 'ferramenta', confianca: 'alta', tentativas: 0, ferramenta: true, ms: 0, fonte: f.fonte };
        this.metricas.ferramenta++;
        this._cacheSet(chave, res);
        return res;
      }
    }

    /* pedido longo (texto/código) não passa por consenso nem por 400 tokens */
    var tipo = (typeof pedido === 'object' && pedido.tipo) || (usarFerramenta === false ? 'curto' : classificarPedido(pergunta));
    if (tipo === 'codigo') {
      var gc = await this._gerar(pergunta, {
        chamar: { maxTokens: 1600, sistema: SYS_CODIGO },
        minPalavras: 0,
        nota: function (t) { var cod = extrairCodigo(t); return codigoInteiro(cod) ? 5 : (cod ? 2 : 0); },
        transformar: function (t) { var cod = extrairCodigo(t); return cod ? '```\n' + cod + '\n```' : t; }
      });
      if (gc) { this._cacheSet(chave, gc); this.metricas.sucessos++; return gc; }
    }
    if (tipo === 'aberto') {
      var ex = exigenciaDoPedido(pergunta);
      var instrucao = SYS_ABERTO + instrucaoFormato(pergunta);
      if (ex.paragrafos) instrucao += ' O pedido exige ' + ex.paragrafos + ' parágrafo(s): entregue exatamente '
        + ex.paragrafos + ' bloco(s) separados por uma linha em branco, cada um com pelo menos 3 frases completas.';
      if (ex.itens) instrucao += ' O pedido exige uma lista com ' + ex.itens + ' itens numerados, um por linha.';
      var tetoPalavras = Math.max(200, Math.round(ex.minPalavras * 2.2));
      instrucao += ' Escreva entre ' + ex.minPalavras + ' e ' + tetoPalavras + ' palavras; termine o texto por completo.';
      if (ex.itens >= 2) {
        var lista = await this._listaLonga(pergunta, ex);
        if (lista) { this._cacheSet(chave, lista); this.metricas.sucessos++; return lista; }
      }
      if (ex.paragrafos >= 2) {
        var longo = await this._textoLongo(pergunta, ex);
        if (longo) { this._cacheSet(chave, longo); this.metricas.sucessos++; return longo; }
      }
      var ga = await this._gerar(pergunta, {
        tentativas: 3,
        chamar: { maxTokens: 1800, sistema: instrucao },
        minPalavras: ex.minPalavras,
        nota: function (t) { return notaTexto(ajustarParagrafos(t, ex.paragrafos), ex); },
        transformar: function (t) {
          if (ex.itens >= 2) {
            // lista vinda de uma chamada só costuma voltar com menos itens e menos palavras do que o
            // pedido: numera o que existe e, se faltar item, o texto é recusado (numeroLista abaixo)
            return ajustarFechamento(fecharTexto(numerarLista(t, ex.itens)), pergunta);
          }
          return ajustarFechamento(fecharTexto(ajustarParagrafos(t, ex.paragrafos)), pergunta);
        }
      });
      if (ga) { this._cacheSet(chave, ga); this.metricas.sucessos++; return ga; }
    }

    function acabamento(txt) {
      var ex2 = exigenciaDoPedido(pergunta);
      return ajustarFechamento(fecharTexto(ajustarParagrafos(txt, ex2.paragrafos)), pergunta);
    }

    if (usarConsenso) {
      var c = await this._consenso(pergunta, dificuldade,
        tipo === 'curto' ? null : { longo: true, chamar: { maxTokens: 1200 } });
      if (c) {
        if (tipo !== 'curto') c.texto = acabamento(c.texto);
        this._cacheSet(chave, c); this.metricas.sucessos++; return c;
      }
    }

    var inicio = agora();
    var tentativas = 0;
    var erroFinal = 'sem rota';
    // 3 rodadas era pouco: sob 429 a cota só volta depois de dezenas de segundos. A espera é
    // limitada pelo orçamento, então rodada extra custa latência, não qualidade.
    this.voltasMax = 4;
    for (var volta = 0; volta < this.voltasMax; volta++) {
      var eu = this;
      var cands = this._candidatos(dificuldade).filter(function (r) { return eu.disponivel(r.id); });
      if (!cands.length) {
        var t = agora();
        var futuros = this.catalogo.filter(function (r) { return !eu.saude[r.id].morta && eu.saude[r.id].cooldownAte > t; })
          .map(function (r) { return eu.saude[r.id].cooldownAte; });
        var espera = Math.max(400, Math.min((futuros.length ? Math.min.apply(null, futuros) : t) - t, 15000));
        if (agora() - inicio + espera > this.orcamento) break;
        await new Promise(function (r) { setTimeout(r, espera); });
        continue;
      }
      for (var i = 0; i < cands.length; i++) {
        if (agora() - inicio > this.orcamento) break;
        var rota = cands[i];
        tentativas++; this.metricas.tentativas++;
        var r = await this._chamar(rota, pergunta);
        if (r.texto) {
          this._premiar(rota.id, r.ms);
          this.metricas.sucessos++;
          var confianca = rota.classe === 'forte' ? 'alta' : (rota.classe === 'media' ? 'media' : 'baixa');
          var saida = { texto: r.texto, rota: rota.id, rotaNome: rota.nome, classe: rota.classe, confianca: confianca, tentativas: tentativas, ms: r.ms };
          if (tipo !== 'curto') saida.texto = acabamento(saida.texto);
          this._cacheSet(chave, saida);
          return saida;
        }
        this._castigar(rota.id, r.erro);
        erroFinal = r.erro;
      }
      var base = 400 * Math.pow(2, volta) + Math.random() * 400;
      if (agora() - inicio + base > this.orcamento) break;
      await new Promise(function (r) { setTimeout(r, base); });
    }
    this.metricas.falhas++;
    return { texto: null, erro: erroFinal, tentativas: tentativas, ms: agora() - inicio };
  };

  Roteador.prototype.estado = function () {
    return { metricas: this.metricas, saude: this.saude,
             catalogo: this.catalogo.map(function (r) { return { id: r.id, nome: r.nome, classe: r.classe }; }) };
  };

  var api = { Roteador: Roteador, CATALOGO: CATALOGO, normal: normal };
  api.internos = { sanear: sanear, util: util, extrairConclusao: extrairConclusao, calendarioLocal: calendarioLocal, fragmento: fragmento, instrucaoParagrafo: instrucaoParagrafo, fecharTexto: fecharTexto, termosDoPedido: termosDoPedido, calcular: calcular, instrucaoFormato: instrucaoFormato, ajustarFechamento: ajustarFechamento, numerarLista: numerarLista,
                   classificarPedido: classificarPedido, extrairCodigo: extrairCodigo,
                   codigoInteiro: codigoInteiro, textoCompleto: textoCompleto,
                   exigenciaDoPedido: exigenciaDoPedido, notaTexto: notaTexto, ajustarParagrafos: ajustarParagrafos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.RoteadorIA = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
