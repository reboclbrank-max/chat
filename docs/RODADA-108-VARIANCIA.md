# Rodada 108 — as "5 falhas de fato" não são 5 falhas: são variância, e agora está medido

Continuação da 107. O que faltava não era outra tentativa de prompt: era **poder de medição**.
Esta rodada rodou uma janela com o dobro de poder, mediu uma terceira intervenção e, com todas as
gravações do repositório (672 respostas), respondeu a pergunta certa: o defeito é sistemático ou
intermitente?

## 1. Janela de maior poder (144 respostas, 72 pares)

36 itens × 2 repetições por lado, ordem contrabalanceada por hash, cooldown compartilhado entre os
lados (`bench/medir-potencia-107.js`, resultado em `bench/resultado-cadeia-107.json`).

Intervenção testada: **cadeia parte → todo** ("descreva a parte elementar, o conjunto em que ela é
usada e o uso final") — a hipótese saiu dos próprios dados: #22 explicava a célula e parava antes do
painel; #16 ficava na gota e no telhado e não chegava à captação/tratamento.

| | A | B |
|---|---|---|
| acertos | 62/72 (86,1%) | 58/72 (80,6%) |
| diferença | — | **−5,6 pontos**, IC95% [−17,7; +6,6] |
| pareado | A erra/B acerta = 6 · A acerta/B erra = 10 | McNemar exato **p = 0,45** |
| latência mediana | 10,4 s | 12,2 s (+17%) |

**Veredito: recusada.** Não só não melhorou: a estimativa pontual ficou negativa, e o intervalo de
confiança atravessa zero. É a terceira intervenção de prompt medida e recusada (busca viva +1,
concretude +1, cadeia −6).

## 2. O que os dados mostram quando são somados

`bench/diagnostico-fatos-107.js` junta **todas** as gravações do repositório — 41 arquivos,
**672 respostas**, 7 janelas, os dois lados — e re-avalia cada texto com a régua atual:

| item | gerações | falta de fato | taxa |
|---|---|---|---|
| original #22 (energia solar) | 40 | 12 | **30%** |
| original #16 (água até a torneira) | 40 | 12 | **30%** |
| original #24 (dormir) | 16 | 4 | 25% |
| novo #206 (manguezais) | 16 | 3 | 19% |
| original #6, #9 | 16 cada | 2 cada | 13% |
| original #3, #15, #11, #14 | 16–40 | 1 cada | 6–8% |

- **Nenhum item falha o fato em ≥50% das gerações.** Não existe falha sistemática.
- **26 dos 36 itens nunca faltaram um fato** em nenhuma gravação.
- No total, 41 respostas de 232 desses itens (17,7%) deixaram algum fato de fora.

Ou seja: o que nas rodadas 104–105 apareceu como "5 falhas de fato" era **observação de uma geração
só**. #22 e #16 erram em ~3 de cada 10 gerações; os outros oito itens erram em 1 de cada 8 ou menos.
Isso é variância de geração de modelo gratuito, não um defeito que uma instrução corrija — e explica
por que três intervenções diferentes deram +1, +1 e −6.

## 3. Por que nenhuma intervenção de prompt funciona

O mesmo código, medido em janelas diferentes, produziu:

| janela | A | B |
|---|---|---|
| 102 | 37/44 | 34/44 |
| 103 | 38/44 | 38/44 |
| 104 | 40/44 | 33/44 |
| 105 | 39/44 | 38/44 |
| 106 fonte viva | 39/44 | 40/44 |
| 106 concretude | 34/44 | 35/44 |
| 107 alta potência | 62/72 (≈38/44) | 58/72 (≈35/44) |

A dispersão **entre janelas do mesmo código** (34 a 40 de 44) é maior que qualquer efeito medido.
Com 44 itens e uma repetição, o instrumento não distingue +1 de sorte — foi por isso que a janela de
144 respostas foi necessária, e ela mostrou que a diferença real está dentro do intervalo.

## 4. O que foi entregue de fato

Nada foi ligado "porque parece melhor". O que fica no repositório:

- `bench/medir-potencia-107.js` — janela de 144 respostas, aceita qualquer candidato por variável de
  ambiente, retomável;
- `bench/analisar-potencia-107.js` — pareamento item a item, McNemar exato e IC95% da diferença;
- `bench/diagnostico-fatos-107.js` — taxa de falta de fato por item somando todas as gravações;
- a régua corrigida na rodada 107 (5 equivalências com fonte, motivo e negativo rejeitado).

## 5. O próximo degrau, e por que não foi dado hoje

Reduzir variância exige **mais de uma geração por resposta** (duas amostras e escolha/voto), não
outra instrução. O roteador já tem modo de consenso desligado em perguntas leves; ligá-lo é mudança de
produto com custo (2× chamadas) e precisa da mesma janela de 144 respostas para ser justificada.
Fica declarado como o próximo experimento, com o instrumento pronto — não como promessa.

## 6. Barreira

`npm test`: **110/110** executados (3 ignorados por pré-requisito local) — comportamento 26/26 ·
misto 34/34 · estática 50/50. Nenhuma mudança de produto nesta rodada: só instrumento, medição e
documentação.
