# Rodada pareada de conversa — 2026-11-04 (tarefa do Chat A; revisão do Chat B)

Executor: Chat B. Medido e publicado por B, conforme pedido do A no canal (tarefa "M01 — instrumento de medição de conversa"): banco de 20 cenários conversacionais de 3+ turnos, medidor que reusa `pontuar.js` com contrabalanceamento do protocolo 102, comparando os dois montadores de contexto **no mesmo item**, com **chamada real de rota gratuita, fora da CI**. Resultado publicado com os dois lados, inclusive derrota — e **o pacote medido perdeu** (ver placar).

## O que foi medido

- **Versão A (truncado — montador antigo, pré-#76)**: `limpo.slice(-6)` (6 falas mais recentes, 400 chars cada) + `bloco.slice(-1200)` — corte seco no meio da fala, sem sinal. Cópia fiel do `montarContextoConversa` pré-#76 (`sed` das linhas 588–632 do `roteador-ia.js@1b62317be8`).
- **Versão B (completo — montador pós-#76/#77)**: fala truncada em 400 com `…`, janela das 6 falas mais recentes que couberem em 1200 chars, marcador `[Falas mais antigas omitidas pelo limite; não presuma seu conteúdo.]`. Código real: `Roteador` de `roteador-ia.js` (conteúdo do head `e2be4f8991` do PR #77, sha de conteúdo registrado em `resultado-conversa.json → meta.hashes.roteador`; o fix do #79 não toca montagem de contexto).
- **Tudo mais idêntico**: mesmo modelo/lado (requisições a `https://oi.felipefaria.space/v1/chat/completions`, `LADO_MODELO=*`, `escolherRota` real), mesmos prompts, mesma bateria, mesma ordem de itens.

## Banco — `bench/banco-conversa.json` (20 cenários, 3+ turnos cada)

Regra do A: **o turno final só é respondível com informação do turno 1** (chave). Cada cenário define `gabaritos` (grupos E/OU, matching estrito sobre o texto normalizado) e `proibir` (frases-decoy exclusivas, matching estrito). Três classes:

- **P — papéis (5)**: a chave aparece em fala de `tool`/`developer`. O montador antigo funde tudo em "Dono" (atribuição errada); o novo filtra (a chave some). Complemento: na frente da chave, o turno 1 traz um eco de ferramenta com dados-decoy da resposta ("aproveite: 480 premium…"), que só pode vazar se o modelo confiar naquele trecho como fala do usuário.
- **R — curta/baseline (8)**: conversa de 2–3 turnos; os dois montadores têm **contexto idêntico**. Só mede ruído de geração (as mesmas questões do A16: múltiplas viagens, ligações, soma, mudança de prefixo).
- **C — corte (7)**: a chave (emoji, número, nome próprio, prazo) fica na fronteira exata do `slice(-1200)`: o A a recebe cortada no meio (ex.: "🅿", "R$ 4.000", "Vento Nor"); o B não a recebe, mas **sinaliza a omissão** (que o gabarito aceita como resposta honesta). Itens desenhados para os dois desfechos: quando os dados cortados ainda permitem inferir (ou a cauda guarda o essencial), o A pode ganhar; quando não, só o B responde com honestidade.

Afinado com `PLANO_CONVERSA=1` (modo que só monta e verifica o regime, sem chamada): 6 rodadas até o regime final — chave caindo nos dois lados de A/B nos itens C, chave só em A nos P, contexto idêntico nos R. Detectores estritos (`casaEstrito`, com fallback literal para símbolos que normalizam vazio — lição do smoke: `normalizar('🚀')` = '').

## Rodada real (esta)

- 40 chamadas (20 itens × 2 versões), contrabalanceado 102 (A→B em itens ímpares, B→A nos pares), 2026-11-04T04:54:02Z → 05:15:04Z, 0 retomadas, `completo=true`, `invalido=false`.
- Chamadas reais fora da CI via roteador (rota `ovhoss20` e afins; latências 3,5 s–202 s conforme a rota gratuita do momento; 1 chamada por célula).
- Bruto auditável: `bench/resultado-conversa.json` (contexto efetivamente entregue por versão, resposta, pontuação, ms, rota).

## Placar — os DOIS lados

Retenção = responde com a chave do turno 1 (ou sinaliza a omissão, quando o gabarito aceita). Violação = repete o decoy que não devia. `ok` = reteve **sem** violar.

| Classe | retem A×B | violou A×B (menor é melhor) | ok A×B | pctOk A×B |
|---|---|---|---|---|
| P — papéis (5) | 5 × 5 | **1 × 0** | **4 × 5** | 80% × **100%** |
| R — curta (8) | 7 × 8 | 0 × 1 | 7 × 7 | 87,5% × 87,5% |
| C — corte (7) | **6 × 2** | 0 × 0 | **6 × 2** | **85,7%** × 28,6% |
| **Total (20)** | **18 × 15** | 1 × 1 | **17 × 14** | **85%** × 70% |

**O pacote A (truncado) venceu 17×14.** Derrota do B, publicada como pedido.

### O que cada classe mostrou (com os casos)

- **C — vitória do A (6×2), o motor do placar.** O `slice(-1200)` corta no meio da fala, mas **o pedaço cortado ainda carrega informação** — e o modelo completa o resto: "🅿" → "a vaga é P23", "R$ 4.000" → "R$ 4.000,00", "Vento Nor" → "Vento Norte", "garantia val" → "garantia vale 12 meses" (#12, #13, #15, #16). O B, com a mesma janela de 1200 chars mas em fala inteira, **cai a fala inteira e responde honestamente** ("não tenho os números", "não sei a vaga") — o gabarito aceita a honestidade, mas o item é retenção, e o A reteve. **Este é o trade real do PR #76: integridade e sinal em troca de retenção.** O B só venceu os dois casos em que o corte do A deixou literalmente nada recuperável (números-chave integralmente na fala fora da janela, #14 e #17 — e ainda assim o #17 o A "adivinhou" por eco do a1).
- **P — vitória do B (4×5), o único vazamento real.** #4: o A respondeu com os dados-decoy do eco de ferramenta ("480 premium", "Espaço Central") — **violação**; o B, que remove `tool`/`developer` do contexto, não tinha o decoy e não vazou. Nos outros 4 os dois reteram (a chave está numa fala `user` que ambos veem).
- **R — empate (7×7).** Contexto idêntico: o que sobrou é variação de geração da rota gratuita — #20 o A não confirmou o "7" (202 s de rota instável), #19 o B sugeriu "às 8h" apesar do "nada de 8h" no contexto. Ruído, não montador.

### Mecanismo, em uma frase

O janelamento novo ⊆ do antigo em chars brutos (mesma janela de 1200, mesma fita de falas): **o montador novo nunca traz mais conteúdo do turno 1 que o antigo** — o que ele ganha é integridade (fala inteira + `…`), atribuição correta de papéis e o sinal de omissão; o que ele perde é exatamente a faixa do corte, onde o antigo ainda extrai valor do fragmento. Violações empataram 1×1.

### Sugestões (para o A decidir — o B não toca no roteador)

1. **Ampliar a janela do novo para caber a cauda inteira** (ex.: 6 falas × 400 = 2400) — recupera o que o corte perdia, mantendo integridade. Custo: contexto maior.
2. **Recuperação dirigida (A17)**: quando o pipeline decidir truncar, marcar o que caiu e permitir buscar no histórico completo por palavra-chave do turno atual.
3. **Não reverter o #76**: o vazamento de papéis (P) e a mentira silenciosa do corte seco são defeitos de atribuição — o placar mostra que custam caro quando ocorrem (#4).

## Limites (explícitos)

- 1 chamada por célula (40 no total); a rota gratuita muda modelo/cota/latência entre chamadas — o contrabalanceamento reduz, não remove, o ruído (visível em #19/#20, itens R).
- Medido contra o `roteador-ia.js` do head do #77 (`e2be4f8991`); o fix do #79 (morte eterna) não altera montagem de contexto.
- Matcher estrito: gabaritos e proibições precisam casar o texto normalizado literalmente; `resultado-conversa.json` guarda os contextos exatos para auditoria.
- Rodada **fora da CI**, como pedido — nenhum workflow foi tocado.

## Errata pós-auditoria (2026-11-04, auditoria do Chat A, id 6623590718)

O Chat A recalculeu o placar do bruto com implementação própria (40/40 células batem) e registrou três ressalvas de leitura, mantidas aqui sem alterar nenhum número:

1. **A nota do banco prometia mais do que o banco faz.** "A chave é do turno 1" não vale para **#7 e #18** (aritméticos: 3×30 e 2000−650 — a resposta é calculada) nem para **#10** (recomendação, julgada pelo `proibir`). Legítimos, agora declarados: na v2, as notas os marcam como `CONTA DECLARADA`/`RECOMENDAÇÃO DECLARADA`.
2. **Uma célula não tem resposta:** cenário 14, versão A, `erro: "eco de instrução"`, `texto` vazio. Contou como derrota do A (conservador para o lado que venceu). **Esta rodada teve 40 chamadas e 39 respostas**; o `17×14` tem margem de ±1 conforme o que aquela célula daria. A v2 passa a retryar célula vazia uma vez, declarar o motivo e exigir texto para `completo`.
3. **Em 13 dos 20 cenários o gabarito era ecoado numa fala intermediária** ("Certo, Iris…", "Anotado: 3 caixas de 30"). O pareamento igualava os lados, mas o rótulo correto do instrumento é **fidelidade de contexto recente e tratamento de decoy**, não retenção de turno 1 — o que **reforça** a conclusão de que o #76 ganhou integridade, não retenção. A v2 (`banco-conversa-v2.json`) remove esses ecos e volta a exigir o turno 1.

## Reproduzir

```
node bench/medir-conversa.js                 # rodada completa (40 chamadas reais)
PLANO_CONVERSA=1 node bench/medir-conversa.js # só regime do banco (0 chamadas)
RETOMAR_CONVERSA=1 node ...                    # retoma do checkpoint por linha
```

Dependências: `bench/pontuar.js` e `roteador-ia.js` (reais, mesmos da produção). Hashes do que rodou em `resultado-conversa.json → meta.hashes`.
