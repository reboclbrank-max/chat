# Rodada 96 — o texto aberto saiu de 62,5% para 91,7% (e a razão não era o modelo)

Data: 28/10/2026 · Código: `chat-v2/roteador-ia.js` · PR **#35**
Régua usada: `bench/banco-aberto.json` (24 pedidos longos), **a mesma** da rodada 94 — mesmo banco, mesma rubrica, medido no mesmo dia.

---

## 1. O número, na mesma régua

| régua aberta (24 pedidos) | antes (manhã de hoje, código da 95) | depois (rodada 96) |
|---|---|---|
| **aprovados** | **15/24 = 62,5%** | **22/24 = 91,7%** |
| cortados pelo teto do provedor | 5 | **0** |
| curtos (menos palavras do que o pedido) | 4 | **0** |
| faltou um fato exigido | 4 | **2** |
| mediana de palavras | 113 | 168 |
| mediana de tempo | 53,9 s | 84,0 s (**pior — ver §5**) |

Mesma rubrica: o texto é aprovado se tem o número de parágrafos pedido, o mínimo de palavras, termina a frase e cobre os fatos exigidos. Nada foi afrouxado; a rubrica não mudou uma vírgula.

---

## 2. A causa raiz: eu pedia o texto inteiro numa chamada só

O pedido *"explique em dois parágrafos o que é fotossíntese"* ia ao modelo assim: um `max_tokens: 1800`, uma resposta, e reza. O que voltava:

- **metade dos casos**: um bloco só, 30 palavras, sem parágrafo nenhum;
- **a outra metade dos casos ruins**: 100+ palavras **cortadas no meio da frase**, porque o provedor grátis corta em `finish_reason: length`.

O erro de arquitetura é evidente depois de medido: **parágrafo não é uma unidade que se pede de brinde dentro de um texto maior — é uma unidade de trabalho**. Um provedor grátis, com teto de tokens apertado, cumpre bem um pedido pequeno e cumpre mal um pedido grande.

### O que passou a acontecer

1. **Um parágrafo por chamada.** O roteador lê do pedido quantos parágrafos foram exigidos, e pede **"escreva SOMENTE o parágrafo 2 de 3, com 45 a 85 palavras, em 3 a 5 frases completas"**. Cada resposta cabe folgada no teto, então não há corte. O número de parágrafos é exato **por construção**, não por sorte.
2. **O parágrafo ruim é refeito sozinho.** Se o parágrafo 2 sai curto, só ele é refeito — não se joga o texto inteiro fora (era o que acontecia antes: uma tentativa, um texto, tudo ou nada).
3. **Foco diferente por posição.** Primeiro parágrafo define e dá exemplo concreto; os seguintes aprofundam um aspecto novo e citam um detalhe concreto (nome, número, processo); o último fecha com conclusão completa. Sem isso, os parágrafos repetiam a mesma frase de abertura.
4. **Lista com N itens = N chamadas.** *"Lista com 5 dicas"* voltava com **1 item** (medido: id 10). Agora é um item por chamada, numerado, com 12–30 palavras, e a numeração é aplicada por mim, não pedida ao modelo.
5. **Fechar no último ponto final.** Se o texto ainda termina no meio de uma frase, o roteador corta a sobra até o último `.!?` já escrito. Isso **não inventa conteúdo** — descarta a sobra. Foi o que zerou os "cortados": 5 → 0.
6. **Os termos do pedido voltam para dentro da instrução.** O pedido nomeia o que quer ver ("torneira", "painel", "LGPD"). Os termos concretos são extraídos e repetidos na instrução de cada parágrafo. Foi o que fez o item do caminho da água (que pedia "torneira") passar.
7. **Folga no alvo.** O modelo entrega menos do que promete; o alvo por parágrafo passou a ser `mínimo/N + 8` palavras. O caso *"55 palavras para um pedido de 60"* deixou de acontecer.

---

## 3. O que sobrou — nomeado item a item

| # | pedido | o que faltou | diagnóstico honesto |
|---|---|---|---|
| 4 | e-mail formal pedindo orçamento de 20 cadeiras | faltou **"Atenciosamente"** (despedida formal) | o texto está completo e termina bem; falta a **convenção de fechamento de e-mail**. Instrução de formato, não conteúdo — é o próximo ajuste |
| 6 | parágrafo argumentando a favor da reciclagem | faltou **"ambient…"** | parágrafo bem formado, mas o argumento não citou a consequência ambiental. Falta instrução de "dado ou consequência concreta" em pedido argumentativo |

