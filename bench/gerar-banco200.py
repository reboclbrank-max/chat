import json, random, math
random.seed(20261027)
itens=[]
def add(tipo,q,g): itens.append({"id":len(itens)+1,"tipo":tipo,"q":q,"g":[str(x) for x in (g if isinstance(g,list) else [g])]})

# ---- 40 matemática (respostas calculadas, nunca digitadas) ----
mat=[]
for _ in range(20):
    a=random.randint(11,99); b=random.randint(11,99); mat.append((f"Quanto é {a}+{b}?",[a+b]))
for _ in range(10):
    a=random.randint(3,19); b=random.randint(3,19); mat.append((f"Quanto é {a}×{b}?",[a*b]))
for _ in range(5):
    p=random.choice([10,15,20,25,50]); n=random.choice([40,60,80,120,200]); mat.append((f"Quanto é {p}% de {n}?",[int(p*n/100)]))
for _ in range(5):
    a=random.randint(2,12); mat.append((f"Quanto é {a}^3?",[a**3]))
for q,g in mat: add("mat",q,g)

# ---- 30 sequências (regra gerada e próxima calculada) ----
seqs=[]
for ini,r in [(2,3),(3,4),(5,2),(7,5),(1,6)]:
    t=[ini+r*i for i in range(5)]; seqs.append((t,t[-1]+r))
for ini,r in [(2,2),(3,2),(1,3),(2,4),(5,3)]:
    t=[ini*(r**i) for i in range(5)]; seqs.append((t,t[-1]*r))
for ini in [10,13,17,20,25]:
    t=[ini-i for i in range(4)]+[None]; seqs.append((t_t:=[ini-i for i in range(4)], t_t[-1]-1))

# ---- +15 sequências (completa 30) ----
for ini,r in [(1,7),(4,9),(6,11),(9,4),(12,6)]:
    t=[ini+r*i for i in range(5)]; seqs.append((t,t[-1]+r))
