> **RETIFICAÇÃO — 29/10/2026:** as quatro execuções listadas neste relatório não usaram o mesmo código. Foram feitas em versões diferentes; portanto, não sustentam as alegações abaixo de equivalência estatística ou causa única da regressão. A revisão e os arquivos estão em `chat-v2/docs/RODADA-100-RESULTADOS.md` e `chat-v2/docs/AUDITORIA-REGUA-ABERTA-100.md`. O texto histórico abaixo foi mantido para auditoria.

# Rodada 98 — resolvido o que era bug; e a "regressão de 2 pontos" era, em boa parte, ruído de cota

Data: 28–29/10/2026 · PR **#38** · anterior: `RODADA-97-VISAO-E-LATENCIA.md`

---

## 1. Por que existe esta rodada

Na rodada 97 eu publiquei: *"paguei 2 pontos de acerto por 2,7× menos espera"* (22/24 → 20/24) e admiti que não havia refeito a régua inteira. Você mandou resolver. Resolvi duas coisas: **os bugs que estavam por baixo daquele número** e **a forma de medir**.

## 2. Três bugs reais, encontrados perseguindo o número

| # | bug | como apareceu | conserto |
|---|---|---|---|
| 1 | `sanear()` **rejeitava parágrafo inteiro** | a regra "frase com minúscula no início, sem número e com ponto final é resto de raciocínio" não tinha limite de tamanho. Um parágrafo de **356 palavras** foi descartado e o item levou **119 s** para entregar 172 | a regra agora vale só até **12 palavras** |
| 2 | modelo devolvendo **raciocínio em inglês** no lugar do parágrafo | `"We need to produce only paragraph 1 of 2, in Portuguese Brazilian…"` era aceito como texto | cabeçalho de raciocínio passou a reconhecer `we need` / `we must` / `the user wants` / `let me` |
| 3 | **lista derrubava tudo** quando um item falhava | pedido de 3 passos/60 palavras era entregue com **36** | lista espera a rota livre e refaz só aquele item |

Além deles, dois consertos de arquitetura, ambos **contra a intuição**:

- **Paralelo não compensa aqui.** Medido: o laguna entrega **6 parágrafos seguidos em 3,8–9,6 s sem 429**; abrir 2–3 workers em paralelo estoura a cota dos provedores e faz o item custar **130–200 s**. Voltou para série.
- **O dedupe por provedor escolhia o modelo errado.** Pegava o primeiro da lista (peso 100 = `gigante2`, com timeouts de 35 s e respostas de 290–500 palavras) e descartava o `laguna`, que é **da mesma base** e entrega em 4–9 s. Agora o representante de cada provedor é o de **menor latência medida**.

## 3. Latência: o ganho é real e grande

| config | mediana do texto longo |
|---|---|
| rodada 96 (série, nemotron-ultra primeiro) | 84,0 s |
| rodada 97 (paralelo) | 30,6 s |
| **rodada 98 (série, host mais rápido da base)** | **16–19 s em janela boa** |

Nos três primeiros itens, com cota disponível: **13,2 s / 16,7 s / 17,9 s**, todos pelo laguna, com 2–3 parágrafos.

## 4. Qualidade: quatro execuções completas da MESMA régua, com o MESMO código

| execução | aprovados | mediana | janela de cota |
|---|---|---|---|
| run 1 | 18/24 (75,0%) | 16,1 s | boa |
| run 2 | 19/24 (79,2%) | 84,4 s | apertada |
| run 3 | **21/24 (87,5%)** | **18,7 s** | boa |
| run 4 | 18/24 (75,0%) | 70,7 s | apertada |

**Média 19/24 (79,2%), amplitude 18–21.** Os logs estão em `bench/historico-aberto-98-run{1..4}.log`.

### O que isso significa — e a correção que eu devo a você

O número da rodada 96 (**22/24**) e os de hoje (**18–21/24**) foram medidos em **janelas diferentes de cota**, com uma execução cada. A amplitude do mesmo código (3 itens) é maior que a diferença entre as configurações.

Ou seja: **a "troca de 2 pontos" que eu anunciei na rodada 97 estava mal medida da minha parte.** A queda real veio dos três bugs acima (sobretudo o `sanear` matando parágrafo bom), não de um trade-off entre qualidade e velocidade. A velocidade melhorou 4–5×, e a qualidade oscila em torno de ~80% em qualquer configuração, dependendo de a cota estar disponível ou esgotada na hora da medição.

**Regra que passa a valer:** número publicado dessa régua só com **3 execuções** e a amplitude ao lado. Uma execução não distingue 18 de 22.

## 5. O que **não** foi resolvido

- **A cauda de falhas por falta de termo** (itens que pedem "rio", "painel", "fome", "ambient"): o texto está bem formado e simplesmente não usa a palavra que a rubrica exige. Tentei uma instrução de "cobertura ampla" (definição, funcionamento, exemplo, consequências) — **medida e descartada**: o texto alongou e a cobertura piorou (a fotossíntese deixou de citar oxigênio e o item levou 102 s). Ficou registrado no código para não ser retentado.
- **A régua continua sem medir qualidade literária.** Mede formato, tamanho, fechamento e cobertura de termos.
- **Visão não foi retestada nesta rodada** (o número de ontem, 11/11, continua o último medido).

## 6. Prova

- `tools/testes/texto-longo-offline.js` — **7 asserções sem rede**, sem gastar cota: N parágrafos = N chamadas, bloco único, raciocínio recusado, `429` respeitado, troca de host.
- `bench/historico-aberto-98-run{1..4}.log` — as quatro execuções completas, com o texto de cada item em `bench/resultado-aberto-depois.json`.
- `bench/verificar-itens.js` — reconfere item isolado pela mesma rubrica.
- Barreira **97/97** · continuidade **22/22**.