Os dois casos restantes são **conteúdo/convenção**, não truncamento. Os 7 outros tipos de falha que existiam (texto de 30 palavras, 1 parágrafo de 2, 1 item de 5, frase cortada, texto curto, parágrafo repetido, fato esquecido por falta de foco) **sumiram**.

---

## 4. A outra metade da rodada 96: perguntas curtas

Antes de atacar o texto aberto, a régua de 200 foi rodada com o código como estava e apareceram 5 falhas. Todas diagnosticadas item a item — e nenhuma era "o modelo é burro":

| # | sintoma medido | causa | correção |
|---|---|---|---|
| 71 | resposta `"Is it"` | resto de raciocínio devolvido como resposta | fragmento de palavras funcionais passa a ser **rejeitado** e a pergunta vai para outra rota |
| 187, 192 | resposta `"**"` | idem (marcação solta) | idem |
| 99 | "fevereiro de 2028 = **28**" | calendário perguntado ao modelo | calendário virou **rota local**: bissexto, dias do mês, dias do ano, dia da semana (aritmética exata, R$ 0, 0 ms) |
| 129, 146, 172 | sem resposta | 429 (cota) | quarta rodada de espera, limitada pelo orçamento de tempo |

Depois disso, as réguas de pergunta curta voltaram a **100%** — e a aritmética local mudou também a latência:

| régua | resultado | sem-resposta | 429 | mediana |
|---|---|---|---|---|
| 200 itens | **200/200 (100%)** | 0 | 0 | **952 ms** |
| holdout 105 (nunca vistos) | **105/105 (100%)** | 0 | 0 | 2,9 s |
| banco difícil 30 | **30/30 (100%)** | 0 | 0 | 2,9 s |
| código 18 (a função é **executada** contra testes) | **18/18 (100%)** | 0 | 0 | 6,9 s |
| vários saltos 18 | 18/18 (mantido da rodada 94) | 0 | 0 | — |

A mediana da régua de 200 caiu de ~2,0 s para **952 ms** porque `16×12` agora é conta local: antes o roteador esperava **8 s** de timeout do `api.mathjs.org` (que estava fora do ar) para então perguntar ao modelo — que respondeu `"× 12"`.

---

## 5. O limite honesto desta rodada

**Ponto forte novo:** texto aberto deixou de ser o buraco de 62,5% e virou 91,7%, sem chave paga, sem trocar de modelo.

**Ponto fraco novo, medido:** a mediana de tempo do texto longo **piorou de 53,9 s para 84,0 s**. A causa é direta: em vez de uma chamada, são N chamadas em série, com vazão mínima entre elas para não queimar cota. **Ganhei formato e perdi latência.** A correção óbvia — gerar os parágrafos em paralelo, um por rota, respeitando a cota de cada host — não foi feita porque mudaria o caminho que acabei de medir; fica como próximo passo com número próprio.

**O que continua não medido:** qualidade literária (a rubrica mede forma, tamanho e cobertura de fatos — não mede se o texto é bom), e visão (não há régua; não vou fingir que medi).

---

## 6. Tentativa que **não** funcionou (e está registrada)

Antes de chegar em 22/24, a primeira versão do gerador por parágrafo — só ele, sem lista item a item,
sem fechar no ponto final e sem os termos do pedido — deu **15/24**, o **mesmo** 62,5% de antes.
O formato melhorou (cortados 5→4, curtos 4→3) e a soma não mudou. Está salva em
`bench/resultado-aberto-paragrafos-v1.json`. O que virou o jogo foram os itens 4–7 do §2:
lista por item, fechar no ponto final, termos do pedido e folga no alvo.

Também tentei, e descartei, **afrouxar a rubrica** (contar parágrafo por linha simples em vez de bloco).
Ia inflar o número sem melhorar o texto — foi revertido antes de medir.

## 7. Prova

- `bench/resultado-aberto-v4.json` — 15/24 antes (código da rodada 95, medido hoje 11h)
- `bench/resultado-aberto-paragrafos-v1.json` — 15/24 (só parágrafo por chamada: cortados 5→4, curtos 4→3 — formato melhorou, soma não)
- `bench/resultado-aberto-depois.json` — **22/24** (parágrafo + lista + fechar + termos + folga)
- `bench/resultado-codigo-96.json` — **18/18 (100%)**, mediana 6,9 s
- `bench/resultado-gratis-banco{200,holdout,duro}.json` — réguas curtas (medir.js passou a gravar o
  nome do banco no arquivo: antes cada rodada **sobrescrevia** a prova da anterior)
- Barreira: **97/97** (`node tools/testes/roda-testes.js`), com 3 grupos novos de teste permanente: fragmento de raciocínio, calendário local, fecharTexto/instrução de parágrafo.