for ini in [200,150,101,64,30]:
    t=[ini, ini//2, ini//4, ini//8]; seqs.append((t,t[-1]//2))
for base in [1,2,4,5,6]:
    t=[base**k for k in range(1,5)]; seqs.append((t,t[-1]*base))

for t,nx in seqs:
    add("seq", "Próximo: "+",".join(str(x) for x in t)+",?", nx)

# ---- 30 lógica (determinística) ----
log=[("Se hoje é terça-feira, que dia da semana será daqui a 10 dias?",["sexta","sexta-feira"]),
("Quantos meses do ano têm 31 dias?",[7,"sete"]),
("Quantos lados tem um hexágono?",[6,"seis"]),
("Um relógio marca 15h. Que horas marcará daqui a 9 horas (0-23)?",[0,"zero","0h"]),
("Se 3 canetas custam R$12, quanto custam 5 canetas?",[20,"R$20"]),
("Ana é mais velha que Bia e Bia é mais velha que Carla. Quem é a mais nova?",["carla"]),
("Quantos minutos tem 1 hora e meia?",[90,"noventa"]),
("Numa fila, João é o 5º. Quantas pessoas estão à frente dele?",[4,"quatro"]),
("Quantos dias tem uma semana e meia?",[10.5,"10,5","onze"]),
("Um carro faz 10 km por litro. Quantos litros para 250 km?",[25,"vinte e cinco"]),
("Quantos segundos tem 2 minutos?",[120,"cento e vinte"]),
("Se um livro tem 300 páginas e leio 60 por dia, em quantos dias termino?",[5,"cinco"]),
("Quantas patas têm 7 galinhas?",[14,"quatorze"]),
("Quantos ovos há em 3 dúzias?",[36,"trinta e seis"]),
("Um triângulo tem quantas diagonais?",[0,"zero"]),
("Quantos cantos tem um cubo?",[8,"oito"]),
("Se A>B e B>C, A é maior que C? sim/nao",["sim"]),
("Todos os gatos são mamíferos. Mimi é gato. Mimi é mamífero? sim/nao",["sim"]),
("Nenhum peixe voa. Sardinha é peixe. Sardinha voa? sim/nao",["nao","não"]),
("Você ultrapassa o 3º colocado. Em que posição fica?",[3,"terceiro","3º"]),
("Quantas metades há em 3 pizzas?",[6,"seis"]),
("Quanto é o dobro de 37?",[74]),
("Quanto é a metade de 90?",[45]),
("Se 1 kg custa R$8, quanto custam 2,5 kg?",[20,"R$20"]),
("Quantos números pares existem entre 1 e 10, inclusive?",[5,"cinco"]),
("Uma semana tem quantas horas?",[168]),
("Quantos dedos têm 5 mãos (sem contar o polegar)?",[20]),
("Se eu tenho R$50 e gasto R$37,50, quanto sobra?",[12.5,"12,50","12,5"]),
("Quantos dias tem fevereiro de 2028?",[29,"vinte e nove"]),
("Um elevador está no 3º andar e sobe 7. Em que andar fica?",[10,"décimo"])]
for q,g in log: add("logica",q,g)

# ---- 25 Brasil ----
br=[("Qual a capital de Sergipe?",["aracaju"]),("Qual a capital da Bahia?",["salvador"]),
("Qual a capital de Pernambuco?",["recife"]),("Qual a capital do Ceará?",["fortaleza"]),
("Qual a capital do Maranhão?",["são luís","sao luis"]),("Qual a capital do Piauí?",["teresina"]),
("Qual a capital do Rio Grande do Norte?",["natal"]),("Qual a capital da Paraíba?",["joão pessoa","joao pessoa"]),
("Qual a capital do Pará?",["belém","belem"]),("Qual a capital do Amazonas?",["manaus"]),
("Qual a capital de Minas Gerais?",["belo horizonte"]),("Qual a capital do Paraná?",["curitiba"]),
("Qual a capital de Santa Catarina?",["florianópolis","florianopolis"]),
("Qual a capital do Rio Grande do Sul?",["porto alegre"]),("Qual a capital de Goiás?",["goiânia","goiania"]),
("Qual a capital do Mato Grosso?",["cuiabá","cuiaba"]),("Qual a capital do Mato Grosso do Sul?",["campo grande"]),
("Qual a moeda do Brasil?",["real","r$"]),("Quantos estados tem o Brasil?",[26,"26 estados"]),
("Qual o maior estado brasileiro em área?",["amazonas"]),("Qual o rio mais extenso do Brasil?",["amazonas","rio amazonas"]),
("Em que região fica Sergipe?",["nordeste","nordeste brasileiro"]),
("Qual o oceano que banha o Brasil?",["atlântico","atlantico","oceano atlântico"]),
("Qual a capital do Espírito Santo?",["vitória","vitoria"]),
("Qual a capital de Alagoas?",["maceió","maceio"])]
for q,g in br: add("brasil",q,g)

# ---- 25 língua portuguesa ----
lp=[("Qual o feminino de 'ator'?",["atriz"]),("Qual o coletivo de lobos?",["alcateia"]),
("Quantas sílabas tem a palavra 'casa'?",[2,"duas"]),("Qual é a forma correta: 'menas' ou 'menos'?",["menos"]),
("Qual o superlativo de 'bom'?",["ótimo","otimo"]),("Qual o antônimo de 'alto'?",["baixo"]),
("Qual o plural de 'pão'?",["pães","paes"]),("Qual o plural de 'animal'?",["animais"]),
("Qual o aumentativo de 'casa'?",["casarão","casarao"]),("Qual a classe da palavra 'rapidamente'?",["advérbio","adverbio"]),
("Qual a classe da palavra 'cachorro'?",["substantivo"]),("Qual o antônimo de 'claro'?",["escuro"]),
("Qual o sinônimo de 'belo'?",["bonito"]),("Qual o plural de 'cidadão'?",["cidadãos","cidadaos"]),
("Qual a figura de linguagem em 'chorei um rio de lágrimas'?",["hipérbole","hiperbole"]),
("Qual a figura de linguagem em 'o vento sussurrava'?",["personificação","prosopopeia","personificacao"]),
("Quantas letras tem a palavra 'escola'?",[6,"seis"]),("Qual o feminino de 'cavalo'?",["égua","egua"]),
("Qual o masculino de 'abelha'?",["zangão","zangao"]),("Qual o plural de 'lápis'?",["lápis","lapis"]),
("A palavra 'feliz' é adjetivo ou substantivo?",["adjetivo"]),("Qual o antônimo de 'rápido'?",["lento","devagar"]),
("Qual o coletivo de peixes?",["cardume"]),("Qual o coletivo de aves?",["revoada","bando"]),
("Quantas sílabas tem 'paralelepípedo'?",[7,"sete"])]
for q,g in lp: add("lingua",q,g)

# ---- 25 inglês ----
en=[("Translate to Portuguese: 'book'",["livro"]),("Translate to Portuguese: 'water'",["água","agua"]),
("Past tense of 'go'?",["went"]),("Plural of 'child'?",["children"]),
("Translate to Portuguese: 'house'",["casa"]),("Translate to Portuguese: 'friend'",["amigo","amiga"]),
("Past tense of 'eat'?",["ate"]),("Comparative of 'good'?",["better"]),
("Translate to English: 'cachorro'",["dog"]),("Translate to English: 'escola'",["school"]),
("Plural of 'mouse'?",["mice"]),("Translate to Portuguese: 'today'",["hoje"]),
("Translate to Portuguese: 'always'",["sempre"]),("Past tense of 'buy'?",["bought"]),
("Superlative of 'big'?",["biggest"]),("Translate to English: 'cidade'",["city"]),
("Translate to Portuguese: 'brother'",["irmão","irmao"]),("Plural of 'person'?",["people","persons"]),
("Past tense of 'see'?",["saw"]),("Translate to Portuguese: 'yellow'",["amarelo"]),
("Translate to English: 'livro'",["book"]),("Translate to Portuguese: 'night'",["noite"]),
("Past tense of 'come'?",["came"]),("Translate to English: 'água'",["water"]),
("Comparative of 'easy'?",["easier"])]
for q,g in en: add("eng",q,g)

# ---- 25 mundo (fatos estáveis) ----
mu=[("Qual a capital da França?",["paris"]),("Qual a capital da Itália?",["roma","rome"]),
("Qual a capital do Japão?",["tóquio","toquio","tokyo"]),("Qual a capital da Argentina?",["buenos aires"]),
("Qual é o símbolo químico do ouro?",["au"]),("Qual é o símbolo químico da água?",["h2o"]),
("Qual o planeta mais próximo do Sol?",["mercúrio","mercurio"]),("Quantos planetas tem o Sistema Solar?",[8,"oito"]),
("Qual o maior planeta do Sistema Solar?",["júpiter","jupiter"]),("Qual o oceano mais extenso?",["pacífico","pacifico"]),
("Qual o maior deserto do mundo?",["antártico","antartico","saara","sahara"]),
("Quantos continentes existem?",[6,"seis","7","sete"]),("Qual a capital dos Estados Unidos?",["washington","washington dc"]),
("Qual a capital de Portugal?",["lisboa"]),("Qual a capital da Espanha?",["madri","madrid"]),
("Qual é o metal líquido à temperatura ambiente?",["mercúrio","mercurio"]),("Qual gás as plantas absorvem?",["gás carbônico","gas carbonico","co2","dióxido de carbono"]),
("Quantos ossos tem o corpo humano adulto?",[206,"206 ossos"]),("Qual o maior animal do mundo?",["baleia-azul","baleia azul"]),
("Quem escreveu 'Dom Casmurro'?",["machado de assis"]),("Quem pintou a Mona Lisa?",["leonardo da vinci","da vinci"]),
("Qual a unidade de força no SI?",["newton"]),("Qual o valor aproximado de pi?",[3.14,"3,14","3.1416","3,1416"]),
("Quantos lados tem um triângulo?",[3,"três","tres"]),("Qual o idioma falado no Japão?",["japonês","japones"])]
for q,g in mu: add("mundo",q,g)

assert len(itens)==200, len(itens)
json.dump({"v":1,"criado":"2026-10-27","total":len(itens),"itens":itens}, open('/home/user/chat-work/bench/banco200.json','w'), ensure_ascii=False, indent=1)
import collections
print(len(itens), collections.Counter(i['tipo'] for i in itens))
