# -*- coding: utf-8 -*-
"""Banco FRESCO (rodada 93) — 84 itens escritos DEPOIS de todos os ajustes e nunca usados para
tunar nada. Serve para uma pergunta só: o 100% do banco de 200 e do holdout é generalização ou
é o meu próprio treino voltando?

Regras desta geração:
  * itens de matemática/sequência são calculados por fórmula e conferidos por um segundo caminho;
  * nenhum item repete pergunta dos outros dois bancos;
  * gabarito só com equivalências linguísticas declaradas (nada de "aceitar qualquer coisa").
"""
import json, math

itens = []
def add(tipo, q, g, alts=None):
    item = {'id': len(itens) + 1, 'tipo': tipo, 'q': q, 'g': g}
    if alts: item['alts'] = alts
    itens.append(item)

# ---------------- mat (14) ----------------
a, b, c = 47, 23, 9
add('mat', f'Quanto é {a} + {b} × {c}?', [str(a + b * c)])
add('mat', f'Quanto é ({a} + {b}) × 2?', [str((a + b) * 2)])
n = 74
add('mat', f'Quanto é {n}²?', [str(n * n)])
add('mat', f'Quanto é a raiz quadrada de {17 * 17}?', ['17'])
add('mat', f'Quanto é {12}% de {250}?', ['30'])
add('mat', f'Quanto é o dobro de {137}?', ['274'])
add('mat', f'Quanto é a metade de {86}?', ['43'])
add('mat', f'Quanto é o triplo de {41}?', ['123'])
add('mat', f'Quanto é {9}³?', ['729'])
add('mat', f'Quanto é {151} − {68}?', ['83'])
add('mat', f'Quanto é {13} × {17}?', ['221'])
add('mat', f'Quanto é {144} ÷ {12}?', ['12'])
add('mat', 'Um retângulo tem 12 cm de largura e 7 cm de altura. Qual é a área?', ['84'])
add('mat', 'Quantos lados tem um hexágono?', ['6', 'seis'])

# ---------------- seq (12) — progressões com valores limpos ----------------
seqs = [
    ([5, 12, 19, 26], 33), ([8, 16, 24, 32], 40), ([6, 18, 54, 162], 486),
    ([7, 14, 28, 56], 112), ([9, 18, 36, 72], 144), ([100, 50, 25], 12.5),
    ([44, 38, 32, 26], 20), ([2, 10, 50, 250], 1250), ([11, 33, 99, 297], 891),
    ([81, 27, 9], 3), ([90, 45, 22.5], 11.25), ([3, 9, 27, 81], 243),
]
for lista, resp in seqs:
    # conferência independente: razão ou diferença constante
    diffs = [round(lista[i + 1] - lista[i], 6) for i in range(len(lista) - 1)]
    razoes = [round(lista[i + 1] / lista[i], 6) for i in range(len(lista) - 1)]
    if len(set(diffs)) == 1:
        esperado = round(lista[-1] + diffs[0], 6)
    else:
        assert len(set(razoes)) == 1, lista
        esperado = round(lista[-1] * razoes[0], 6)
    assert abs(esperado - resp) < 1e-3, (lista, esperado, resp)  # razões arredondadas no cálculo
    texto = ', '.join(('%g' % x) for x in lista)
    add('seq', f'Próximo: {texto},?', ['%g' % resp])

# ---------------- logica (12) ----------------
add('logica', 'Um relógio marca 3h. Que horas marcará daqui a 21 horas (0-23)?', ['0', 'zero', '0h'])
add('logica', 'Numa fila de 15 pessoas, Ana é a 4ª. Quantas pessoas estão atrás dela?', ['11'])
add('logica', 'Numa fila, João é o 9º. Quantas pessoas estão à frente dele?', ['8', 'oito'])
add('logica', 'Se você ultrapassa o 2º colocado, em que posição fica?', ['2', 'segundo', '2º'])
add('logica', 'Uma torneira pinga 3 litros por minuto. Quantos litros em 14 minutos?', ['42'])
add('logica', 'Se 5 cadernos custam R$30, quanto custam 8?', ['48'])
add('logica', 'Quantos meses do ano têm 31 dias?', ['7', 'sete'])
add('logica', 'Quantos dias tem fevereiro em um ano comum?', ['28', 'vinte e oito'])
add('logica', 'Maria tem 3 maçãs a mais que Ana. Ana tem 12. Quantas Maria tem?', ['15'])
add('logica', 'Um número é maior que 30 e menor que 33. Que número é?', ['31', '32'])
add('logica', 'Quantas patas têm 4 cachorros?', ['16'])
add('logica', 'Quantos dias tem dois anos comuns?', ['730'])

