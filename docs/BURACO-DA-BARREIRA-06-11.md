# O buraco que só a medição mostrou: merge do robô não acorda a barreira

O mesclador mescla com o **token do robô** (`GITHUB_TOKEN`). Fato da plataforma, conferido
aqui: **evento gerado pelo `GITHUB_TOKEN` não abre execução de workflow** — com exceção de
`workflow_dispatch`. Ou seja: a barreira **não rodava na `main` depois de um merge do
mesclador**.

Medido, não suposto. A `main` tem o merge `[mesclador]` `6cec24c20d` (00:18). A lista de
execuções da barreira com evento `push` na `main` mostra `deda472e92` (00:10 — merge meu) e
`816a5d04f8` (00:36 — merge meu). **Não existe execução de push para `6cec24c20d`.**

Duas consequências, e a segunda é a grave:

1. a reversão automática escuta falha de `main` — se a `main` não roda, ela nunca tem o que
   escutar;
2. o texto mesclado sozinho **entrava sem passar pela barreira depois do merge**, e o item
   "Barreira de testes (main)" do vigia leria a última execução antiga e verde: ✅ enquanto a
   `main` estava sem teste.

Conserto, em duas peças:

| peça | o que faz |
|---|---|
| `avaliar` pede `POST /actions/workflows/testes-rapidos.yml/dispatches` com `ref: main` depois de mesclar | dispatch é a exceção que **funciona** com o token do robô |
| o job `reverter` aceita `workflow_dispatch` além de `push` | a reversão passa a ter o que escutar |

Se o pedido de barreira falhar, o merge **não** é desfeito (já aconteceu) — mas o log grita
`ATENÇÃO`, em vez de deixar o silêncio. Contrato em
`tools/testes/barreira-depois-do-merge.js` (4 casos, incluindo a ordem: merge primeiro,
pedido depois — pedir antes testaria a `main` velha).

O que **não** está provado: que a execução disparada por dispatch chegue a falhar de verdade e
acorde a reversão. Isso continua sendo o gatilho, e só um incidente real — ou um ensaio com
Actions ligadas — fecha essa parte.
