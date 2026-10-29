# Rodada 104 — o defeito da correção anterior, o meu próprio erro, e o preço dele

Base: `main@9848907` (rodada 103 publicada). Janelas: 17:32–18:12Z (medição 104) e em curso (105).

## 1. O defeito que eu introduzi na rodada 103

`_limiteRota` derivava a janela de timeout da **latência de sucesso**, e `latAmostras` só sobe em
`_premiar`. Rota que só estoura o relógio **nunca** ganhava amostra e continuava recebendo 25 s
cheios, para sempre — exatamente o caso que a correção devia atingir. Na janela de 103 isso foram
63 timeouts × 17,8 s = 18,7 min.

## 2. A correção da 104 — e o erro dela

Regra aplicada: cada estouro corta a janela pela metade (25 → 12,5 → 6,25 → piso 6 s), mais um
disjuntor de 4 falhas seguidas → 60 s de descanso.

**Medição pareada 104 (88 respostas, 17:32→18:12Z, 39,8 min):**

| grupo | A (controle) | B (candidato 104) |
|---|---|---|
| original (24) | 23/24 | 20/24 |
| holdout (6) | 6/6 | 6/6 |
| novo (6) | 6/6 | 4/6 |
| repetições (8) | 5/8 | 3/8 |
| **total** | **40/44** | **33/44** |

**O candidato perdeu por 7 pontos.** Cinco das nove discordâncias foram respostas **vazias** —
pior modo de falha possível, porque não é erro de conteúdo: é ausência de resposta.

### A causa, item a item

Traço de `novo #205` no candidato: 9 chamadas, todas `timeout`, a primeira delas
`lagunas timeout 6002ms`. **`lagunas` é a melhor rota do sistema** (mediana ~9 s nas janelas
anteriores). Ela foi abortada em 6 s porque já havia estourado antes — e `timeoutsSeguidos` só
zera com sucesso, que nunca chegava porque a janela era curta demais.

**Falha auto-realizável:** cortei o tempo de quem estava apenas lento, ela nunca mais teve tempo de
responder, e a contagem que justificava o corte nunca zerava. O disjuntor de 4 falhas agravou:
tirava rotas do pool, e o pool de rotas gratuitas vivas é pequeno.

## 3. A regra corrigida (rodada 105)

| regra | 104 (errada) | 105 (corrigida) |
|---|---|---|
| corte por estouro | qualquer rota | **só rota que nunca respondeu** nesta sessão |
| piso para rota com histórico | 6 s fixos | **nunca abaixo de 1,5× a latência já observada** |
| disjuntor | 4 falhas, qualquer rota, 60 s | **6 falhas, só rota sem nenhum sucesso, 30 s** |
| rota que já entregou resposta | podia ser derrubada | **nunca entra no disjuntor** |

Dois contratos de regressão novos travam exatamente o erro de 104:
"rota COM histórico de sucesso não perde a janela por estourar o relógio" e
"rota que já respondeu nunca entra no disjuntor". Total: **16 contratos** em
`tools/testes/roteamento-com-chave.js`.

## 4. `!chave` agora confirma de verdade

Salvar passou a testar a chave: `✅ chave válida — respondeu em N ms`, `❌ chave recusada (401)`,
`⏳ cota no limite (429)`. Também lista o que está guardado, mostra máscara (`••••últimos4`) e apaga
com `apagar`. A chave continua só no `localStorage` e só no cabeçalho `Authorization`; o teste
`chave-do-dono.js` (5 contratos) verifica que não há chave no corpo, na URL nem no repositório.

Bug de processo corrigido no caminho: eu havia editado só `index.html`, e `direto/ligar/limpar` são
**geradas** dele. O CI pegou (`paginas-geradas` 6/8); regeneradas com `--escrever`, verificador em
zero divergência.

## 5. Barreira

`npm test`: **108/108 executados**, 3 ignorados por pré-requisito local (Chromium, OCR,
`pdftotext`). Comportamento 24/24 · misto 34/34 · estática 50/50. CSP 10/10.

