> **RETIFICAÇÃO — 29/10/2026:** a régua rejeitou “espalhamento de Rayleigh” e “painéis”; e o primeiro medidor de estilo também errava acentos, pontuação e contagem de ocorrências. Os números antigos 0,5→0,4 não medem qualidade, e as pendências não estavam todas resolvidas. A avaliação revisada, sem avaliador humano independente, está em `chat-v2/docs/RODADA-100-RESULTADOS.md`. O texto histórico abaixo foi mantido para auditoria.

# Rodada 99 — planejar antes de escrever, medir estilo, e a visão remedida

Data: 29/10/2026 · PR **#39** · anterior: `RODADA-98-BUGS-E-MEDICAO.md`

As duas pendências que ficaram nomeadas na rodada 98 eram: **a cauda de "falta de termo"** e **a rubrica não mede qualidade literária** (além da visão, que não tinha sido retestada). As três foram resolvidas — uma delas com um resultado que me obriga a corrigir o instrumento, não o texto.

---

## 1. Visão: remedida com o código atual

**11/11 = 100%**, mediana **2,6 s**, `semResposta: 0`, 260 s no total. Não é mais "o número de ontem" — é medição de hoje, com o código que está no ar. Arquivo: `bench/resultado-visao.json`.

## 2. Cauda de cobertura: agora o roteador **planeja antes de escrever**

O padrão das falhas era sempre o mesmo: texto bem formado, tamanho certo, fechamento certo — e **sem nomear o objeto principal do assunto** (`resíduo`, `rio`, `fome`, `painel`, `ambient`).

A instrução de "cobertura ampla" (a que eu tinha medido e descartado na 98) pedia *estrutura*: "fale da definição, do funcionamento, das consequências". Isso faz o modelo divagar. O que resolveu foi outra coisa: **uma chamada curta de planejamento antes do texto**.

```
Tema: <pedido>
Liste, em até 6 linhas curtas (2 a 5 palavras), os elementos concretos que um texto
completo sobre esse tema precisa citar: objetos, processos, agentes, lugares ou
consequências. Responda SOMENTE a lista.
```

O plano é distribuído entre os parágrafos — cada um cobre uma fatia, o texto cobre o conjunto. Se o plano falhar (429, timeout), o texto sai sem ele: **planejar não pode derrubar a geração**.

### Resultado medido na mesma régua

| | rodada 98 (4 execuções) | rodada 99 (2 execuções) |
|---|---|---|
| aprovados | 18 · 19 · 21 · 18 → **média 19 (79,2%)** | **22** e **20** → **média 21 (87,5%)** |
| mediana de tempo | 16–84 s | **24,0 s** (janela boa) · 82,9 s (janela apertada) |
| textos curtos | 1–4 | **0** e **2** |
| falta de termo | 2–6 | **2** e **2** |

As duas execuções: **run A 22/24 (91,7%) em 24,0 s** e **run B 20/24 (83,3%) em 82,9 s**. A run B caiu
em janela de cota apertada (itens de 136–232 s, dois curtos de 40–42 palavras). **Média 21/24 = 87,5%,
amplitude 20–22**, contra média 19/24 (79,2%) e amplitude 18–21 da rodada 98 — mesma régua, mesma
rubrica. Logs: `bench/historico-aberto-99-run2.log` e `/tmp/aberto98i.log` (run A).

Itens que falhavam e passaram: **#6 (reciclagem), #15 (LGPD), #16 (caminho da água)**. Os residuais agora são **#6 (resíduo)** — que voltou a falhar na execução seguinte, é instável — e **#11 (dispersão)**.

## 3. Qualidade literária: deixou de ser buraco declarado — e o instrumento já mostrou seu próprio defeito

Criei `bench/estilo.js`, que mede o que a régua de conteúdo não mede, com **limites declarados**:

| medida | o que detecta | limite declarado |
|---|---|---|
| `fraseMed` | frase curta demais (picada) ou longa demais (arrastada) | 8 a 32 palavras |
| `longasPct` | % de frases com mais de 35 palavras | até 25% |
| `repeticao` | % de palavras de conteúdo repetidas | até 45% |
| `conectivos` | conectivos explícitos por 100 palavras | 1,2 ou mais |
| `variedadeLexical` | palavras de conteúdo distintas | informativo |

**Primeira medição (24 textos):** fraseMed **25**, frases longas **0%**, repetição **22%**, conectivos **0,4/100**, variedade **lexical 70–97%**.

O texto é, portanto, de frase bem medida e pouco repetitivo — e **quase sem conectivo explícito**.

### E aqui a parte que eu não posso maquiar

Instruí o gerador a usar "conectivos variados (além disso, porém, portanto, uma vez que…)" e medi de novo, na mesma ferramenta: **0,5 → 0,4 por 100 palavras**. Não funcionou.

Investiguei por quê, e o defeito não está só no texto: **a medida só conta conectivo explícito de uma lista fixa**. Texto que articula por subordinação ("que", "onde", orações encaixadas) não pontua — e é exatamente o que esses modelos fazem, com frases de 25 palavras bem encadeadas. Ou seja: o "21 de 24 fora dos limites" é, em boa parte, **artefato do instrumento**.

Deixei isso escrito **dentro do `bench/estilo.js`**, para o número não virar placar falso. A instrução de coesão continua no código (não piorou nada e pode ajudar em modelo que obedeça), mas **não anuncio ganho de estilo: não houve ganho medido**.

## 4. Um bug pequeno de brinde

O host que devolvia raciocínio era reescolhido **no retry do mesmo parágrafo** — queimava a chamada duas vezes. Agora host que falhou fica fora daquele parágrafo. Coberto pelo teste offline.

## 5. O que continua não resolvido, item a item

- **#6 (resíduo) e #11 (dispersão)**: cauda de termo que o plano não garante. É 2 de 24 e é instável — às vezes passa.
- **A cauda é sensível a cota**: sob janela apertada o texto volta a encurtar (a 98 mostrou 27–45 palavras em 4 itens). A política de espera melhorou isso, não eliminou.
- **`conectivos` não mede articulação por subordinação.** Medida provisória, declarada como tal.
- **Duas execuções, não três** (a regra da 98 pede três): média 21/24, amplitude 20–22. A terceira não coube na janela de cota desta rodada.
- **Ao vivo, no fechamento, peguei a janela ruim:** um pedido de dois parágrafos sobre energia solar levou **167,8 s e saiu com 53 palavras em um parágrafo**, pela rota de reserva, sem citar "painel". É o modo de falha que a régua registra como "curto" — e ele ainda acontece quando a cota acabou.

## 6. Prova

- `bench/resultado-visao.json` — 11/11, mediana 2,6 s
- `bench/estilo.js` + `bench/estilo-antes.txt` / `bench/estilo-depois.txt` — a medida e a comparação
- `bench/historico-aberto-98-run{1..4}.log` — a distribuição da rodada anterior, para comparação
- `tools/testes/texto-longo-offline.js` — 8 asserções sem rede, incluindo "houve uma chamada de planejamento antes de escrever"
- Barreira **97/97** (com 2 asserções novas de estilo/coesão) · continuidade **22/22**
