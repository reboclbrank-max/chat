# Rodada 107 — as 5 falhas de fato: duas janelas pareadas e a correção da régua

Pedido: resolver as 5 falhas de fato. Esta rodada fez o que faltava — **medir a resposta**, não a
fonte — e descobriu que parte da "falha do produto" era falha da régua.

## 1. Janela A/B: a busca viva resolve? Não.

Mesmo código, mesma régua, 44 itens, única variável = busca viva com portão (`bench/medir-fonte-viva-pareado.js`,
resultado em `bench/resultado-fonte-viva-106.json`).

| | A (sem fonte) | B (com fonte) | diff |
|---|---|---|---|
| total | 39/44 | 40/44 | **+1** |
| ganhos / derrotas | — | 3 / 2 | — |
| mediana de latência | 9,4 s | 12,9 s | **+37%** |
| respostas com fonte citada | 0 | 20/44 | — |

+1 está dentro do ruído de 3 pontos do instrumento, com 37% mais latência e duas derrotas no mesmo
item (#16). **Veredito: a busca viva não demonstrou ganho → não foi ligada por padrão** (fica em
`fontes:'vivo'` / `CHAT_FONTE_VIVA=1`, do mesmo jeito que a base estática).

## 2. Janela A/B: instrução de concretude resolve? Não.

Instrução genérica de qualidade ("nomeie origem, etapas e destino; nomeie os componentes; nomeie o
efeito concreto"), que se cala quando o pedido pede linguagem simples
(`bench/candidato-concretude-106.js`, resultado em `bench/resultado-concretude-106.json`).

| | A | B | diff |
|---|---|---|---|
| total | 34/44 | 35/44 | **+1** |
| ganhos / derrotas | — | 5 / 4 | — |

De novo +1, de novo dentro do ruído. **Não foi publicada.**

Observação importante das duas janelas: os provedores gratuitos variam muito entre janelas (a
mesma dupla de código mediu 39/40 numa janela e 34/35 na seguinte). Com esse ruído, um efeito de
+1 ou +2 não é demonstrável com 44 itens e uma repetição.

## 3. O que as duas janelas NÃO explicavam: a régua cobrava a palavra

Ao ler os textos reprovados por "falta fato", apareceu o padrão:

| item | fato exigido | o que a resposta dizia |
|---|---|---|
| #22 energia solar | `painel\|placa` | "módulos solares", "célula fotovoltaica agrupada em módulos" |
| #16 água até a torneira | `tratamento\|estação` | "ETA" (sigla de Estação de Tratamento de Água) |
| #16 água até a torneira | `rio\|represa\|reservatório` | "aquíferos e córregos que servem de manancial" |
| #13 vacina | `antígeno\|vírus\|bactéria` | "patógeno", "microrganismo causador" |
| #14 função | `parâmetro\|entrada\|argumento` | "receber informações, como um nome" (pedido era **sem jargão**) |
| #17 redes sociais | `isolamento\|ansiedade\|saúde mental` | "autoestima", "dependência de validações" |

Em todos esses casos a resposta **diz o fato** e a régua reprovava por vocabulário. O caso do #14 é
o mais gritante: o pedido é "para quem nunca programou" e a régua exigia a palavra técnica.

Cinco equivalências entraram em `bench/equivalencias-rubrica.js`, cada uma com **fonte, motivo,
exemplo positivo e exemplo negativo** (o negativo é obrigatoriamente rejeitado pelo teste):

| id | tipo | âncora que impede palavra solta |
|---|---|---|
| `eta-estacao-de-tratamento` | FATO | exige contexto de água/saneamento — "ETA de entrega" não passa |
| `manancial-corrego-riacho-aquifero` | FATO | exige contexto de água/captação |
| `patogeno-microrganismo` | FATO | exige contexto de vacina/imunidade |
| `entrada-em-linguagem-simples` | MORFOLOGIA | exige contexto de função/programa |
| `efeito-psicologico-redes` | FATO | exige contexto de rede social |

## 4. Efeito da correção — aplicada aos DOIS lados

`bench/reavaliar-equivalencias.js` re-pontua todos os textos gravados com a régua atual. Nenhum
lado é beneficiado: a mesma régua vale para A e B.

| janela | A antes → depois | B antes → depois |
|---|---|---|
| 102 | 37 → 40 | 34 → 40 |
| 103 | 38 → 39 | 38 → 38 |
| 104 | 40 → 40 | 33 → 33 |
| 105 | 39 → 39 | 38 → 38 |
| 106 (fonte viva) | 39 → 39 | 40 → 40 |
| 106 (concretude) | 34 → 34 | 35 → 36 |
| **total (264 respostas por lado)** | **227 → 231 (+4)** | **218 → 225 (+7)** |

11 respostas que constavam como "falha de fato" **estavam certas**: 4 de #22, 2 de #14, 2 de #3,
1 de #13, 1 de #16, 1 de #17.

## 5. O que continua reprovado por fato (e é real)

Depois da correção, os itens que ainda falham por fato, somando as 6 janelas:

| item | ocorrências | por quê |
|---|---|---|
| #22 energia solar | 11 | a resposta fala só de célula e nunca nomeia painel/módulo |
| #16 água até a torneira | 10 | a resposta fica na infiltração/calha e não chega à captação e ao tratamento |
| #3 Revolução Industrial | 3 | falta o século/Inglaterra em algumas gerações |
| #6 reciclagem, #24 dormir, #9 juros, #11 azul, #15 LGPD, #206 manguezais | 1–2 cada | omissão real do fato pedido |

Essas são omissões de conteúdo, não de vocabulário — e as duas janelas mostraram que nem fonte nem
instrução as movem de forma demonstrável com 44 itens e uma repetição.

## 6. Veredito honesto desta rodada

- **Régua corrigida e medida**: 11 respostas reclassificadas, com fonte e teste por equivalência.
  Isso não melhora as respostas — melhora a medição delas. Antes a régua punia resposta certa.
- **Produto**: nada foi ligado. Busca viva e instrução de concretude mediram +1 cada, dentro do
  ruído, e ficaram de fora. Ligar por "parece melhor" seria exatamente o que o histórico deste
  repositório já custou caro.
- **O que falta para fechar a lacuna de fato**: poder de medição. Com desvio de 3 pontos, um efeito
  de 1–2 exige mais repetições por item (ou mais itens), não mais uma ideia de prompt. O caminho
  está aberto e medido: `bench/medir-fonte-viva-pareado.js` roda uma janela em ~45 min e aceita
  qualquer candidato por variável de ambiente.

## 7. Barreira

`npm test`: **110/110** executados (3 ignorados por pré-requisito local) — comportamento 26/26 ·
misto 34/34 · estática 50/50. As equivalências têm 13 contratos próprios, incluindo a exigência de
que o exemplo negativo de cada uma seja rejeitado. O hash de `bench/equivalencias-rubrica.js` está
preso no teste `medicao-pareada.js` e foi trocado à mão, com o motivo registrado no código.
