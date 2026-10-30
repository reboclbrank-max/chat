# Rodada 109 — duas amostras por resposta, com escolha

**Resultado: aprovada.** É a primeira intervenção da série que passa do ruído numa janela de 144
respostas. O produto agora gera **duas** respostas nas perguntas abertas e entrega a melhor pela
mesma pontuação interna que já escolhia candidatos (`notaTexto` + completo/parcial/cortado) — sem
heurística nova e sem chamar modelo pago.

## 1. O que estava sendo consertado

As rodadas 104–107 tentaram corrigir "falhas de fato" com prompt: fonte viva (+1 acerto), concretude
(+1), cadeia parte→todo (−6, recusada). O diagnóstico da rodada 108 mostrou por quê nada colava:

| medida (arquivo) | resultado |
| --- | --- |
| `bench/diagnostico-fatos-107.js`, 41 arquivos, **672 respostas** | 41/232 (17,7%) com falta de fato |
| pior item | 12/40 (30%) — nenhum item ≥ 50% |
| itens que nunca falharam | **26 de 36** |
| dispersão do **mesmo** código entre janelas de 44 | 34, 37, 38, 39, 39, 40 — maior que qualquer efeito de prompt |

Ou seja: não havia item sistemático a consertar. A resposta certa **já aparece** em outra geração; o
que faltava era o produto poder escolher entre duas. É essa a intervenção desta rodada.

## 2. Como foi medido

- Mesma régua das rodadas anteriores, sem afrouxar nada: `bench/medir-potencia-107.js` (janela de
  **144 respostas** = 36 itens × 2 repetições × 2 lados, ordem por hash, mesmos gabaritos).
- A = `bench/controle-sem-fonte-viva-106.js` (estado publicado antes desta rodada).
- B = `bench/candidato-duas-amostras-108.js` (cópia do roteador com o wrapper de duas amostras,
  **sempre** duas amostras).
- Análise pareada: `bench/analisar-potencia-107.js` (McNemar exato, IC95% de Wilson, latência
  mediana). Dados brutos em `bench/resultado-duas-amostras-108.json`.

## 3. Resultado

| | A (uma amostra) | B (duas amostras) |
| --- | --- | --- |
| acertos | **63/72 (87,5%)** | **71/72 (98,6%)** |
| diferença | | **+11,1 pontos**, IC95% **[3,0; 19,2]** |
| pareado | 8 ganhos / **0 derrotas** | McNemar exato **p = 0,0078** |
| latência mediana | 11 495 ms | 21 472 ms (**+87%**) |
| original | 41/48 | 47/48 |
| holdout | 12/12 | 12/12 |
| novo | 10/12 | 12/12 |

Os 8 ganhos: `original:204 r1`, `original:22 r0`, `original:20 r0`, `original:17 r1` (parágrafos
cortados), `original:24 r1`, `original:16 r1`, `original:18 r1` (falta de fato) e `novo:205 r1`
(resposta vazia). A única falha que sobra em B é `original:9 r?` (1 parágrafo onde o gabarito pede 2).

Leitura honesta: **12,5% → 1,4% de reprovação** na mesma janela, com 0 derrotas — a escolha entre
amostras nunca piorou uma resposta que já estava certa.

## 4. O que entrou no produto (`roteador-ia.js`)

- `opcoes.amostrasAberto` (padrão **2**; `1` desliga) — sem mudança para quem já instancia o roteador.
- `pontosDaAmostra(resposta, ex)` — pontuação da amostra reaproveitando `notaTexto` e
  `anotarRespostaAberta`, com penalidade para texto cortado e para resposta curta.
- Wrapper de `Roteador.prototype.responder`: só re-amostra **perguntas abertas**, desliga cache na
  segunda amostra (amostra nova de verdade) e entrega `{ amostras: 2, daSegunda: true|false }`.
- Escapatória por pedido: `pedido.semSegundaAmostra: true`.
- **Visível no produto:** o rodapé do `!melhor` e a etiqueta do motor passam a dizer
  `2 amostras, a melhor entregue` / `· 2 amostras` quando a resposta veio do novo caminho —
  o custo (e o motivo da espera maior) fica na cara, não escondido no código.

**Tentativa descartada (e por quê):** a primeira versão pulava a segunda amostra quando a primeira
já vinha completa e bem pontuada — economizava latência, mas `bench/validar-duas-amostras-108.js`
mostrou que quase nenhuma pergunta usava a segunda e o ganho sumia (`amostras: 1` em 17 de 18
execuções). O produto agora faz **sempre** duas amostras nas abertas, igual ao experimento; quem
quiser economizar usa `amostrasAberto: 1`.

## 5. Validação no código publicado

`node bench/validar-duas-amostras-108.js --repeticoes=2` — roda o **roteador publicado** nos 9 itens
em que a amostra única falhou na janela (cache desligado, 2 repetições cada):

```
passou 14/18 (77.8%) nos casos que antes falhavam
```

Sobram falhas intermitentes (`original:22` em 2/2, `original:9` e `original:24` em 1/2) — a mesma
variância que a rodada 108 documentou. Não são regressão: nenhum desses itens falhou mais do que na
amostra única, e a janela de 144 é quem decide.

## 6. Custo declarado

- **2× chamadas ao provedor** em perguntas abertas (perguntas curtas não pagam nada).
- **+87% de latência mediana** (11,5 s → 21,5 s). É o preço do ganho; está medido, não estimado.
- Nenhuma chave paga, nenhum modelo novo: as duas amostras usam as mesmas rotas gratuitas.

## 7. Testes

`tools/testes/duas-amostras.js` — 6 contratos (ligado por padrão, aberta paga duas amostras,
segunda melhor é entregue, pior não vence só por ser a última, `semSegundaAmostra` desliga,
`amostrasAberto: 1` volta ao comportamento anterior, pergunta não aberta não paga o custo).

Dois arquivos antigos contavam chamadas com o comportamento de uma amostra
(`aberto-recuperacao.js`, `rota-com-chave-ponta-a-ponta.js`). Eles medem o **ensaio interno**
(rascunho, blocos, prazos), então agora passam `semSegundaAmostra: true` — o padrão ligado tem
contrato próprio em `duas-amostras.js`. Nenhum gabarito foi afrouxado.

`npm test`: **111/111** testes rápidos (3 ignorados por pré-requisito local ausente) · 
`node tools/montar-paginas.js --verificar`: 3 páginas derivadas sem divergência.
