# -*- coding: utf-8 -*-
"""Rodada 93 — correções que o holdout (105 nunca vistos) obrigou:

1. gabarito errado em 2 sequências geométricas (500,250,125 → 62.5, não 62; 180,90,45 → 22.5, não 22);
2. a rota de símbolo químico só casava "do/da" no masculino ("símbolo do ouro") e perdia "símbolo químico da prata";
3. inglês irregular (past tense, plural, comparative, superlative) estava 100% nas mãos do modelo grátis — e nas
   medições virou "sem resposta" quando os provedores deram 429; passa a ser tabela local;
4. problema de taxa ("5 litros por minuto em 12 minutos") vira regra determinística;
5. preâmbulo de raciocínio novo que escapou da guarda: "Refinement", "Constraint says", "Draft", "Verify".
"""
import io, json

# ---------- 1. gabaritos ----------
for banco in ('banco-holdout.json', 'banco200.json'):
    caminho = '/home/user/chat-v2/bench/' + banco
    d = json.load(io.open(caminho, encoding='utf-8'))
    itens = d['itens'] if isinstance(d, dict) and 'itens' in d else d
    mudou = []
    for i in itens:
        q = i.get('q', '')
        if '500,250,125' in q:
            i['g'] = ['62.5', '62,5']; mudou.append(('500,250,125', i['g']))
        if '180,90,45' in q:
            i['g'] = ['22.5', '22,5']; mudou.append(('180,90,45', i['g']))
    if mudou:
        io.open(caminho, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1))
    print(banco, '→ gabaritos corrigidos:', mudou)

# ---------- 2..5. roteador ----------
c = '/home/user/chat-v2/roteador-ia.js'
s = io.open(c, encoding='utf-8').read()

# 2. símbolo químico / elemento: aceitar da, do, de, das, dos
s = s.replace(
 r"""if ((m = q.match(/s[ií]mbolo(?:\s+qu[ií]mico)?\s+d[oe]\s+(?:elemento\s+)?(.+?)\??$/i))) {""",
 r"""if ((m = q.match(/s[ií]mbolo(?:\s+qu[ií]mico)?\s+d(?:a|o|e|os|as)\s+(?:elemento\s+)?(.+?)\??$/i))) {""", 1)

# 3. inglês irregular (tabelas locais)
tabelas = '''
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
'''

s = s.replace("  var FATOS = [", tabelas + "\n  var FATOS = [", 1)

# rota de inglês, antes da rota de capital
s = s.replace("""    /* --- capital (Wikidata P36) --- */""",
"""    /* --- inglês irregular (tabela local) --- */
    if ((m = q.match(/(?:past\\s+(?:tense|simple)|simple past)\\s+of\\s+['"“‘]?([a-z]+)['"”’]?/i))) {
      var iv = ING_VERBO[m[1].toLowerCase()];
      if (iv) return { texto: iv[0], ferramenta: 'ingles-irregular', fonte: 'tabela local de inglês' };
      if (/[^aeiou]y$/.test(m[1].toLowerCase())) return { texto: m[1].toLowerCase().slice(0, -1) + 'ied', ferramenta: 'ingles-irregular', fonte: 'regra de formação' };
      if (/e$/.test(m[1].toLowerCase())) return { texto: m[1].toLowerCase() + 'd', ferramenta: 'ingles-irregular', fonte: 'regra de formação' };
      return { texto: m[1].toLowerCase() + 'ed', ferramenta: 'ingles-irregular', fonte: 'regra de formação' };
    }
    if ((m = q.match(/plural\\s+of\\s+['"“‘]?([a-z]+)['"”’]?/i))) {
      var ip = ING_PLURAL[m[1].toLowerCase()];
      if (ip) return { texto: ip, ferramenta: 'ingles-plural', fonte: 'tabela local de inglês' };
      var w = m[1].toLowerCase();
      if (/(s|x|z|ch|sh)$/.test(w)) return { texto: w + 'es', ferramenta: 'ingles-plural', fonte: 'regra de formação' };
      if (/[^aeiou]y$/.test(w)) return { texto: w.slice(0, -1) + 'ies', ferramenta: 'ingles-plural', fonte: 'regra de formação' };
      return { texto: w + 's', ferramenta: 'ingles-plural', fonte: 'regra de formação' };
    }
    if ((m = q.match(/(comparative|superlative)\\s+of\\s+['"“‘]?([a-z]+)['"”’]?/i))) {
      var tipoG = /comparative/i.test(m[1]) ? 'comp' : 'sup';
      var g = ING_GRAU[m[2].toLowerCase()];
      if (g) return { texto: g[tipoG], ferramenta: 'ingles-grau', fonte: 'tabela local de inglês' };
      var reg = grauRegular(m[2], tipoG);
      if (reg) return { texto: reg, ferramenta: 'ingles-grau', fonte: 'regra de formação' };
      return null;
    }

    /* --- problema de taxa: X por minuto/hora/dia durante N --- */
    if ((m = q.match(/(\\d+(?:[.,]\\d+)?)\\s*(\\w+)?\\s*por\\s+(segundo|minuto|hora|dia).*?(\\d+(?:[.,]\\d+)?)\\s*(segundos?|minutos?|horas?|dias?)/i))) {
      var unidade1 = { segundo: 'segundos', minuto: 'minutos', hora: 'horas', dia: 'dias' }[m[3].toLowerCase()];
      var unidade2 = m[5].toLowerCase().replace(/s$/, '') + 's';
      if (unidade1 === unidade2) {
        var a = parseFloat(m[1].replace(',', '.')), b = parseFloat(m[4].replace(',', '.'));
        var prod = Math.round(a * b * 1e6) / 1e6;
        return { texto: String(prod).replace('.', ','), ferramenta: 'regra-de-taxa', fonte: 'regra aritmética local' };
      }
    }

    /* --- capital (Wikidata P36) --- */""", 1)

# 5. preâmbulo novo na guarda
s = s.replace("""  var PREAMBULO = /^(thinking|reasoning|analysis|analisando|analiso|let me|let's|hmm|okay|ok\\b|wait|first,|firstly|next,|the user|user asks|the question|i need|i should|i'll|we need|looking at|actually|so,|now,|vou |preciso |deixa eu)/i;""",
"""  var PREAMBULO = /^(thinking|reasoning|analysis|analisando|analiso|let me|let's|hmm|okay|ok\\b|wait|first,|firstly|next,|the user|user asks|the question|i need|i should|i'll|we need|looking at|actually|so,|now,|vou |preciso |deixa eu|refinement|constraint|draft|verify|double-check|checking|note:|final check)/i;""", 1)
s = s.replace("""  var CABECALHO_RACIOCINIO = /^(thinking\\s*process|reasoning|analysis|analisando|cadeia de pensamento|chain of thought|step\\s*1|1\\.\\s*analy)/i;""",
"""  var CABECALHO_RACIOCINIO = /^(thinking\\s*process|reasoning|analysis|analisando|cadeia de pensamento|chain of thought|step\\s*1|1\\.\\s*analy|refinement|constraint says|draft|verify)/i;""", 1)

io.open(c, 'w', encoding='utf-8').write(s)
print('roteador-ia.js: símbolo da/do, inglês irregular, taxa, preâmbulo — aplicados')
