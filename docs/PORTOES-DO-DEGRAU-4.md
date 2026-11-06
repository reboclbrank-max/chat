# Os quatro portões do degrau 4

Cada portão tem **número**, não adjetivo. O comando `node tools/portoes.js` mede todos e diz
quantos estão abertos. Enquanto um portão estiver fechado, o nível fica onde está.

```
🚪 Portões do degrau 4 — 1/4 abertos (nível atual: texto)
   ✅ portão 1 — barreira confiável: ...
   ⛔ portão 2 — julgamento com evidência: poucos registros: 0 de 30
   ⛔ portão 3 — faixa de código e volta: lista de código liberado vazia · reversão nunca exercitada
   ⛔ portão 4 — mais de um arquivo: portão 3 ainda fechado
```

| portão | pergunta | como fecha | medido por |
|---|---|---|---|
| **1** | a barreira merece ser o juiz? | termômetro aprovado: ≥20 execuções, ≥90% verde, sem falha recente, sem instabilidade pendente | `tools/termometro-barreira.js` |
| **2** | o julgamento da máquina se sustenta? | **≥30 registros** (dos quais **≥10 ao vivo**) e **zero incidente** — nenhuma `main` vermelha num commit que o degrau 4 teria mesclado | `tools/sombra.js` + `tools/portoes.js` |
| **3** | faixa de código e volta existem? | lista de código liberado com ≤2 arquivos, **reversão exercitada por caso real**, ensaio com prazo preparado | `autonomia.json` (fatos declarados) |
| **4** | aguenta mais de um arquivo? | lista de 3–5 arquivos e **um mês sem incidente** | idem |

## O que é medido e o que é declarado

- **Portões 1 e 2 são medidos por máquina.** Ninguém precisa lembrar, argumentar ou confiar.
- **Portões 3 e 4 dependem de fatos declarados** (`autonomia.json → portoes`), porque são coisas
  que aconteceram ou não na vida real: a reversão já foi exercitada? já passou um mês?
  O mecanismo **não pode marcar a própria declaração** — só gente marca.

## Modo sombra — como o portão 2 ganha número

A cada PR que passa pela barreira, o sombra anota duas respostas e **não faz nada**:

1. **hoje** (nível `texto`): mesclaria? — é o que o mesclador já faz;
2. **degrau 4**: mesclaria? — faixa hipotética: entra tudo que **não** está na lista do que pode
   calar a casa; arquivo essencial continua barrado até no exercício.

Cada registro guarda a PR, os arquivos, os arquivos essenciais que barraram, o veredito nos dois
níveis, o resultado da barreira e o **commit do merge**. Com esse último campo, o portão 2 ganha
a conta que importa:

> de cada commit que o degrau 4 teria mesclado, quantos terminaram com a `main` vermelha?

Essa é a única medida de "o julgamento da máquina presta". O resto é opinião sobre a opinião.

O registro vai para o ramo `sombra/registro`, nunca para a `main`, e não interfere em nada:

```
node tools/sombra.js ler
🌓 Modo sombra — 42 registro(s)
   barreira verde: 40 · vermelha: 2
   o degrau 4 teria mesclado: 31 (74%)
   barradas por arquivo essencial: 11
   essenciais mais vistos: tools/email-chat.js (4), .github/workflows/email.yml (2)
```

## O histórico também é evidência (mas não é tudo)

O sombra sabe aplicar o mesmo julgamento ao que **já aconteceu**: `node tools/sombra.js historico`
percorre as PRs já mescladas, calcula o veredito do degrau 4 e confere se a `main` ficou vermelha
naquele merge. Não é simulação — os merges aconteceram e as consequências também.

Primeira medição (05/11, 39 registros: 3 ao vivo + 36 do histórico):

```
barreira verde: 38 · vermelha: 1
o degrau 4 teria mesclado: 24 (62%)
barradas por arquivo essencial: 15
essenciais mais vistos: tools/email-chat.js (5), tools/vigia-casa.js (4), index.html (3)
incidentes: 0
```

Duas leituras honestas:

1. **Zero incidente** nas 24 que o degrau 4 teria mesclado — primeiro sinal real de que o
   julgamento não é suicida.
2. **62% de aceitação** não é 100%: mais de um terço continuaria pedindo gente, porque toca
   arquivo essencial. O degrau 4 nunca foi "máquina sozinha" — é "máquina na faixa estreita".

Por que o portão não abre só com histórico: uma fotografia do passado não prova que o
mecanismo que está na `main` **hoje** funciona. Daí o mínimo de 10 registros ao vivo.

## ⏳ Prazo: autonomia que expira sozinha

`autonomia.json` aceita `"expira_em": "2026-12-01"`. Passada a data, o nível cai para
`desligado` sem ninguém precisar lembrar. É o que impede o pior tipo de esquecimento:
ligar para testar e ficar ligado.

## O primeiro arquivo da faixa (portão 3, 05/11)

`tools/indice-capacidade.js` é o **primeiro** — e por enquanto único — arquivo autorizado ao
degrau 4. O critério não é "parece inofensivo":

| exigência | como atende |
|---|---|
| contrato próprio | `tools/testes/indice-capacidade.js`, roda na barreira |
| nenhum efeito externo | lê arquivos locais; não fala com credencial nem publica estado |
| erro chato e visível | o pior caso é um placar em markdown errado, no próprio documento |

Todo o resto continua fechado. E o mapa passou a respeitar a lista que o **próprio turno de
e-mail já declara** como crítica (`email-poll.js`, regex `CODIGO`): `pulso-vigia`,
`reserva-turno`, `falhas-mensagem`, `turno-liveness`, `geografia-brasil`, `telegram-chat` e os
`.py` de visão. Se o turno protege, o mesclador também protege — sem adivinhação por prefixo.

## O ensaio da reversão (feito em 05/11)

A reversão nunca tinha rodado de ponta a ponta: em produção ela morreu no 403 descrito
acima. Então foi exercitada num **repositório descartável de verdade**, criado só para isso
e apagado depois:

| passo | resultado |
|---|---|
| mesclador avaliou a PR de ensaio | `mesclou #1 (na faixa do nível texto: 1 arquivo)` |
| reversão com o commit do merge | `PR de reversão #2 aberta (reversao/mesclador-f8e043b313)` |
| merge da reversão | `docs/ensaio.md` removido, `main` de volta ao estado anterior |

**O que isso prova:** criar ramo, restaurar/remover conteúdo e fechar a volta — a parte que
podia estar quebrada e estava.
**O que não prova:** o gatilho em produção (`workflow_run` de `main` vermelha). O pior caso
dele é conhecido e já coberto: o vigia acusa `barreira-vermelha` e avisa o dono — isto é, o
sistema degrada para o degrau 3 de hoje, não para o silêncio.

O caminho do 403 (repositório que proíbe PR de Actions → merge do ramo na `main`) está
coberto por contrato com um GitHub de mentira: `tools/testes/reversao-caminho-do-403.js`.

## Como rodar o ensaio com prazo (quando o portão 3 abrir)

1. marcar em `autonomia.json`: `"nivel": "codigo"` **e** `"expira_em": "<data ISO>"`;
2. manter a lista `LIBERADOS_PARA_DEGRAU_4` com no máximo 2 arquivos;
3. declarar `portoes.ensaioComPrazo: true` — e `reversaoExercitada: true` só depois de a
   reversão ter rodado num caso real;
4. acompanhar com `node tools/portoes.js` e `node tools/painel.js`.

O `expira_em` é a rede embaixo do trapézio: passada a data, o nível cai para `desligado`
**sem ninguém precisar lembrar**. Nível `codigo` sem prazo não é proibido, mas o interruptor
avisa (`semPrazo`) justamente porque ensaio sem fim marcado é o começo de autonomia
esquecida.

## Ordem de abertura

```
portão 1  →  portão 2  →  portão 3 (1 arquivo + prazo)  →  portão 4 (3–5 arquivos)
```

Nenhum portão abre por tempo de espera, por cansaço ou por "já está bom". Cada um tem uma
frase que diz **por que** está fechado — e é essa frase que vira tarefa.
