# Rodada 135 — o auto-diagnóstico passou a auditar a si mesmo

**Publicado em `main` = `6a01ac2`** (PR #62, squash). `testes` = success, Pages = success,
`https://reboclbrank-max.github.io/chat/` 200, `tools/armadilhas-do-chat.json` no ar (200).

---

## 1. O que o seu pedido virou em código

"Que ele te impeça de errar, use ele para melhorar e aprimorar ele mesmo."

O medidor da 134 respondia *"isto o código resolve"*. Ele não respondia as duas perguntas que importam:

| pergunta que faltava | auditoria nova | resposta de hoje |
|---|---|---|
| o código responde o que **não devia**? | **Armadilhas** — 17 perguntas que *parecem* resolvíveis, mas cuja resposta certa não é a forma conhecida | **17/17 se comportaram** (8 calaram, 2 controles positivos acertaram, 7 casos-limite ok) |
| a resposta exata chega à **pessoa**? | **Prova de fio** — roda `responder()` com a chamada de modelo quebrada de propósito | **40/40 provas resolvidas por código chegam ao texto final sem modelo** |
| o risco está **medido em todo lugar**? | **Cobertura** — cada solucionador precisa de prova *e* armadilha | **16/16 com as duas** (antes: 15 dos 16 sem armadilha → risco invisível) |
| o placar pode **piorar sem ninguém ver**? | **Integridade + trava** — hash do gabarito e das armadilhas no histórico; `--exigir-sem-regressao` | hash gravado; trava sai com **código 1** ao piorar |

---

## 2. Ele me impediu de errar — 6 respostas exatas erradas, todas caladas

O pior defeito deste projeto é **chute numérico**: o código responde com confiança uma pergunta que não sabe.
As armadilhas expuseram seis:

| armadilha | resposta que eu dava | certo | estado agora |
|---|---|---|---|
| "37% de 37% de 200" | **13,69** | 27,38 | calcula certo: **27,38** |
| custo **com 10% de desconto** | **33** | 29,70 | **cala** |
| "6 operários, **se 2 adoecem**" | **6** (ignorava a condição) | depende | **cala** |
| rotação **com sentido que inverte** | **leste** | depende | **cala** |
| `[1,2,3].map(x=>x*2).join("-").length` | **"2-4-6"** | 5 | **cala** |
| silogismo **contraditório** ("todo A é B" + "nenhum A é B") | **Não** (por vacuidade) | indefinido | **cala** |

Duas correções de verdade (porcentagem encadeada, com vírgula decimal e antes da forma simples) e quatro
vetos: desconto/juros/imposto/frete em `custoTotal`; adoec/desist/falt em `operarios`; inverte/alterna em
`rotacao`; `.join(...).método` e `.map(...).método ≠ join` em `codigo`; par contraditório em `silogismo`.

---

## 3. Ele melhorou a si mesmo — a trava tinha um furo que se curava sozinho

A primeira versão da trava comparava o placar com **"a rodada anterior" do histórico**. Consequência:
a rodada ruim virava base e a execução seguinte passava — a trava se curava.

Contraprova feita numa cópia com o solucionador de probabilidade desligado:

```
1ª execução  ✘ REGRESSÃO: provas resolvidas por código caíram de 40 para 38 · prova de fio caiu de 40 para 38  → EXIT=1
2ª execução  (antes da correção) EXIT=0   ← a trava tinha se curado
```

Depois da correção (**referência monotônica** em `hist.referencia`):

```
1ª execução EXIT=1
2ª execução EXIT=1   ← não se cura mais
```

Segundo furo, achado pelo próprio teste: a trava comparava **amostras de tamanhos diferentes**
(`--fio=2` contra referência de 40) → falso positivo. Agora só compara com `fioTotal` igual, e os testes usam `--fio=40`.

---

## 4. Prova na barreira (números, não adjetivos)

| medição | antes | agora |
|---|---|---|
| `tools/testes/auto-melhoria.js` | 6 verificações | **11/11** |
| `tools/testes/razao-local.js` | 54 | **56/56** (inclui as armadilhas do módulo) |
| barreira completa (`roda-testes.js`) | 118/118 | **118/118**, 3 ignorados |
| armadilhas | 0 | **17/17** |
| provas resolvidas por código | 40/47 | **40/47** (0 erradas) |
| prova de fio | não existia | **40/40** |
| cobertura (solucionador com prova + armadilha) | 1/16 | **16/16** |
| fácil / difícil ao vivo | 29/29 · 18/18 | **29/29 · 18/18** (sem regressão) |

Texto aberto segue **21/24** (`bench/final-paragrafo.json`, mediana 39 494 ms) — não mexi no que não tinha ganho medido.

---

## 5. O que o motor diz para a próxima rodada (fila dele, não minha)

1. **conhecimento-sem-lexico · verbal** — 6 provas, custo médio. Regra que eu mesmo escrevi e obedeço:
   *não montar léxico sob medida para as provas* (seria ensinar para o teste). Só base de fatos estáveis com fonte, ou o modelo.
2. **texto-aberto-forma** — 1 prova (14, 17, 22), custo baixo. Repartir no portão final foi tentado e **revertido**:
   dois testes de produto exigem que a falta apareça. Resta teto de tokens/geração.
3. **conhecimento-sem-lexico · código · geracao** — 1 prova (`facil-cod3`).
4. **texto-aberto-conteudo** — 2 provas, custo alto; revisão por reescrita já foi medida e rejeitada (3× latência, 0 ganho).

**Tendência: 40/47 → 40/47 por código.** Não subiu porque os consertos desta rodada foram de *honestidade*
(calar quando não sabe), não de cobertura — e isso vale mais do que um número maior com resposta errada.

---

## Limite honesto

A armadilha mede o que eu **soube imaginar** como perto-perigo. Ela não prova ausência de chute numa forma
que ninguém pensou. O que sustenta o resto é a regra do módulo: **forma que não casa exatamente devolve `null`** —
e agora quem vigia essa regra é o mesmo motor que ela vigia.
