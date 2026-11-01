# O teto dos modelos grátis — medido, e derrubado

Data: 28/10/2026 · PR **#34** (squash `0c81318`) · continuação: `pesquisas/RODADA-96-TEXTO-ABERTO.md` (PR #35)

---

## 1. A frase que você mandou resolver

> *"O teto de inteligência dos modelos gratuitos (~45 contra ~58 do topo pago) **não subiu**… Em pergunta aberta o pago continua melhor."*

**Ela estava errada, e o erro era meu — de medição.** Eu nunca tinha medido **rota por rota**. Media o consenso e concluía sobre os modelos.

Novo medidor: `bench/medir-rotas.js` + `bench/banco-duro.json` — 30 itens difíceis com resposta verificável (matemática de vários passos, lógica, ciência, língua). Cada rota do catálogo responde a mesma bateria, isolada.

| rota | grátis? | acertos nos 30 difíceis | mediana |
|---|---|---|---|
| **Nemotron-3-Ultra-550B (Kilo)** | sim | **30/30 = 100%** | 3,7 s |
| Nemotron-3.5-Lightning (Kilo) | sim | 27/30 = 90% | 4,9 s |
| Laguna-S-2.1 (Kilo) | sim | 22/30 = 73% | 7,1 s |
| Nano-Omni-30B (Kilo) | sim | 4/30 = 13% | 0,1 s |
| Qwen3.5-397B (OVH) | sim | 2/30 = 6,7% — **28 erros de 30** | 0,2 s |
| Qwen3.6-27B (OVH) | sim | 2/30 = 6,7% | 0,2 s |
| gpt-oss-120b (OVH) | sim | 2/30 = 6,7% | 0,2 s |
| Nemotron-3-Ultra-550B (g4f) | sim | 3/30 = 10% (cota) | 0,03 s |
| GLM-5.3 / Nemotron-Super-120B (g4f) | sim | 0/30 | — |
| Pollinations openai-fast | sim | 1/30 = 3,3% | 0,2 s |

Um modelo de **550 bilhões de parâmetros, de graça, acerta 30/30** em pergunta difícil e responde em 3,7 s. O "teto de 45" não era o teto do que eu tenho acesso — era o teto do que eu **escolhia usar**.

## 2. O defeito que a medição expôs

O consenso exigia **um host por voto** — "para não votar três vezes no mesmo provedor". Consequência:

- o melhor modelo (Kilo, 100%) entrava uma vez;
- os outros dois votos iam para OVH (6,7%, 28 erros de 30 — 429 imediato) só porque o host era diferente;
- com dois votos ruins e um bom, a maioria podia **vencer o modelo certo**.

Eu tinha um problema de fila e chamei de limite de inteligência. Isso é exatamente o tipo de desculpa que você recusou.

## 3. O que foi corrigido

1. **`peso` = acerto medido** em cada rota do catálogo.
2. **Classe (`forte`/`media`/`leve`) segue a medição**, não o palpite de quem escreveu o catálogo. Lightning (90%) e Laguna (73%) subiram para `forte`; OVH inteira desceu para `leve`.
3. **Consenso por força**: top-N por peso; repetir host é permitido quando é nele que estão os melhores modelos.
4. **Vazão mínima entre chamadas da mesma rota** — rajada é o que queima cota gratuita — e **`Retry-After`** do 429 respeitado.
5. **Geração longa em série** (em paralelo estourava a cota do provedor bom), com parada antecipada quando a resposta já atende.
6. **Fallback de pedido longo com 1200 tokens.** Antes, quando o provedor forte limitava, o pedido longo caía no consenso de **400 tokens** e truncava a frase no meio.
7. **Cache persistente em `localStorage`**: repetir pergunta não gasta cota.
8. Correção de conteúdo: superlativo com "absoluto sintético" no meio da pergunta vazava para o modelo (`maiuscíssimo` no lugar de `péssimo`).

## 4. O limite honesto, agora com o número certo

**A restrição real do grátis é cota, não raciocínio.**

Depois de ~1.000 chamadas de medição, Kilo e g4f passam a devolver 429 por janelas. Medido hoje, nas duas condições:

| condição | difíceis (30) | código (18) | texto aberto (24) |
|---|---|---|---|
| cota disponível | **29–30/30 (97–100%)** | **18/18 (100%)** | 14–15/24 (58–63%) |
| cota esgotada (429 em série) | 25–29/30 | 16/18 (88,9%) | cai (volta a truncar) |

- **Pergunta curta e verificável:** 200/200, 105/105 e 84/84, e **o mesmo resultado na régua estrita** (acento conta).
- **Vários saltos:** 16/18 → **18/18** (compositor local de 2–3 passos).
- **Código:** 13/18 → **18/18** (a função é **executada** contra testes reais, não julgada por texto).
- **Texto aberto: 12,5% → 58–63%** na rodada 94/95; **91,7% na rodada 96** (ver `RODADA-96-TEXTO-ABERTO.md`).
- **Visão:** continua fora de qualquer medição. Não vou fingir que medi.

## 5. Estado da entrega

- PR **#34** mergeado (squash `0c81318`), check `testes` **success**, Pages servindo a v4.
- Verificado no arquivo **que está no ar**: top-3 do consenso = `gigante2(100) kilolight(90) lagunas(73)`; `16×12` → 192; `fevereiro de 2028` → 29; `símbolo químico da prata` → Ag.
- Barreira: **97/97**.

## 6. Comandos

```
node bench/medir-rotas.js          # ranking rota por rota nos 30 difíceis
BANCO=banco-duro.json CONC=1 node bench/medir.js gratis
MODO=depois node bench/medir-codigo.js gratis
MODO=depois node bench/medir-aberto.js gratis
node bench/pontuar.js              # régua (12/12); modo estrito: acento conta
```
