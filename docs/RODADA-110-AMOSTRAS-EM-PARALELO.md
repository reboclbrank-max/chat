# Rodada 110 — as duas amostras agora correm juntas

**Resultado: aprovada.** A escolha entre duas gerações continua valendo, mas a espera deixou de ser
a soma das duas. Qualidade igual (indistinguível), **latência −45%** na mesma janela pareada.

## 1. O que estava sendo consertado

A rodada 109 comprou qualidade a um preço alto: **2× chamadas** e **+87% de latência mediana**
(11 495 ms → 21 472 ms), porque a segunda amostra só começava depois que a primeira terminava.

As duas amostras são gerações **independentes** — nada na segunda depende do texto da primeira. Não
havia motivo técnico para enfileirar: era só a ordem em que o código foi escrito.

## 2. O que mudou no produto (`roteador-ia.js`)

- Novo parâmetro `amostrasEmParalelo` (padrão **ligado**; `false` volta ao caminho sequencial).
- No caminho paralelo, as duas gerações começam juntas e a resposta é escolhida depois, pela mesma
  pontuação interna (`pontosDaAmostra`) — a regra de escolha **não** mudou.
- O cache também não muda: as duas usam a mesma chave (a pergunta), então um acerto de cache atende
  as duas na hora e pergunta repetida continua custando zero chamada.
- `amostrasAberto: 1`, `pedido.semSegundaAmostra` e perguntas não abertas seguem como antes.

## 3. Medição (mesma régua: 144 respostas pareadas, 36 itens × 2 repetições × 2 lados)

- A = `bench/controle-sequencial-109.js` (produto publicado na rodada 109: duas amostras em fila)
- B = `bench/candidato-paralelo-109.js` (duas amostras em paralelo)
- Análise: `bench/analisar-potencia-107.js` · dados: `bench/resultado-paralelo-109.json`

| | A (em fila) | B (em paralelo) |
| --- | --- | --- |
| acertos | 68/72 (94,4%) | 67/72 (93,1%) |
| diferença | | **−1,4 ponto**, IC95% [−9,3; 6,5] |
| pareado | 4 a favor de A · 3 a favor de B | McNemar exato **p = 1,0000** |
| latência mediana | 24 308 ms | **13 314 ms (−45%)** |

Por grupo: original 46/48 → 45/48 · holdout 12/12 → 12/12 · novo 10/12 → 10/12.

**Leitura honesta:** a diferença de qualidade está dentro do ruído (p = 1,0, 3 ganhos e 4 perdas
cruzadas) — o que se ganha é relógio, não acerto. E o relógio cai quase pela metade: 24,3 s → 13,3 s.

Contra a linha de base de **uma** amostra (11 495 ms na janela da rodada 109), o custo da segunda
amostra sai de **+87%** para **~+16%**.

## 4. O que NÃO foi resolvido (e por que parou aqui)

Tentei também "garantir o formato na entrega": repartir em parágrafos, no momento de entregar,
qualquer texto com frases suficientes. **Revertido**, com prova de dois contratos que já existiam e
estão certos:

1. `estado-aberto.js` — *"o aviso não pode adulterar o texto bruto"*: um texto de duas frases num
   pedido de dois parágrafos tem de voltar inteiro, com aviso. Repartir ali seria fabricar
   parágrafo de uma frase.
2. `aberto-recuperacao.js` — *"não descartar o trecho que deu certo"*: resposta parcial (429 no meio
   do caminho) não pode ser remendada para parecer completa.

Sem esses dois limites, a "garantia" consertava o item `original:9` à custa de mentir nos outros
dois casos. Fica valendo o comportamento atual: texto com um parágrafo onde o pedido pedia dois sai
**com aviso de formato** — honesto, ainda que a régua conte como falha.

## 5. Testes

`tools/testes/duas-amostras.js` passou de 6 para **10 contratos**, incluindo os do caminho paralelo:

- duas gerações se sobrepõem de verdade (pico simultâneo = 2);
- duas amostras em paralelo gastam o tempo de uma, não a soma das duas;
- `amostrasEmParalelo: false` mantém o caminho sequencial (uma depois da outra);
- em paralelo vence a amostra de melhor nota, e não a primeira que chegou;
- pergunta repetida não gasta geração nova em paralelo (cache vale para as duas).

`npm test`: **111/111** testes rápidos (3 ignorados por pré-requisito local ausente).

## 6. Custo declarado

- **2× chamadas** nas perguntas abertas (não mudou em relação à rodada 109).
- **Latência**: ~13,3 s em vez de ~24,3 s no caminho de duas amostras; ~+16% sobre uma amostra só.
- Nenhuma chave paga, nenhum modelo novo.
