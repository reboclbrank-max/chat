# Rodada 137 — o produto agora sabe o próprio nome, e eu só vigio

**Publicado: `main` = `5d2e995`** (PR #64, squash). `testes` = success · Pages = success · casca `rebocl-chat-v104` no ar.

---

## 1. O erro que você viu — e a causa medida

Perguntei ao caminho real do produto, offline:

```
CALADO (vai para o modelo) ← Qual é o seu nome?
CALADO (vai para o modelo) ← Como você se chama?
CALADO (vai para o modelo) ← Você é o ChatGPT?
```

**Não havia caminho de identidade**: toda pergunta sobre o próprio nome ia para o modelo e voltava com nome de outra empresa. Agora existe caminho exato, sem rede:

| pergunta | antes | agora |
|---|---|---|
| "Qual é o seu nome?" | modelo | **Assistente Rebocl** |
| "Como você se chama?" | modelo | **Assistente Rebocl** |
| "Você é o ChatGPT?" | modelo | **Não. Sou o Assistente Rebocl.** |
| "Quem te criou?" | modelo | **Rebocl Brank** |
| "Qual é o seu nome no cadastro do cliente?" | modelo | **continua no modelo** (não é identidade) |

O nome é o mesmo no `<title>`, no `manifest.json`, no README e na casca — e um teste cobra isso.

---

## 2. Papel novo: eu vigio, ele decide

`node tools/auto-melhoria.js --vigiar` — **uma linha** e código de saída 1 se algo estiver fora do lugar: prova errada, armadilha chutada, fio partido, cobertura furada, resposta que muda com a redação, regressão contra a referência.

```
✔ GUARDA: nada quebrado · provas 122/127 por código (0 erradas) · armadilhas 43/43
  · fio 122/122 · cobertura 39/39 · reescrita 274/277 · regressão: nenhuma
```

**Contraprova** (guarda que nunca dispara não é guarda) — cópia com o solucionador de probabilidade desligado:

```
✘ GUARDA: 2 problema(s) — NÃO publicar.
   · solucionador sem prova: probabilidade
   · regressão: por código 122 → 120
EXIT=1
```

Virou teste permanente em `tools/testes/auto-melhoria.js`.

---

## 3. "Mande ele melhorar mais" — ele mesmo sobe a barra

`--pedir-mais` mira **3× a régua da rodada 135** e imprime a distância item por item:

| eixo | hoje | patamar 3× | falta |
|---|---|---|---|
| solucionadores | 39 | 48 | 9 |
| provas no gabarito | 127 | 141 | 14 |
| armadilhas | 43 | 51 | 8 |
| armadilhas respeitadas | 43 | 51 | 8 |
| solucionadores com prova+armadilha | 39 | 48 | 9 |
| domínios com caminho exato | 19 | 27 | 8 |
| provas por código | **122** | 120 | ✔ já passou |
| provas que chegam à pessoa | **122** | 120 | ✔ já passou |
| provas verbais por código | **15** | 3 | ✔ já passou |

---

## 4. Auditoria nova: robustez sob reescrita

A mesma prova escrita de outro jeito — sem a instrução final, tudo em minúsculas, com "por favor" na frente:

**274/277 estáveis · 0 mudaram de resposta · 3 calaram** (vão para o modelo, o que é seguro).

Ela achou dois defeitos reais:

- **a mesma pergunta com duas respostas**: "capital da Austrália" respondia `Canberra` com instrução e `Camberra` sem — duas listas no `roteador-ia.js` com grafias diferentes. Unificado; o gabarito aceita as duas grafias;
- **a negação dependia do pedido de formato**: sem "Responda SIM ou NÃO", "o técnico ficou satisfeito?" deixava de ser respondida. A regra passou a olhar a **forma da pergunta**. `sequenciaLetras` também passou a aceitar minúsculas.

---

## 5. Prova de que nada quebrou

| medição | valor |
|---|---|
| `tools/testes/identidade-do-chat.js` (novo) | **5/5** — inclui o nome chegando ao texto final **com o modelo quebrado** |
| `tools/testes/auto-melhoria.js` | 13 → **17/17** |
| motor | **122/127** por código · **0 erradas** · armadilhas **43/43** · fio **122/122** · cobertura **39/39** |
| barreira completa | **119/119** (3 ignorados) |
| páginas derivadas | sem divergência |
| ao vivo | fácil **29/29** · difícil **18/18** |

---

## Limite declarado

As 3 provas que "calaram" na reescrita são comparação de nomes com tudo em minúsculas: param no guarda de maiúsculas do `fila`, que existe para não confundir palavra comum com nome. Nesses casos o produto **silencia** e o modelo responde — silêncio é aceitável; resposta diferente seria defeito, e é zero.
