# Rodada 105 — formato de parágrafo corrigido, busca viva medida e recusada

Base: `main@b5b0e375`. Régua: os 44 itens já existentes (24 originais + 6 holdout + 6 novos +
8 repetições), sem item novo e sem afrouxar gabarito.

## 1. O defeito que estava aberto

Três itens ficaram declarados sem solução na rodada anterior. Esta rodada trata os três e
separa o que ficou resolvido do que continua em aberto.

| item | antes | agora |
|---|---|---|
| estrutura em parágrafos | reescrita pronta, mas sem efeito no caminho real | ✅ corrigido e medido |
| chave da Groq | sem prova de que a chave era usada | ✅ prova ponta a ponta |
| 5 falhas de fato | fonte viva desligada | ❌ medido, recusado com evidência |

## 2. Formato de parágrafo: causa e correção

**Causa 1 — regra que desistia.** `ajustarParagrafos` exigia `frases >= n*2` para quebrar em `n`
blocos. Com 4 frases e pedido de 3 parágrafos, desistia e devolvia bloco único. Era a origem de
`parágrafos (1<3)` e `parágrafos (2<3)`.

Agora a função reparte as frases de forma equilibrada (`base + resto`), exige apenas
`frases >= n` e **nunca cria texto**: se não houver frase suficiente, devolve o original.

**Causa 2 — formatação aplicada tarde.** O caminho rápido (uma chamada, `_gerar`) formatava o
texto só depois de já ter sido pontuado e comparado; o caminho de várias chamadas formatava
antes. Resultado: quando um texto inteiro chegava em bloco único, ele sempre perdia a comparação
e o produto gastava 2 ou 3 chamadas para produzir o mesmo conteúdo.

Agora existe um ponto único, `padronizarFormato`, aplicado **antes** de pontuar e de decidir se o
candidato já serve. Efeito medido no teste ponta a ponta: **1 chamada ao provedor** em vez de 3,
mesmo texto, 3 parágrafos (antes: 3 chamadas para repetir o mesmo bloco três vezes).

## 3. As duas travas que impedem "formatação" virar mentira

Repartir texto é arrumação de forma. Feito sem critério, vira alegação falsa de que a resposta
está completa. Duas travas, as duas descobertas por teste que já existia e quebrou com a mudança:

- **geração cortada não é repartida** — se faltou parágrafo na geração (`parcial`/`cortado`), o
  texto não é redistribuído: o leitor veria dois blocos e perderia o aviso de que metade da
  resposta não existiu (`aberto-recuperacao.js`);
- **texto abaixo do piso de conteúdo não é repartido** — menos de 90% do alvo de palavras (mesmo
  piso que o roteador já usa para considerar uma resposta completa) não vira "formatado":
  repartir 8 palavras em dois parágrafos só maquia resposta curta (`estado-aberto.js`).

Nenhum dos dois testes foi afrouxado; ambos passam sem alteração.

## 4. Antes → depois na mesma régua (re-pontuação dos textos gravados)

`bench/reavaliar-paragrafos.js` aplica só a transformação de formato, só no candidato (B), sobre
os textos já gravados. O controle (A) é re-pontuado com o código que ele executa.

| janela | A | B antes | B depois | itens que passam a passar |
|---|---|---|---|---|
| 105 | 39/44 | 38/44 | **39/44** | `B #101` (holdout) |
| 104 | 40/44 | 33/44 | **34/44** | `B #3 r2` |
| 103 | 38/44 | 38/44 | **39/44** | `B #101` (holdout) |

Conferência palavra a palavra: idêntico em 100% dos textos alterados (a única diferença é a linha
em branco entre blocos).

