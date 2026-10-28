import json, random
random.seed(777001)
itens=[]
def add(tipo,q,g): itens.append({"id":len(itens)+1,"tipo":tipo,"q":q,"g":[str(x) for x in (g if isinstance(g,list) else [g])]})

# 15 mat (valores novos)
for _ in range(8):
    a=random.randint(101,899); b=random.randint(101,899); add("mat",f"Quanto é {a}+{b}?",[a+b])
for _ in range(4):
    a=random.randint(13,29); b=random.randint(11,19); add("mat",f"Quanto é {a}×{b}?",[a*b])
for _ in range(3):
    p=random.choice([5,15,25,35]); n=random.choice([200,240,400]); add("mat",f"Quanto é {p}% de {n}?",[int(p*n/100)])

# 15 seq (regras novas)
for ini,r in [(11,8),(17,9),(23,12),(31,7),(41,6)]:
    t=[ini+r*i for i in range(4)]; add("seq","Próximo: "+",".join(map(str,t))+",?",t[-1]+r)
for ini,r in [(3,5),(7,3),(2,6),(11,2),(13,4)]:
    t=[ini*(r**i) for i in range(4)]; add("seq","Próximo: "+",".join(map(str,t))+",?",t[-1]*r)
for ini in [500,320,180,97,64]:
    t=[ini,ini//2,ini//4]; add("seq","Próximo: "+",".join(map(str,t))+",?",t[-1]//2)

# 15 logica
log=[("Se hoje é quinta-feira, que dia será daqui a 4 dias?",["segunda","segunda-feira"]),
("Quantos meses do ano têm 30 dias?",[4,"quatro"]),
("Quantos lados tem um octógono?",[8,"oito"]),
("Um relógio marca 9h. Que horas marcará daqui a 15 horas (0-23)?",[0,"zero","0h"]),
("Se 4 cadernos custam R$20, quanto custam 7?",[35]),
("Pedro é mais novo que Lucas e Lucas é mais novo que Ivo. Quem é o mais velho?",["ivo"]),
("Quantos minutos tem 2 horas e 15 minutos?",[135,"cento e trinta e cinco"]),
("Numa fila, Rita é a 8ª. Quantas pessoas estão à frente dela?",[7,"sete"]),
("Quantos dias tem três semanas?",[21,"vinte e um"]),
("Uma torneira enche 5 litros por minuto. Quantos litros em 12 minutos?",[60,"sessenta"]),
("Quantos segundos tem 5 minutos?",[300,"trezentos"]),
("Um livro de 480 páginas, 40 por dia: em quantos dias termino?",[12,"doze"]),
("Quantas patas têm 12 cachorros?",[48,"quarenta e oito"]),
("Quantos ovos há em 4 dúzias?",[48,"quarenta e oito"]),
("Quantas faces tem um cubo?",[6,"seis"])]
for q,g in log: add("logica",q,g)

# 15 brasil (estados que não estavam no banco200)
br=[("Qual a capital de Roraima?",["boa vista"]),("Qual a capital do Amapá?",["macapá","macapa"]),
("Qual a capital do Acre?",["rio branco"]),("Qual a capital de Rondônia?",["porto velho"]),
("Qual a capital do Tocantins?",["palmas"]),("Qual a capital de Mato Grosso?",["cuiabá","cuiaba"]),
("Qual a capital de Santa Catarina?",["florianópolis","florianopolis"]),
("Qual a capital do Rio de Janeiro?",["rio de janeiro"]),("Qual a capital de São Paulo?",["são paulo","sao paulo"]),
("Qual a capital de Minas Gerais?",["belo horizonte"]),("Qual a capital da Paraíba?",["joão pessoa","joao pessoa"]),
("Qual a capital do Maranhão?",["são luís","sao luis"]),("Qual a capital do Ceará?",["fortaleza"]),
("Qual a capital do Pará?",["belém","belem"]),("Qual a capital do Amazonas?",["manaus"])]
for q,g in br: add("brasil",q,g)

# 15 lingua
lp=[("Qual o feminino de 'padre'?",["madre"]),("Qual o coletivo de abelhas?",["enxame"]),
("Quantas sílabas tem 'borboleta'?",[4,"quatro"]),("Qual o superlativo de 'mau'?",["péssimo","pessimo"]),
("Qual o antônimo de 'grosso'?",["fino"]),("Qual o plural de 'cidadão'?",["cidadãos","cidadaos"]),
("Qual o plural de 'papel'?",["papéis","papeis"]),("Qual o diminutivo de 'casa'?",["casinha"]),
("Qual a classe da palavra 'corajoso'?",["adjetivo"]),("Qual a classe da palavra 'correr'?",["verbo"]),
("Qual o antônimo de 'doce'?",["amargo"]),("Qual o sinônimo de 'rápido'?",["veloz","ligeiro"]),
("Qual a figura de linguagem em 'seus olhos são duas estrelas'?",["metáfora","metafora"]),
("Quantas letras tem 'caderno'?",[7,"sete"]),("Qual o feminino de 'carneiro'?",["ovelha"])]
for q,g in lp: add("lingua",q,g)

# 15 eng
en=[("Translate to Portuguese: 'window'",["janela"]),("Translate to Portuguese: 'chair'",["cadeira"]),
("Translate to Portuguese: 'bread'",["pão","pao"]),("Translate to Portuguese: 'street'",["rua"]),
("Translate to Portuguese: 'teacher'",["professor","professora"]),
("Translate to English: 'mesa'",["table"]),("Translate to English: 'porta'",["door"]),
("Translate to English: 'cavalo'",["horse"]),("Translate to English: 'feliz'",["happy"]),
("Translate to English: 'trabalho'",["work","job"]),
("Past tense of 'write'?",["wrote"]),("Past tense of 'drink'?",["drank"]),
("Plural of 'foot'?",["feet"]),("Comparative of 'bad'?",["worse"]),("Superlative of 'far'?",["farthest","furthest"])]
for q,g in en: add("eng",q,g)

# 15 mundo
mu=[("Qual a capital da Alemanha?",["berlim","berlin"]),("Qual a capital do Canadá?",["ottawa"]),
("Qual a capital da Rússia?",["moscou","moscow"]),("Qual a capital da Índia?",["nova délhi","new delhi","delhi"]),
("Qual é o símbolo químico da prata?",["ag"]),("Qual é o símbolo químico do ferro?",["fe"]),
("Qual é o símbolo químico do sódio?",["na"]),("Qual o planeta conhecido como planeta vermelho?",["marte","mars"]),
("Qual o maior oceano do mundo?",["pacífico","pacifico"]),("Quantos continentes habitados existem?",[5,"cinco","6","seis"]),
("Quem escreveu 'Grande Sertão: Veredas'?",["guimarães rosa","guimaraes rosa"]),
("Quem pintou 'O Grito'?",["edvard munch","munch"]),("Qual a unidade de potência no SI?",["watt","w"]),
("Qual o metal do símbolo 'Pb'?",["chumbo"]),("Qual o maior planeta do Sistema Solar?",["júpiter","jupiter"])]
for q,g in mu: add("mundo",q,g)

assert len(itens)==105, len(itens)
json.dump({"v":1,"criado":"2026-10-27","total":len(itens),"itens":itens}, open('banco-holdout.json','w'), ensure_ascii=False, indent=1)
import collections; print(len(itens), collections.Counter(i['tipo'] for i in itens))
