# Rodada 139 — base lexical própria: o vocabulário deixou de depender de modelo

**Pedido:** *"Perfeito, melhore e deixe tudo ao ponto de não depender de nada."*
**Publicado:** `main` = **`5cb5f62`** (PR #66, squash) · Pages **200** · casca **`rebocl-chat-v106`** · `/lexico-pt.js` servido com **148 930 B**.

---

## O que ainda dependia de terceiro

No fim da rodada 138 o produto respondia **122 de 127** provas sem rede. As 5 (e depois 6) que sobravam eram todas da mesma família: **vocabulário** — sinônimo, antônimo, "qual não pertence", analogia. Elas só funcionavam porque um modelo remoto respondia.

A rodada 136 já havia testado o caminho óbvio e falhado: o OpenWordnet-PT acertou **0 de 5**. A conclusão da época foi "isso fica com o modelo". Esta rodada desfez essa conclusão.

## O que mudou

**1. Base lexical própria, construída no build e versionada no repositório.**
`tools/gerar-lexico-pt.js` monta a base a partir do **Wikcionário em português (CC BY-SA 4.0)**, para uma **lista geral** de palavras frequentes — não as palavras do teste (senão seria decorar a prova). Grava dois artefatos:

- `lexico-pt.json` — fonte, URL, licença e data **dentro do arquivo** (procedência viaja com o dado);
- `lexico-pt.js` — espelho de mesmo conteúdo, para entrar por `<script>` sem `fetch` em execução.

**1 502 palavras**· **148 KB** · chaves normalizadas sem acento · sinonímia, antonímia e primeira definição. Zero rede em execução: é arquivo do repositório, e o service worker o guarda no cache.

**2. Quatro solucionadores novos** (`razao-local.js`, bloco 39–42):

| solucionador | regra | exemplo medido |
|---|---|---|
| `sinonimo` | única opção que a base liga ao alvo, nos dois sentidos | "efêmero" → **passageiro** · "belo" → **bonito** |
| `antonimo` | mesma exigência, com antônimos | "curto" → **longo** · "alto" → **baixo** · "claro" → **escuro** |
| `naoPertence` | campo semântico declarado nas definições, com **famílias** (`móvel`+`mobiliário`); maioria = n−1 | cadeira/mesa/sofá/geladeira/estante → **geladeira** |
| `analogia` | relação **todo→parte declarada** na base, numerais filtrados | livro:capítulo :: sinfonia → **movimento** |

O ponto que importa não é acertar: é **calar**. Os quatro devolvem `null` quando a base não fecha a resposta, e há armadilha para cada um.

## Números medidos

| medida | antes (R138) | agora (R139) |
|---|---|---|
| provas respondidas por código, sem modelo | 122/127 | **131/133** |
| provas **erradas** | 0 | **0** |
| armadilhas | 43/43 | **47/47** |
| fio (mesma prova, duas vezes) | — | **131/131** |
| cobertura (solucionador com prova + armadilha) | 39/39 | **43/43** |
| robustez da reescrita | 301/304 | **301/304** (0 mudaram de resposta) |
| barreira rápida | 120/120 | **121/121** (3 ignorados por pré-requisito local) |
| fácil / difícil ao vivo | 29/29 · 18/18 | **29/29 · 18/18** |

Guarda: `✔ GUARDA: nada quebrado · provas 131/133 por código (0 erradas) · armadilhas 47/47 · fio 131/131 · cobertura 43/43 · reescrita 301/304 · regressão: nenhuma`
CI do PR #66: run **41254093665** → **success** antes do merge.

## As duas que ficaram — e por que ficaram

1. **`facil-ver1`** — analogia profissão → local de trabalho. A base não declara essa relação para todas as profissões; responder seria adivinhar.
2. **`facil-ver4`** — antônimo de "escasso". A base liga "escasso" a *numeroso*, não a *abundante* (a opção do gabarito). Escolher "abundante" seria chute com cara de acerto.

Ambas estão **declaradas** no medidor (`--fio` reporta 131/133 e nomeia as duas). Um produto que acerta 100% porque chutou é pior do que um que diz "isso eu não sei".

## Cala onde deve calar (medido)

`xilofone` · `escasso`×`abundante` · `rápido`×`veloz` · `casa`×`moradia` · grupo `sincero, honesto, leal, rápido` · `martelo:prego :: serrote:__` (instrumento→uso não está declarado) · `médico:hospital :: professor:__`.

## Auditoria de dependências, atualizada

`node tools/auditoria-dependencias.js` → **sem rede nenhuma o produto responde 131/133 com 0 respostas inventadas**. A base lexical agora aparece no inventário com fonte e licença; ela **não é host**, é arquivo — o oposto de dependência externa.

O que ainda depende de terceiro, com nome: **as duas provas acima** e **texto aberto** (conteúdo que exige fonte viva, por definição não se resolve local). Rotas: 19 em 5 hosts, 18 anônimas, 1 com chave opcional — inalterado.

## Guarda novo: `tools/testes/lexico-local.js` (6/6)

1. procedência: fonte, URL e licença dentro do arquivo;
2. espelho `.js` idêntico ao `.json`;
3. **zero rede**: base responde com `fetch` proibido;
4. página e casca carregam a base, na ordem certa, sem `fetch` em execução;
5. acerta o que a base sustenta;
6. **cala quando a base não sustenta**.

Registrado em `tools/roda-testes.js`; a barreira passou de 120 para **121/121**.

## Erros corrigidos nesta rodada (registro honesto)

- Teste antigo de `razao-local` exigia `null` para "efêmero" — a base nova passou a acertar. O esperado foi atualizado **porque o produto melhorou**, e o motivo está comentado na linha.
- `naoPertence` falhava em silêncio: as âncoras de campo eram planas e `cadeira`="mobiliário" caía em família diferente de `mesa`="móvel". Solução: famílias de sinônimos, não palavras soltas.
- `analogia` devolvia "quatro": numeral capturado como parte constituinte. Solução: filtro de numerais.
- `require('./lexico-pt.js')` resolvia para fora do repo (caminho `../`); `norm` não existia no escopo de `cobertura()`.
- `imapflow` faltava no clone → `npm install` é pré-requisito da barreira.

## O que isso significa

Antes: 15 de 127 provas verbais dependiam de modelo. Agora: **2**. A soberania saiu de promessa e virou arquivo: 1 502 verbetes com licença, dentro do repositório, servidos pelo service worker, respondendo com a rede desligada.

O limite é honesto e está escrito: são 1 502 palavras, não um dicionário. Palavra fora da base continua indo para o modelo — e o teste cobra que, nesse caso, o produto **não invente**.
