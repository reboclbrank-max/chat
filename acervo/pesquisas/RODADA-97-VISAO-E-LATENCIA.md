# Rodada 97 — visão com régua própria, texto longo 2,7× mais rápido, e-mail que fecha

Data: 28/10/2026 · PR **#37** (squash `4d0b214`) · anterior: `RODADA-96-TEXTO-ABERTO.md`

---

## 1. Visão: era promessa, virou número

Sondagem rota por rota, com 6 PNGs de conteúdo objetivo (dígito, letra, palavra, três círculos, `42` em quadrado, seta) enviados no formato `content-array` da OpenAI:

| rota | resposta ao pedido com imagem |
|---|---|
| Kilo — nemotron-ultra, laguna | **404** `No endpoints found that support image input` |
| g4f — nemotron-ultra | **502** `multimodal processing is not enabled` |
| Pollinations — openai | **400** `This model does not support image input` |
| **OVH — Qwen3.5-397B-A17B** | **200** — leu `7`, `Q` e `esquerda` corretamente |

Existe visão gratuita, e é **uma** rota.

### Régua e resultado

`bench/banco-visao.json` — 11 imagens com gabarito objetivo (dígitos `7`, `9`, `123`; letra `Q`; palavras `AZUL`, `CASA`; contagem de 3 círculos e 2 quadrados; `42`; seta para a esquerda e para a direita).

| | 1ª medição | depois de ajustar vazão |
|---|---|---|
| acertos | 7/11 = 63,6% | **11/11 = 100%** |
| sem-resposta (429) | 4 | **0** |
| mediana | 1,7 s | **2,4 s** |

O que mudou entre as duas: **5 tentativas** em vez de 3, `Retry-After` respeitado e vazão de 6 s. A rota de visão é a cota mais apertada do conjunto — sem paciência, ela derruba 1/3 dos pedidos.

Sem rota disponível, o roteador devolve **sem-resposta** e diz que não tem rota de visão. **Não inventa descrição de imagem** — isso é testado na barreira.

## 2. Texto longo: a espera vinha de escolher mal quem escreve

Sonda `tools/sonda-latencia-paragrafo.js` (mesmo pedido de parágrafo, 53–93 palavras):

| rota | tempo | entrega |
|---|---|---|
| **laguna-s-2.1** | **9,2 s** | 64 palavras, dentro da faixa ✓ |
| nemotron-ultra (Kilo) | 20,4 s | 359 palavras ✗ |
| qwen3.5-397B (OVH) | 11,1 s | 0 ✗ (só raciocínio) |
| nemotron-3.5-lightning | 60 s+ | timeout |

O código escolhia um modelo **por provedor** e pegava o primeiro da lista — ou seja, **o nemotron-ultra (20 s, estoura o tamanho) e descartava o laguna (9 s) por serem do mesmo provedor**.

Consertos: escolha do host por **latência medida**, até **3 workers** em 3 provedores distintos para 3+ parágrafos, prazo proporcional ao número de parágrafos e cada parágrafo como bloco único.

| caso | antes | agora |
|---|---|---|
| 2 parágrafos | 84 s (mediana da régua) | **5–45 s** |
| 3 parágrafos | **223 s** | **26 s** |
| régua aberta completa (24 pedidos) | 84,0 s de mediana | **30,6 s** |

## 3. O placar da régua aberta — com a troca explícita

| régua aberta (24 pedidos, mesma rubrica) | rodada 96 | rodada 97 |
|---|---|---|
| aprovados | 22/24 = 91,7% | **20/24 = 83,3%** |
| cortados / curtos | 0 / 0 | 0 / 0 |
| falta de um termo exigido | 2 | **4** |
| mediana de tempo | 84,0 s | **30,6 s** |

**Troquei 2 pontos de acerto por 2,7× menos espera** — e digo isso porque foi troca, não mágica: os parágrafos agora vêm de provedores diferentes em paralelo, e o texto fica menos coeso em alguns casos (os 4 residuais são todos "faltou usar o termo X": *aliado*, *parâmetro*, *conexão* e *atenciosamente*).

O 4º residual (**mensagem cobrando pagamento**) foi corrigido **depois** dessa medição e verificado item a item com `bench/verificar-itens.js`: passa. Com ele seriam **21/24**, mas não refiz a régua inteira — então o número publicado é 20/24.

## 4. Perguntas curtas não mudaram

Nenhum caminho de pergunta curta foi tocado nesta rodada (as mudanças são do tipo "pedido longo" e da rota de visão). Os números de hoje continuam valendo: **200/200**, holdout **105/105**, difícil **30/30**, código **18/18**.

## 5. O limite honesto

- **A cota gratuita é o gargalo real**, e o texto longo é quem mais a consome: cada pedido de 2–3 parágrafos gasta 2–3 chamadas. Sob cota esgotada a régua aberta desaba (medi 40-60% em janelas ruins, com respostas de 22 palavras) — e isso é **disponibilidade**, não inteligência.
- **A rota de visão é uma só.** Se ela estiver em 429, não há plano B medido.
- A rubrica de texto aberto mede **forma e cobertura de termos**, não qualidade literária. Um texto pode passar e ser medíocre — e um texto bom pode falhar por não usar a palavra que a rubrica exige.

## 6. Prova

- `bench/resultado-visao.json` — **11/11**, mediana 2,4 s
- `bench/resultado-aberto-depois.json` — **20/24**, mediana 30,6 s, com o texto de cada item
- `bench/verificar-itens.js aberto 4,5,6,21` — os residuais de conteúdo, um por um, pela mesma rubrica
- `tools/sonda-latencia-paragrafo.js` — a sonda que ordenou os provedores por latência
- Barreira **97/97** e continuidade **22/22**
