# Rodada 134 — o Chat passou a ditar o ritmo

`main` = **`eff1f31`** · PR **#61** (squash) · check `testes` **success** · Pages **success**

## O que você pediu

"Se **ele** ditar o ritmo e sugerir melhorias, o que vocês podem fazer e melhorar ainda mais?"

Até aqui **eu** apontava o próximo defeito. O Chat tinha baterias e números, mas nada convertia "o que falhou" em "o que consertar primeiro". Agora converte.

## `tools/auto-melhoria.js` — o auto-diagnóstico do próprio chat

1. roda as **47 provas** do próprio chat (`tools/provas-do-chat.json`, resposta conferida à mão em cada uma) pelo **caminho exato do produto** — sem modelo, sem rede;
2. classifica cada prova: **resolvida por código** · **depende do modelo** · **ERRADA**;
3. lê a medição de texto aberto salva em `bench/` e separa falha de **forma** de falha de **conteúdo**;
4. ranqueia a fila por ganho ÷ custo e imprime, item por item, **qual ação** corresponde;
5. grava tendência em `docs/auto-melhoria.json`.

**Guardas — testadas, não prometidas** (`tools/testes/auto-melhoria.js`, 6/6):
- toda prova é classificada (nada sobra sem conta);
- prova respondida **errada** pelo caminho exato **faz o teste falhar**;
- os arquivos de medição aparecem **todos**, com o número de cada um — não se escolhe o melhor placar escondido;
- a fila separa **mecânico** (conta/regra exata) de **conhecimento** (vocabulário) e **proíbe léxico sob medida para as provas** — isso seria ensinar para o teste.

## O que a fila mandou consertar — e foi feito

| lacuna apontada | conserto | prova |
|---|---|---|
| sequência de letras (mecânica) | `A, C, F, J, O → U`, exato | `razao-local.js` |
| ponto flutuante do JS (mecânica) | `0.1 + 0.2 === 0.3 → Não` | IEEE-754 |
| porcentagem em outra forma | "Qual é 37% de 200?" → **74** | `_ferramenta` |
| diferença entre datas | 1/jan → 1/mar/2026 → **59** | `calendarioLocal` |
| fatos estáveis | Austrália → Canberra · República → 1889 · Japão → iene | base local |

**33/47 → 40/47 provas resolvidas por código exato, sem modelo.** As 7 restantes são vocabulário (ver1–ver4, d9, d10) e geração de código (cod3) — declaradas como conhecimento/geração, não como conta.

## Tentado e revertido — com o motivo escrito no código

Um **portão final** que repartia resposta de 1 bloco em 2 quando o pedido era de dois parágrafos. Dois testes de produto barraram, e com razão:
- *"não descartar o trecho que deu certo"*;
- *"o aviso não pode adulterar o texto bruto"*.

Quando a geração é incompleta, o produto **entrega o texto como veio e avisa** ("1 de 2 parágrafos"). Repartir esconderia justamente a falta que a pessoa precisa saber. A lacuna ficou registrada no auto-diagnóstico com essa explicação, para ninguém tentar de novo.

## Prova

- Barreira **118/118** com 3 ignorados · `montar-paginas --verificar` sem divergência.
- `tools/testes/auto-melhoria.js` **6/6** (novo) · `recomeco-resgate-memoria.js` 24/24.
- Publicado: `tools/provas-do-chat.json` com **47 provas** e `tools/auto-melhoria.js` (**14 579 bytes**) no `main`; Pages **success**.
- `CONTINUIDADE.md` registra a rodada 134, inclusive a reversão.

## O que o motor já propõe como próximo (e por que não estou fazendo agora)

1. **Vocabulário verbal (6 provas)** — custo médio. Fazer léxico com as palavras exatas das provas seria ensinar para o teste; o caminho honesto é base de fatos com fonte, ou o modelo.
2. **Geração de código (1 prova)** — é do modelo; o roteador garante formato, não autoria.
3. **Texto aberto: conteúdo (2 provas)** — depende de fonte viva, medida na rodada 102 e **pior** que sem ela. Só volta com fonte confiável; é decisão de produto.