**Leitura honesta:** o ganho é de 1 item por janela. O ruído do instrumento é de 3 pontos (o mesmo
código mediu 37, 38, 40 e 39 em janelas diferentes), então **isto não é ganho de régua** — é a
mesma resposta deixando de ser reprovada por um defeito de forma que já estava consertado no
código e não chegava no texto entregue. O número sem as travas da seção 3 seria 40/44 e 36/44,
mas esses pontos vinham justamente de repartir respostas curtas e cortadas — pontos falsos, e por
isso não são reivindicados.

## 5. Prova ponta a ponta da rota com chave

`tools/testes/rota-com-chave-ponta-a-ponta.js` sobe um servidor HTTP local que imita
`/v1/chat/completions`. **13/13 contratos**, agora dentro do `npm test`:

- com chave: resposta entregue, `Authorization: Bearer <chave>` exato, modelo do catálogo no corpo,
  chave ausente do corpo da requisição;
- sem chave: **zero requisições** ao servidor, rota declarada indisponível, resposta vazia em vez
  de erro;
- chave recusada (401): sem texto e rota marcada como doente;
- parágrafos: texto de um bloco com frases suficientes sai em 3 parágrafos, sem perder nem
  acrescentar palavra, **em 1 chamada**.

## 6. Falhas de fato: a busca viva continua fora, agora com número e nome

`bench/medir-fontes-vivas.js` mede a **fonte**, não a resposta: para cada item, verifica se o
trecho trazido cobre os mesmos padrões de fato do gabarito (`contem`). Não mede se o modelo usa a
fonte — isso exige chave e está fora do alcance desta rodada.

| banco | base estática (hoje) | busca viva (Wikipédia) |
|---|---|---|
| originais (24) | 24/69 fatos · 6 itens completos | **35/69 · 9 completos** |
| holdout (6) | 7/18 · 1 completo | **3/18 · 1 completo** |
| novos (6) | 0/18 · 0 | **2/18 · 0** |
| total (36) | 31/105 · 7 | **40/105 · 10** |

O casamento foi reescrito nesta rodada: a consulta passou a ser a lista de termos (a busca da
Wikipédia é por título, não por pergunta), a escolha passou a ser do resultado que cobre mais
termos, e passou a exigir **cobertura no título** — o resumo cita a palavra de passagem e era por
isso que "caminho da água até a torneira" devolvia o artigo "Caminho".

Isso melhorou a cobertura (31 → 40 fatos de 105) e **não resolveu** o problema. Entre os 22
artigos aceitos, cinco estão claramente errados:

| pergunta | artigo escolhido |
|---|---|
| por que a Lua apresenta fases | **Super Mario Bros. 35** |
| como fazer um bolo simples | **Cakewalk** |
| efeitos da impermeabilização do solo | **Educação na cidade de São Paulo** |
| como uma bússola indica direções | Relógio de sol |
| diferença entre vírus e bactéria | Mycoplasma |

E o holdout piorou (7 → 3 fatos): o ganho não é uniforme.

**Veredito:** fonte viva continua `permitirVivo = false`. Injetar esses trechos no prompt
repetiria o defeito da rodada 102 (contexto errado virando resposta errada com aparência de
lastro). A função fica exportada, testada (7 contratos em `fonte-viva-casamento.js`) e medida.
Promover exige medir a resposta — chave — e um casamento semântico, não de palavras.

## 7. Limites desta rodada

- Sem chave, nenhuma melhoria de **conteúdo** pode ser medida no texto entregue; o que se mede aqui
  é forma, chamada, e cobertura da fonte.
- As três janelas (103, 104, 105) usam os mesmos 44 itens; o ruído de 3 pontos continua valendo.
- `bench/medir-fontes-vivas.js` depende da rede e da boa vontade do servidor da Wikipédia; 429 no
  meio da medição é registrado como "não medido", nunca como "recusado" (a primeira rodada contou
  23 nulos falsos antes de separar as duas coisas).

## 8. Barreira

`npm test`: **110/110** executados (3 ignorados por pré-requisito local) — comportamento 26/26 ·
misto 34/34 · estática 50/50.
