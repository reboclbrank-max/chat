/* ============ RACIOCÍNIO LOCAL (31/10/2026) ============
   Medido na bateria de QI da casa: várias classes de raciocínio erravam SEMPRE, não por falta de
   conhecimento, mas por serem contas e regras exatas que o modelo faz de cabeça e tropeça —
   probabilidade sem reposição (3/10 respondido 1/5), contagem com dígito (271 respondido 468) e
   transformação de matriz (quadrado branco respondido círculo preto).
   Aqui cada classe é resolvida por código, quando o pedido casa com uma forma reconhecível.
   Regra de segurança: se o pedido não casa EXATAMENTE com um padrão conhecido, devolve null e o
   modelo responde normalmente. Resposta exata errada seria pior que resposta de modelo. */

(function () {
  'use strict';

  function texto(s) { return String(s == null ? '' : s); }
  function norm(s) {
    return texto(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function num(s) { return parseFloat(texto(s).replace(/\./g, '').replace(',', '.')); }
  function mdc(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function fracao(a, b) {
    if (!b) return null;
    var sinal = (a < 0) !== (b < 0) ? '-' : '';
    a = Math.abs(a); b = Math.abs(b);
    var d = mdc(a, b);
    if (b / d === 1) return sinal + String(a / d);
    return sinal + (a / d) + '/' + (b / d);
  }
  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }
  function inteiro(x) { return Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : String(x).replace('.', ','); }
  function ordinal(t) {
    var mapa = { primeiro: 1, primeira: 1, segundo: 2, segunda: 2, terceiro: 3, terceira: 3,
      quarto: 4, quarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6, setimo: 7, setima: 7,
      oitavo: 8, oitava: 8, nono: 9, nona: 9, decimo: 10, decima: 10 };
    var n = parseInt(String(t).replace(/[º°oa]/g, ''), 10);
    if (!isNaN(n) && n > 0) return n;
    return mapa[String(t).toLowerCase()] || 0;
  }

  /* ---------------- 1. sequência numérica ---------------- */
  function sequencia(q) {
    var t = norm(q);
    if (!/sequencia|continua|proximo|proxima|complete|serie|regra muda/.test(t)) return null;
    var m = texto(q).match(/(-?\d+(?:[.,]\d+)?(?:\s*,\s*-?\d+(?:[.,]\d+)?){2,})\s*,?\s*\?/);
    if (!m) return null;
    var nums = m[1].split(',').map(num).filter(function (x) { return !isNaN(x); });
    if (nums.length < 3) return null;
    var i, n = nums.length, ult = nums[n - 1], cand = null;
    function igual(arr, v) { return arr.every(function (x) { return Math.abs(x - v) < 1e-9; }); }

    // (a) quadrados e oblongos: acham o n inicial e conferem em todos os termos
    for (var n0 = 0; n0 <= 60 && !cand; n0++) {
      var quad = true, oblong = true;
      for (i = 0; i < n; i++) {
        if (nums[i] !== Math.pow(n0 + i, 2)) quad = false;
        if (nums[i] !== (n0 + i) * (n0 + i + 1)) oblong = false;
      }
      if (quad) cand = { valor: Math.pow(n0 + n, 2), regra: 'quadrados' };
      else if (oblong) cand = { valor: (n0 + n) * (n0 + n + 1), regra: 'produto de consecutivos' };
    }
    // (b) dobre e some 1, depois 2, depois 3... (regra que muda a cada passo)
    if (!cand) {
      var dobro = true;
      for (i = 1; i < n; i++) if (Math.abs(nums[i] - (nums[i - 1] * 2 + i)) > 1e-9) dobro = false;
      if (dobro) cand = { valor: ult * 2 + n, regra: 'dobro mais passo' };
    }
    // (c) diferença constante; (d) segunda diferença constante
    if (!cand) {
      var d = [];
      for (i = 1; i < n; i++) d.push(nums[i] - nums[i - 1]);
      if (igual(d, d[0])) cand = { valor: ult + d[0], regra: 'soma constante' };
      else if (d.length >= 2) {
        var d2 = [], seg = true;
        for (i = 1; i < d.length; i++) { d2.push(d[i] - d[i - 1]); if (Math.abs(d2[0] - d2[i - 1]) > 1e-9) seg = false; }
        if (seg) cand = { valor: ult + d[d.length - 1] + d2[0], regra: 'segunda diferença constante' };
      }
    }
    // (e) progressão geométrica
    if (!cand && nums[0] !== 0) {
      var r = nums[1] / nums[0], geo = true;
      for (i = 2; i < n; i++) if (Math.abs(nums[i] / nums[i - 1] - r) > 1e-9) geo = false;
      if (geo) cand = { valor: ult * r, regra: 'razão constante' };
    }
    if (!cand) return null;
    return { texto: inteiro(cand.valor), ferramenta: 'sequencia', fonte: 'raciocínio local · ' + cand.regra };
  }

  /* ---------------- 2. contagem com dígito ---------------- */
  function contagemDigito(q) {
    var t = norm(q);
    var m = t.match(/quantos numeros (?:inteiros )?(?:de|entre) (\d+) (?:a|e|ate) (\d+)[\s\S]*?digito (\d)/);
    if (!m) return null;
    if (!/pelo menos um|algum|contem|tenham/.test(t)) return null;
    var a = parseInt(m[1], 10), b = parseInt(m[2], 10), dig = m[3];
    if (!(b >= a) || b - a > 5e6) return null;
    var total = 0;
    for (var i = a; i <= b; i++) if (String(i).indexOf(dig) !== -1) total++;
    return { texto: String(total), ferramenta: 'contagem', fonte: 'contagem exata (força bruta de ' + a + ' a ' + b + ')' };
  }

  /* ---------------- 3. torneiras / trabalho conjunto ---------------- */
  function trabalhoConjunto(q) {
    var t = norm(q);
    if (/esvazia|vaza|sai|dreno|ralo/.test(t)) return null;   // uma enche e outra esvazia: outra conta
    var m = t.match(/uma (torneira|\w+) enche[\s\S]*?em (\d+) horas?[\s\S]*?outr[ao] em (\d+) horas?/);
    if (!m) return null;
    var a = parseFloat(m[2]), b = parseFloat(m[3]);
    if (!(a > 0 && b > 0)) return null;
    var horas = (a * b) / (a + b);
    return { texto: inteiro(Math.round(horas * 1e6) / 1e6), ferramenta: 'trabalho', fonte: 'trabalho conjunto 1/(1/a+1/b)' };
  }

  /* ---------------- 4. problema de idade ---------------- */
  var RAZAO = { 'dobro': 2, 'triplo': 3, 'quadruplo': 4, 'metade': 0.5, 'terco': 1 / 3,
    'uma vez e meia': 1.5, 'duas vezes': 2, 'tres vezes': 3, 'igual': 1 };
  function razaoDe(s) {
    var t = norm(s);
    var m = t.match(/(\d+(?:[.,]\d+)?)\s*vezes?(?: e meia)?/);
    if (m) return parseFloat(m[1].replace(',', '.')) * (/e meia/.test(t) ? 1.5 : 1);
    for (var k in RAZAO) if (t.indexOf(k) !== -1) return RAZAO[k];
    return null;
  }
  function problemaIdade(q) {
    var t = norm(q);
    if (!/idade/.test(t) || !/anos/.test(t)) return null;
    var m = t.match(/([a-z]+) tem (?:o |a )?([a-z ]+?) (?:da |de )?idade de ([a-z]+)/);
    if (!m) return null;
    var r1 = razaoDe(m[2]);
    var m2 = t.match(/em (\d+) anos?,[\s\S]*?([a-z]+) tera (?:o |a )?([a-z ]+?) (?:da |de )?idade de/);
    if (m2 === null) return null;
    var anos = parseFloat(m2[1]), r2 = razaoDe(m2[3]);
    if (r1 == null || r2 == null || Math.abs(r1 - r2) < 1e-9) return null;
    // X = r1*Y hoje;  X + N = r2*(Y + N)  →  Y = N*(r2-1)/(r1-r2)
    var y = anos * (r2 - 1) / (r1 - r2);
    if (!(y > 0) || Math.abs(y - Math.round(y)) > 1e-9) return null;
    return { texto: String(Math.round(y)), ferramenta: 'idade', fonte: 'álgebra local do problema de idade' };
  }

  /* ---------------- 5. dedução (proposicional e categórica) ---------------- */
  var VAZIAS = /^(a|o|as|os|um|uma|de|da|do|das|dos|que|se|e|em|no|na|nos|nas|por|para|com|foi|sao)$/;
  function palavras(s) {
    return norm(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(function (w) { return w && !VAZIAS.test(w); });
  }
  function raiz(w) { return w.replace(/(mente|ndo|ado|ada|ido|ida|ou|eu|am|em|as|es|s|a|o|u)$/, ''); }
  // Cópulas e verbos de estado não distinguem fatos ("a rua fica molhada" = "a rua está molhada").
  var COPULAS = /^(esta|estao|estava|ficou|fica|ficam|foi|sao|era|eram|ser|estar|ter|tem|vai|vao)$/;
  function palavras(s) {
    return norm(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
      .filter(function (w) { return w && !VAZIAS.test(w) && !COPULAS.test(w); });
  }
  function mesmoTermo(a, b) {
    var pa = palavras(a), pb = palavras(b);
    if (!pa.length || !pb.length) return false;
    var achou = 0;
    pa.forEach(function (w) {
      var r = raiz(w); if (r.length < 3) r = w;
      if (pb.some(function (v) {
        var rv = raiz(v); if (rv.length < 3) rv = v;
        return v === w || rv === r || v.indexOf(r) === 0 || w.indexOf(rv) === 0;
      })) achou++;
    });
    return achou / pa.length >= 0.5;
  }
  function resposta(v, motivo) {
    return { texto: v === 'SIM' ? 'Sim' : 'Não', ferramenta: 'deducao', fonte: 'busca de contraexemplo · ' + motivo };
  }
  function sentencasDe(txt) {
    return txt.split(/[.;]\s*|\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // (a) lógica proposicional: "se P, Q" + fatos; enumera as 4 atribuições de P e Q.
  function proposicional(q, t, conclusaoTexto, ancora) {
    var corpo = norm(texto(q).slice(0, texto(q).indexOf(ancora)));
    var frases = sentencasDe(corpo);
    var imp = null;
    frases = frases.filter(function (f) {
      var m = f.match(/se ([\s\S]+?), ([\s\S]+)$/);
      if (m && !imp) { imp = { p: m[1].trim(), q: m[2].trim() }; return false; }
      return true;
    });
    if (!imp) return null;
    var conclusao = norm(conclusaoTexto).replace(/\?/g, '').trim();
    var cn = /\bnao\b/.test(conclusao);
    var cp = conclusao.replace(/\bnao\b/g, '').trim();
    var alvo = mesmoTermo(cp, imp.p) ? 'P' : mesmoTermo(cp, imp.q) ? 'Q' : null;
    if (!alvo) return null;
    var fatos = [];
    for (var i = 0; i < frases.length; i++) {
      var f = frases[i].replace(/\b(podemos|podemos concluir|logo|portanto|assim)\b/g, '').trim();
      if (!f) continue;
      var neg = /\bnao\b/.test(f);
      var base = f.replace(/\bnao\b/g, '').trim();
      var at = mesmoTermo(base, imp.p) ? 'P' : mesmoTermo(base, imp.q) ? 'Q' : null;
      if (!at) return null;                 // frase fora do padrão: não arrisca
      fatos.push({ at: at, neg: neg });
    }
    var linhas = [{ P: true, Q: true }, { P: true, Q: false }, { P: false, Q: true }, { P: false, Q: false }];
    var validos = linhas.filter(function (l) {
      if (l.P && !l.Q) return false;                       // a implicação P→Q
      return fatos.every(function (fato) { return fato.neg ? !l[fato.at] : l[fato.at]; });
    });
    if (!validos.length) return null;                     // premissas contraditórias
    var sempre = validos.every(function (l) { return cn ? !l[alvo] : l[alvo]; });
    return resposta(sempre ? 'SIM' : 'NAO',
      sempre ? 'implicação + fatos garantem a conclusão' : 'há linha com premissas verdadeiras e conclusão falsa');
  }

  // (b) lógica categórica: todo/nenhum/algum, com negação no termo final.
  var TIPOS = { todo: 'subset', toda: 'subset', todos: 'subset', todas: 'subset',
    nenhum: 'disj', nenhuma: 'disj', algum: 'inter', alguma: 'inter', alguns: 'inter', algumas: 'inter' };
  function lerCategorica(s) {
    var m = norm(s).match(/\b(todos?|todas?|nenhum[a]?|alguns?|alguma?s?)\s+(?:o |a |os |as )?([a-z0-9]+)\s+(?:(nao)\s+)?(?:e|sao)\s+(?:o |a |os |as )?([a-z0-9]+)/);
    if (!m) {
      // forma verbo-final, comum em pergunta: "todos os gatos voam" = gatos ⊆ voam
      var v = norm(s).match(/\b(todos?|todas?|nenhum[a]?|alguns?|alguma?s?)\s+(?:o |a |os |as )?([a-z0-9]+)\s+(?:nao\s+)?([a-z]+(?:am|em))\b/);
      if (!v || TIPOS[v[1]] == null) return null;
      return { tipo: TIPOS[v[1]], a: v[2], negB: /\bnao\b/.test(norm(s)), b: v[3] };
    }
    var tipo = TIPOS[m[1]];
    if (!tipo) return null;
    return { tipo: tipo, a: m[2], negB: !!m[3], b: m[4] };
  }
  function categorica(t, conclusaoTexto, ancora) {
    var corpo = norm(texto(t).slice(0, texto(t).indexOf(ancora)));
    var frases = sentencasDe(corpo);
    var regras = [];
    for (var i = 0; i < frases.length; i++) {
      if (/valido|podemos|concluir|segue/.test(frases[i])) continue;
      var r = lerCategorica(frases[i]);
      if (!r) return null;                 // texto fora do padrão: não arrisca
      regras.push(r);
    }
    if (!regras.length) return null;
    var con = lerCategorica(norm(conclusaoTexto));
    if (!con) return null;
    var termos = {};
    regras.concat([con]).forEach(function (r) { termos[r.a] = 1; termos[r.b] = 1; });
    var lista = Object.keys(termos);
    if (lista.length > 4) return null;
    var U = 3, pos = {};
    lista.forEach(function (k, ix) { pos[k] = ix; });
    var bits = lista.length * U;
    function vale(estado, regra) {
      function tem(e, termo, negB) {
        var v = !!estado[e * lista.length + pos[termo]];
        return negB ? !v : v;
      }
      for (var e = 0; e < U; e++) {
        var na = tem(e, regra.a, false);
        var nb = tem(e, regra.b, regra.negB);
        if (regra.tipo === 'subset' && na && !nb) return false;
        if (regra.tipo === 'disj') {
          // "nenhum A é B": nenhum elemento é A e B (a negação do segundo termo inverte a exigência)
          if (regra.negB ? (na && !nb) : (na && nb)) {
            if (!regra.negB) return false;
          }
        }
      }
      if (regra.tipo === 'inter') {
        for (var e2 = 0; e2 < U; e2++) if (tem(e2, regra.a, false) && tem(e2, regra.b, regra.negB)) return true;
        return false;
      }
      return true;
    }
    var temContra = false, temModelo = false;
    for (var mask = 0; mask < (1 << bits) && !temContra; mask++) {
      var estado = [];
      for (var b2 = 0; b2 < bits; b2++) estado.push(!!(mask & (1 << b2)));
      if (!regras.every(function (rg) { return vale(estado, rg); })) continue;
      temModelo = true;
      if (!vale(estado, con)) temContra = true;
    }
    if (!temModelo) return null;
    return resposta(temContra ? 'NAO' : 'SIM', temContra ? 'contraexemplo encontrado' : 'nenhum contraexemplo');
  }
  function silogismo(q) {
    var t = norm(q);
    if (!/\?/.test(q)) return null;
    if (!/conclui|concluir|vale|valido|podemos afirmar|segue|deduz/.test(t)) return null;
    var mc = texto(q).match(/(?:conclui(?:r|-se)?|concluimos|podemos concluir|podemos afirmar|segue que|deduz(?:-se)?)\s+que\s+([\s\S]+?)\?/i);
    if (!mc) return null;
    var prop = proposicional(q, t, mc[1], mc[0]);
    if (prop) return prop;
    return categorica(q, mc[1], mc[0]);
  }

  /* ---------------- 6. fila / ordenação ---------------- */
  function fila(q) {
    var t = norm(q);
    if (!/antes de|depois de|mais (velho|velha|novo|nova|alto|alta|baixo|baixa) (do )?que/.test(t)) return null;
    if (!/quem|qual/.test(t)) return null;
    var nomes = {}, pares = [];
    var re = /([a-z]+)\s+(?:esta\s+|fica\s+|vem\s+)?(antes|depois)\s+d[eoa]s?\s+([a-z]+)/g, m;
    while ((m = re.exec(t))) {
      nomes[m[1]] = 1; nomes[m[3]] = 1;
      pares.push({ tipo: m[2], a: m[1], b: m[3] });
    }
    var re2 = /([a-z]+)\s+e\s+mais\s+(velh[oa]|nov[oa]|alt[oa]|baix[oa])\s+(?:do )?que\s+([a-z]+)/g;
    while ((m = re2.exec(t))) {
      nomes[m[1]] = 1; nomes[m[3]] = 1;
      pares.push({ tipo: /velh|alt/.test(m[2]) ? 'maior' : 'menor', a: m[1], b: m[3] });
    }
    var lista = Object.keys(nomes);
    if (lista.length < 3 || lista.length > 7) return null;
    var capitalizadas = texto(q).match(/\b([A-Z][a-z]{2,})\b/g) || [];
    // os nomes vêm em minúscula do texto normalizado; só valem os que aparecem capitalizados
    lista = lista.filter(function (n) { return capitalizadas.indexOf(n.charAt(0).toUpperCase() + n.slice(1)) !== -1; });
    if (lista.length < 3) return null;

    function permutar(arr) {
      if (arr.length <= 1) return [arr];
      var saida = [];
      for (var i = 0; i < arr.length; i++) {
        var resto = arr.slice(0, i).concat(arr.slice(i + 1));
        permutar(resto).forEach(function (p) { saida.push([arr[i]].concat(p)); });
      }
      return saida;
    }
    var validas = permutar(lista).filter(function (ordem) {
      var pos = {}; ordem.forEach(function (n, i) { pos[n] = i; });
      return pares.every(function (p) {
        if (pos[p.a] == null || pos[p.b] == null) return true;
        if (p.tipo === 'antes' || p.tipo === 'maior') return pos[p.a] < pos[p.b];
        if (p.tipo === 'depois' || p.tipo === 'menor') return pos[p.a] > pos[p.b];
        return true;
      });
    });
    if (validas.length !== 1) return null;         // ambíguo: não arrisca
    var ordem = validas[0];
    var mq = t.match(/quem (?:e|foi|esta|fica)\s+(?:o |a )?(primeir[oa]|ultim[oa]|mais (?:velh[oa]|nov[oa]|alt[oa]|baix[oa]))/);
    if (!mq) return null;
    var alvo;
    if (/primeir/.test(mq[1])) alvo = ordem[0];
    else if (/ultim/.test(mq[1])) alvo = ordem[ordem.length - 1];
    else alvo = /velh|alt/.test(mq[1]) ? ordem[0] : ordem[ordem.length - 1];
    return { texto: alvo.charAt(0).toUpperCase() + alvo.slice(1), ferramenta: 'fila',
      fonte: 'ordenação exata · ' + validas.length + ' arranjo possível' };
  }

  /* ---------------- 7. probabilidade ---------------- */
  function probabilidade(q) {
    var t = norm(q);
    if (!/probabilidade/.test(t)) return null;
    // moedas: C(n,k)/2^n
    var mo = t.match(/(duas|tres|quatro|cinco|\d+) moedas?[\s\S]*?exatamente (uma|um|duas|dois|tres|\d+) (cara|coroa)/);
    if (mo) {
      var NUMERAIS = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5 };
      var n = NUMERAIS[mo[1]] || parseInt(mo[1], 10);
      var k = NUMERAIS[mo[2]] || parseInt(mo[2], 10);
      if (n > 0 && n <= 12 && k >= 0 && k <= n) {
        return { texto: fracao(comb(n, k), Math.pow(2, n)), ferramenta: 'probabilidade',
          fonte: 'combinatória local · C(' + n + ',' + k + ')/2^' + n };
      }
    }
    // urna sem/com reposição — "sem repor" e "sem reposição" valem igual
    var u = t.match(/urna[\s\S]*?(\d+) bolas? (\w+) e (\d+) (\w+)[\s\S]*?(sem|com) (?:repor|reposicao)[\s\S]*?serem (\w+)/);
    if (u) {
      var a = parseInt(u[1], 10), corA = u[2], b = parseInt(u[3], 10), corB = u[4];
      var semRepor = u[5] === 'sem', cor = u[6];
      var total = a + b;
      var m2 = t.match(/(tiro|retiro|retiram|tiram|sorteio|sorteiam|pego|pegam)\s+(\d+|duas|tres)/);
      var qtd = m2 ? (/duas/.test(m2[2]) ? 2 : /tres/.test(m2[2]) ? 3 : parseInt(m2[2], 10)) : 2;
      var alvo = cor === corB ? b : a;
      if (cor !== corA && cor !== corB) return null;
      if (!semRepor) {
        return { texto: fracao(Math.pow(alvo, qtd), Math.pow(total, qtd)), ferramenta: 'probabilidade',
          fonte: 'com reposição · (' + alvo + '/' + total + ')^' + qtd };
      }
      if (qtd > alvo) return { texto: '0', ferramenta: 'probabilidade', fonte: 'evento impossível' };
      return { texto: fracao(comb(alvo, qtd), comb(total, qtd)), ferramenta: 'probabilidade',
        fonte: 'sem reposição · C(' + alvo + ',' + qtd + ')/C(' + total + ',' + qtd + ')' };
    }
    return null;
  }

  /* ---------------- 8. inclusão-exclusão ---------------- */
  function inclusaoExclusao(q) {
    var t = norm(q);
    var m = t.match(/grupo de (\d+) pessoas[\s\S]*?(\d+) falam (\w+)[\s\S]*?(\d+) falam (\w+)[\s\S]*?(\d+) falam as duas/);
    if (!m) return null;
    if (!/quantas nao falam|quantos nao falam|nenhuma das/.test(t)) return null;
    var N = +m[1], A = +m[2], B = +m[4], AB = +m[6];
    var r = N - (A + B - AB);
    if (r < 0 || r > N) return null;
    return { texto: String(r), ferramenta: 'conjuntos', fonte: 'inclusão-exclusão · ' + N + '-(' + A + '+' + B + '-' + AB + ')' };
  }

  /* ---------------- 9. custo total ---------------- */
  function custoTotal(q) {
    var t = norm(q);
    var precos = {}, m;
    var re = /(\w+) custa[m]? (?:r\$ ?)?(\d+(?:[.,]\d+)?)/g;
    while ((m = re.exec(t))) {
      var item = m[1].replace(/s$/, '');
      if (precos[item] == null) precos[item] = num(m[2]);
    }
    if (!Object.keys(precos).length) return null;
    var trecho = t.match(/comprei ([\s\S]+?)(?:\.|$)/);
    if (!trecho) return null;
    var total = 0, achou = false;
    var re2 = /(\d+) (\w+)/g;
    while ((m = re2.exec(trecho[1]))) {
      var nome = m[2].replace(/s$/, '');
      if (precos[nome] != null) { total += parseInt(m[1], 10) * precos[nome]; achou = true; }
    }
    if (!achou) return null;
    return { texto: inteiro(total), ferramenta: 'custo', fonte: 'soma local de preços' };
  }

  /* ---------------- 10. regra de três inversa (operários) ---------------- */
  function operarios(q) {
    var t = norm(q);
    var m = t.match(/se (\d+) (\w+) (?:fazem|faz|cavam|constroem)[\s\S]*?em (\d+) dias[\s\S]*?(\d+) (\w+)/);
    if (!m) return null;
    if (!/quantos dias|em quanto tempo/.test(t)) return null;
    var a = +m[1], dias = +m[3], b = +m[4];
    if (!(a > 0 && b > 0)) return null;
    var r = a * dias / b;
    return { texto: inteiro(Math.round(r * 1000) / 1000), ferramenta: 'proporcao', fonte: 'regra de três inversa' };
  }

  /* ---------------- 11. matriz descrita em texto ---------------- */
  var LADOS = { triangulo: 3, quadrado: 4, pentagono: 5, hexagono: 6, heptagono: 7, octogono: 8 };
  function matriz(q) {
    var t = norm(q);
    // (a) regra aplicada a células de uma matriz 2x2
    if (/matriz/.test(t) && /posicao|celula|casa/.test(t)) {
      var m1 = texto(q).match(/primeira linha:? ([\s\S]+?)(?:;\s*|\.\s*|,?\s*e a segunda)/i);
      var m2 = texto(q).match(/segunda(?: linha)?:? ([\s\S]+?)(?:\.\s|\.$|,?\s*se )/i);
      if (!m1 || !m2) return null;
      function celulas(s) {
        return s.split(/,| e /).map(function (x) { return norm(x).trim(); }).filter(Boolean);
      }
      var linhas = [celulas(m1[1]), celulas(m2[1])];
      if (linhas[0].length !== 2 || linhas[1].length !== 2) return null;
      var pos = t.match(/posicao \((\d),(\d)\)/);
      if (!pos) return null;
      var i = +pos[1] - 1, j = +pos[2] - 1;
      var cel = linhas[i] && linhas[i][j];
      if (!cel) return null;
      var diagonal = i === j;
      // Só a regra conhecida: inverter cores. Qualquer outra regra pedida (girar, trocar
      // posições, somar) não é deduzida aqui — melhor o modelo do que uma regra inventada.
      if (!/inverter (?:as )?cores/.test(t)) return null;
      var inverte = (/diagonal principal/.test(t) ? diagonal : true);
      function inverterCor(c) {
        var cores = { preto: 'branco', branco: 'preto', azul: 'vermelho', vermelho: 'azul',
          verde: 'vermelho', amarelo: 'azul', cinza: 'preto' };
        var achou = false;
        var saida = c.split(' ').map(function (w) {
          if (cores[w]) { achou = true; return cores[w]; }
          return w;
        }).join(' ');
        return achou ? saida : null;
      }
      var resultado = inverte ? inverterCor(cel) : cel;
      if (!resultado) return null;
      return { texto: resultado, ferramenta: 'matriz', fonte: 'regra aplicada à célula (' + (i + 1) + ',' + (j + 1) + ')' };
    }
    // (b) linha 2 com múltiplo de lados da linha 1
    if (/lados/.test(t) && /linha 1|linha 2|primeira linha|segunda linha/.test(t)) {
      var mLin = t.match(/linha 1 (?:tem|com|e):? ([\s\S]+?)(?:\.\s|\.$|$)/);
      var mMult = t.match(/(dobro|triplo|metade|\d+ vezes) (?:de )?(?:lados|lado)/);
      var mQ = t.match(/quantos lados tem a (primeira|segunda|terceira|quarta|\d+) figura da linha 2/);
      if (!mLin || !mMult || !mQ) return null;
      var figuras = mLin[1].split(/,| e /).map(function (x) { return norm(x).trim(); }).filter(Boolean);
      var idx = ordinal(mQ[1]) - 1;
      var fig = figuras[idx];
      if (!fig || LADOS[fig] == null) return null;
      var mult = /dobro/.test(mMult[1]) ? 2 : /triplo/.test(mMult[1]) ? 3 :
        /metade/.test(mMult[1]) ? 0.5 : parseInt(mMult[1], 10);
      if (!mult) return null;
      var lados = LADOS[fig] * mult;
      return { texto: inteiro(lados), ferramenta: 'matriz', fonte: fig + ' (' + LADOS[fig] + ' lados) × ' + mult };
    }
    return null;
  }

  /* ---------------- 12. rotação em pontos cardeais ---------------- */
  function rotacao(q) {
    var t = norm(q);
    var m = t.match(/aponta para o (norte|sul|leste|oeste)[\s\S]*?gira (\d+) graus[\s\S]*?(horario|anti-horario|anti horario)[\s\S]*?(?:no|apos|depois do|ao) (primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|\d+)\s*(?:o |º )?passo/);
    if (!m) return null;
    var pontos = ['norte', 'leste', 'sul', 'oeste'];
    var i0 = pontos.indexOf(m[1]);
    var graus = parseInt(m[2], 10);
    if (!(graus > 0) || graus % 90 !== 0) return null;   // 45° não cai em ponto cardeal
    var passos = ordinal(m[4]);
    if (!passos) return null;
    var quartos = graus / 90;
    var sinal = /anti/.test(m[3]) ? -1 : 1;
    var giros = sinal * quartos * passos;
    var i = ((i0 + giros) % 4 + 4) % 4;
    return { texto: pontos[i], ferramenta: 'rotacao',
      fonte: 'rotação local · ' + m[1] + ' ' + (giros >= 0 ? '+' : '') + giros + ' quartos de volta' };
  }

  /* ---------------- 13. memória de lista ---------------- */
  function memoria(q) {
    var t = norm(q);
    var itens = null, m;
    if ((m = texto(q).match(/memoriz\w*[^:]*:\s*([^.?]+)\./i))) {
      itens = m[1].split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    if (itens && itens.length >= 3) {
      if ((m = t.match(/escreva o (\w+) item|qual (?:e|foi) o (\w+) item/))) {
        var pos = ordinal(m[1] || m[2]);
        if (pos && itens[pos - 1] != null) {
          return { texto: itens[pos - 1], ferramenta: 'memoria', fonte: 'lista lida do próprio pedido' };
        }
        return null;
      }
      if ((m = t.match(/some o (\w+) e o (\w+) numero/))) {
        var p1 = ordinal(m[1]), p2 = ordinal(m[2]);
        var v1 = itens[p1 - 1], v2 = itens[p2 - 1];
        if (v1 != null && v2 != null && !isNaN(num(v1)) && !isNaN(num(v2))) {
          return { texto: inteiro(num(v1) + num(v2)), ferramenta: 'memoria', fonte: 'soma dos itens pedidos da lista' };
        }
        return null;
      }
    }
    // sequência de letras invertida
    if ((m = t.match(/de tras para frente (?:a sequencia de letras|a palavra|a sequencia):? ([a-z ]+)/))) {
      var letras = m[1].trim().split(/\s+/).filter(Boolean);
      if (!letras.length) return null;
      return { texto: letras.reverse().join(' ').toUpperCase(), ferramenta: 'memoria',
        fonte: 'inversão local da sequência pedida' };
    }
    return null;
  }

  /* ---------------- 14. sequência de LETRAS ---------------- */
  // Mesma ideia da sequência numérica, no alfabeto: confere o padrão em TODAS as letras dadas
  // antes de responder. É o item que o auto-diagnóstico apontou como mecânico e sem código.
  function sequenciaLetras(q) {
    var t = norm(q);
    if (!/sequencia|continua|proximo|complete/.test(t)) return null;
    var m = texto(q).match(/\b((?:[A-Z]\s*,\s*){2,}[A-Z])\s*,?\s*\?/);
    if (!m) return null;
    var letras = m[1].split(',').map(function (x) { return x.trim().toUpperCase(); })
      .filter(function (x) { return /^[A-Z]$/.test(x); });
    if (letras.length < 3) return null;
    var nums = letras.map(function (l) { return l.charCodeAt(0) - 65; });
    var i, n = nums.length, cand = null;

    // (a) distâncias crescentes: 2, 3, 4, 5... (o padrão do enunciado "as distâncias crescem")
    var d = [];
    for (i = 1; i < n; i++) d.push(nums[i] - nums[i - 1]);
    var cresce = true;
    for (i = 1; i < d.length; i++) if (d[i] - d[i - 1] !== 1) cresce = false;
    if (cresce && d.length >= 2) cand = nums[n - 1] + d[d.length - 1] + 1;

    // (b) distância constante
    if (cand === null) {
      var fixo = d.every(function (x) { return x === d[0]; });
      if (fixo) cand = nums[n - 1] + d[0];
    }
    // (c) dobro + 1 (A, C, F, J... também sai daqui: 0,2,5,9 → +2,+3,+4 já é (a))
    if (cand === null) return null;
    if (!(cand >= 0 && cand < 26)) return null;          // passou de Z: não inventa
    return { texto: String.fromCharCode(65 + cand), ferramenta: 'sequencia-letras',
      fonte: 'sequência de letras local · distâncias ' + d.join(', ') };
  }

  /* ---------------- 15. ponto flutuante do JavaScript ---------------- */
  // 0.1 + 0.2 === 0.3 é FALSO em JavaScript (IEEE-754). É fato de linguagem, não conta de modelo.
  function pontoFlutuante(q) {
    var t = norm(q);
    if (!/javascript|js\b/.test(t)) return null;
    var m = t.match(/([\d.]+)\s*\+\s*([\d.]+)\s*===?\s*([\d.]+)/);
    if (!m) return null;
    var a = parseFloat(m[1]), b = parseFloat(m[2]), c = parseFloat(m[3]);
    if (isNaN(a) || isNaN(b) || isNaN(c)) return null;
    var soma = a + b;
    var iguais = soma === c;
    return { texto: iguais ? 'Sim' : 'Não', ferramenta: 'ponto-flutuante',
      fonte: 'IEEE-754: ' + a + ' + ' + b + ' = ' + soma + ' (não é exatamente ' + c + ')' };
  }

  /* ---------------- 14. código de uma linha ---------------- */
  function codigo(q) {
    var t = norm(q), m;
    if ((m = t.match(/len\(\[([\d,\s]+)\]\)\s*\+\s*(\d+)/))) {
      var lista = m[1].split(',').filter(function (x) { return x.trim() !== ''; });
      return { texto: String(lista.length + parseInt(m[2], 10)), ferramenta: 'codigo', fonte: 'len da lista + n' };
    }
    if ((m = t.match(/\[([\d,\s]+)\]\.map\(x\s*=>\s*x\s*\*\s*(\d+)\)\.join\("([^"]*)"\)/))) {
      var nums = m[1].split(',').map(function (x) { return parseInt(x.trim(), 10); });
      var k = parseInt(m[2], 10), sep = m[3];
      return { texto: nums.map(function (x) { return x * k; }).join(sep), ferramenta: 'codigo',
        fonte: 'map/join avaliados localmente' };
    }
    if ((m = t.match(/print\(\[i\s*\*\s*(\d+)\s+for i in range\((\d+)\)\]\)/))) {
      var f = parseInt(m[1], 10), n = parseInt(m[2], 10), saida = [];
      for (var i = 0; i < n; i++) saida.push(i * f);
      return { texto: '[' + saida.join(', ') + ']', ferramenta: 'codigo',
        fonte: 'list comprehension avaliada localmente' };
    }
    // len("casa") / len("texto") — comprimento de literal
    if ((m = texto(q).match(/len\(\s*(["'])([^"']*)\1\s*\)/))) {
      return { texto: String(m[2].length), ferramenta: 'codigo',
        fonte: 'comprimento do literal · ' + m[2].length + ' caracteres' };
    }
    if (/typeof null/.test(t)) {
      return { texto: 'object', ferramenta: 'codigo', fonte: 'especificação do JavaScript (typeof null)' };
    }
    return null;
  }

  var SOLUCIONADORES = [sequencia, sequenciaLetras, pontoFlutuante, contagemDigito, trabalhoConjunto, problemaIdade, silogismo, fila,
    probabilidade, inclusaoExclusao, custoTotal, operarios, matriz, rotacao, memoria, codigo];

  function resolver(pergunta) {
    var q = texto(pergunta);
    if (!q.trim()) return null;
    for (var i = 0; i < SOLUCIONADORES.length; i++) {
      var r = null;
      try { r = SOLUCIONADORES[i](q); } catch (e) { r = null; }
      if (r && r.texto) return r;
    }
    return null;
  }

  var api = { resolver: resolver, sequencia: sequencia, sequenciaLetras: sequenciaLetras, pontoFlutuante: pontoFlutuante, contagemDigito: contagemDigito,
    trabalhoConjunto: trabalhoConjunto, problemaIdade: problemaIdade, silogismo: silogismo, fila: fila,
    probabilidade: probabilidade, inclusaoExclusao: inclusaoExclusao, custoTotal: custoTotal,
    operarios: operarios, matriz: matriz, rotacao: rotacao, memoria: memoria, codigo: codigo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.RazaoLocal = api;
})();