# ---------------- lingua (14) ----------------
add('lingua', 'Qual é o coletivo de peixes?', ['cardume', 'cardume de peixes'], ['banco'])
add('lingua', 'Qual é o coletivo de abelhas?', ['enxame', 'colmeia'], ['enxame de abelhas'])
add('lingua', 'Qual o feminino de \'gato\'?', ['gata'])
add('lingua', 'Qual o plural de \'cidadão\'?', ['cidadãos'])
add('lingua', 'Qual o plural de \'caracol\'?', ['caracóis'])
add('lingua', 'Qual o superlativo de \'salgado\'?', ['salgadíssimo'])
add('lingua', 'Qual o aumentativo de \'livro\'?', ['livrão', 'livrona'])
add('lingua', 'Qual o diminutivo de \'pão\'?', ['pãozinho'])
add('lingua', 'Qual o antônimo de \'claro\'?', ['escuro'])
add('lingua', 'Qual o antônimo de \'triste\'?', ['alegre', 'feliz'])
add('lingua', 'Qual o sinônimo de \'rápido\'?', ['veloz', 'ligeiro'], ['rápida'])
add('lingua', 'Quantas sílabas tem a palavra \'janela\'?', ['3', 'três'])
add('lingua', 'Qual a classe da palavra \'porém\'?', ['conjunção', 'conjuncao'])
add('lingua', 'Qual a figura de linguagem em \'morri de saudade\'?', ['hipérbole', 'hiperbole'])

# ---------------- eng (12) ----------------
add('eng', "Past tense of 'go'?", ['went'])
add('eng', "Past tense of 'take'?", ['took'])
add('eng', "Past tense of 'swim'?", ['swam'])
add('eng', "Plural of 'mouse'?", ['mice'])
add('eng', "Plural of 'child'?", ['children'])
add('eng', "Plural of 'analysis'?", ['analyses'])
add('eng', "Comparative of 'far'?", ['farther', 'further'])
add('eng', "Superlative of 'bad'?", ['worst'])
add('eng', "Superlative of 'happy'?", ['happiest'])
add('eng', "Comparative of 'old'?", ['older', 'elder'])
add('eng', "Superlative of 'difficult'?", ['most difficult'])
add('eng', "Past tense of 'teach'?", ['taught'])

# ---------------- brasil (10) ----------------
add('brasil', 'Qual a capital de Alagoas?', ['Maceió'])
add('brasil', 'Qual a capital do Ceará?', ['Fortaleza'])
add('brasil', 'Qual a capital de Santa Catarina?', ['Florianópolis'])
add('brasil', 'Qual a capital do Rio Grande do Sul?', ['Porto Alegre'])
add('brasil', 'Quantas unidades federativas o Brasil tem?', ['27', 'vinte e sete', '26 estados e o distrito federal'])
add('brasil', 'Qual é a moeda do Brasil?', ['real', 'r$'])
add('brasil', 'Quantos estados o Brasil tem?', ['26', 'vinte e seis'])
add('brasil', 'Qual é a sigla de São Paulo?', ['sp'])
add('brasil', 'Qual é a sigla da Bahia?', ['ba'])
add('brasil', 'Qual é a língua oficial do Brasil?', ['português', 'português brasileiro', 'portugues'])

# ---------------- mundo (10) ----------------
add('mundo', 'Qual é a capital da Noruega?', ['oslo', 'cristiânia'])
add('mundo', 'Qual é a capital do Canadá?', ['ottawa'])
add('mundo', 'Qual é a capital do Egito?', ['cairo'])
add('mundo', 'Qual é o símbolo químico do sódio?', ['na'])
add('mundo', 'Qual é o símbolo químico do ferro?', ['fe'])
add('mundo', 'Qual é o elemento de símbolo Ca?', ['cálcio'])
add('mundo', 'Qual é o maior planeta do sistema solar?', ['júpiter', 'jupiter'])
add('mundo', 'Quantos planetas tem o sistema solar?', ['8', 'oito'])
add('mundo', 'Qual é a moeda do Japão?', ['iene', 'ien', 'yen'])
add('mundo', 'Qual é o rio mais extenso do mundo?', ['nilo', 'amazonas'])

json.dump({'fonte': 'banco fresco da rodada 93 — escrito depois dos ajustes, nunca usado para tunar',
           'itens': itens}, open('/home/user/chat-v2/bench/banco-fresco.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('banco-fresco.json:', len(itens), 'itens')
for t in ('mat', 'seq', 'logica', 'lingua', 'eng', 'brasil', 'mundo'):
    print(' ', t, sum(1 for i in itens if i['tipo'] == t))