## 6. Comparação pareada 105 (regra corrigida)

**Janela 18:16:52Z → 18:48:32Z (31 min 40 s), 88 respostas, regra corrigida.**

| grupo | A (controle) | B (candidato 105) |
|---|---|---|
| original (24) | 20/24 | 21/24 |
| holdout (6) | 6/6 | 5/6 |
| novo (6) | 5/6 | 5/6 |
| repetições (8) | 8/8 | 7/8 |
| **total** | **39/44** | **38/44** |

**Diferença de 1 ponto.** Pelo critério abaixo, isso é empate dentro do ruído — não declaro
melhora nem piora. O que a regra corrigida devolveu foi o estrago da 104: cinco respostas vazias
viraram duas, e o candidato voltou a ficar a um ponto do controle em vez de sete.

## 7. O achado metodológico que muda a leitura de todas as rodadas

O **controle é o mesmo código** (`5ff3587`, extraído de `main@96b093c`) em todas as janelas.
Medi-lo quatro vezes mede o **ruído do instrumento**, não o efeito do código:

| janela | A (controle, código idêntico) | B | diff | chamadas/resposta | desperdício | timeout médio |
|---|---|---|---|---|---|---|
| 102 | 37/44 | 34/44 | −3 | 2,36 | 42,1% | 24,8 s |
| 103 | 38/44 | 38/44 | 0 | 2,99 | 51,2% | 17,8 s |
| 104 | 40/44 | 33/44 | −7 | 2,93 | 54,3% | 11,2 s |
| 105 | 39/44 | 38/44 | −1 | **1,97** | **37,6%** | 13,7 s |

**O mesmo código mediu 37, 38, 40 e 39 → amplitude de 3 pontos (6,8%).**

Consequências, ditas sem rodeio:

1. **Diferenças de 1 a 3 pontos nesta régua não são conclusivas.** Isso vale para a 105 (−1), para
   a 103 (0) e — importante — **também para a 102 (−3)**, que foi o que me fez declarar a camada de
   fontes perdedora. Aquela conclusão precisa ser rebaixada de "perdeu" para "não demonstrou ganho".
   A decisão de deixar as fontes em opt-in continua defensável, mas por prudência, não por prova de
   perda.
2. **A regressão de 7 pontos da 104 é real**: fica muito acima da amplitude do controle. Foi erro
   meu, está medido, e a regra foi corrigida.
3. **O que melhorou de forma consistente não é a nota, é o custo**: chamadas por resposta caíram de
   2,36–2,99 para **1,97**, o desperdício de 42–54% para **37,6%**, e o timeout médio de 24,8 s
   (102) para 13,7 s (−45%). Esses três números andam na mesma direção em toda a série e não
   dependem de uma questão acertar ou errar por vocabulário.

## 8. Veredito da rodada

- **Nota**: 38/44 contra 39/44 do controle → **empate técnico**. Nenhuma melhoria de qualidade
  declarada.
- **Eficiência**: melhora medida e consistente (menos chamadas, menos desperdício, timeout 45% menor).
- **Erro admitido**: a regra da 104 piorava o produto em 7 pontos e foi publicada antes de medida;
  a medição a derrubou e ela foi corrigida, com dois contratos de regressão permanentes.
- **Instrumento**: a régua tem amplitude de 3 pontos com o mesmo código. Fica registrado para que
  ninguém (inclusive eu) trate diferenças pequenas como veredito.

## 7. O que continua aberto

- **As 5 falhas de fato** (#16 rio, #13 antígeno, #6 resíduo/ambiental, #14 parâmetro, #17
  isolamento) não dependem de timeout. Nenhuma correção desta rodada as toca.
- **Estrutura em parágrafos**: quando o único modelo que responde devolve 1 parágrafo, o item falha
  mesmo com volume de texto suficiente (`#20`: 73 palavras, 1 parágrafo).
- **`motor*.html` e `dna.json`** seguem sem a rota Groq, de propósito.
- **A chave da Groq só existe se o dono criar** — não crio conta em nome de outra pessoa.
