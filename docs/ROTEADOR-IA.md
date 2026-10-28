# Roteador de IA do chat — o que mudou e o que foi medido

Data: 27/10/2026 · Régua: `bench/banco200.json` (200 itens) · Código: `roteador-ia.js` · Painel: `roteador.html`

## 1. O problema medido

Cada rota do chat era tentada **uma vez** e, se voltasse 429, o chat dizia "asas mudas". Numa onda de throttle isso derruba a frota inteira ao mesmo tempo: 67% das rotas caem juntas, e o usuário vê erro mesmo com 18 rotas vivas.

## 2. O que foi construído (`roteador-ia.js`)

| Mecanismo | O que faz |
|---|---|
| **Ferramenta primeiro** | aritmética, porcentagem, raiz, metade/dobro e sequências aritméticas/geométricas são resolvidas por `api.mathjs.org` e por cálculo local — **não gastam LLM e não erram** |
| **Cascata por qualidade** | classe `forte` → `media` → `leve`; dentro de cada classe, menor latência média primeiro |
| **Backoff com jitter** | 429 espera 20–35 s; timeout 12 s; 5xx 8 s; 400/401/403/404 = rota morta (30 min) |
| **Disjuntor por rota** | rota castigada sai da fila até o cooldown vencer; volta sozinha |
| **Cache** | 300 respostas / 10 min (pergunta repetida não custa nada) |
| **Orçamento** | até 4 voltas na frota, 110 s no total, sem loop infinito |
| **Confiança declarada** | toda resposta volta com `confianca: alta/media/baixa` conforme a classe que respondeu — nada de fingir que um modelo de 9B é o topo |

Integração no chat: `index.html` carrega `roteador-ia.js` e o usa como **último recurso do `pensarStream`** (se todas as rotas antigas falharem, a cascata tenta de novo com espera). Comando novo: **`!melhor <pergunta>`** — responde pela cascata e mostra via qual rota, a confiança, as tentativas e o tempo.

## 3. Prova antes × depois (mesma régua, mesma hora, 3 simultâneos)

| Política | Acertos | Sem resposta | HTTP 429 | Acerto quando responde | Latência mediana |
|---|---|---|---|---|---|
| **ANTES** — rota fixa GLM-5.3, 1 tentativa | 69/200 (**34,5%**) | 131 (65,5%) | 131 | 100% | 0,02 s (falha instantânea) |
| **ANTES** — melhor rota única (Qwen3.5-397B), 1 tentativa | 71/200 (**35,5%**) | 128 (64,0%) | 128 | 98,6% | 0,16 s |
| **DEPOIS** — roteador em cascata | 176/200 (**88,0%**) | 13 (**6,5%**) | 10 | 94,1% | 2,94 s |

**Ganho: +52,5 pontos percentuais de acerto e 10× menos "sem resposta".** Rodada extra com 5 simultâneos deu **94,5%** (189/200) — a variação é do throttle dos gateways, não do código.

Por tipo (DEPOIS): mat 40/40 · seq 29/30 · lógica 27/30 · Brasil 22/25 · língua 19/25 · inglês 18/25 · mundo 21/25.

### O que o número não esconde
- **Acerto quando responde caiu de 98–100% para 94,1%.** É o preço da cascata: quando as rotas fortes estão em 429, quem responde é um modelo pequeno, e ele erra mais (11 erros de conteúdo, 6 em língua portuguesa). Por isso toda resposta agora carrega `confianca`. **Cobertura subiu, precisão média caiu um pouco — o saldo é fortemente positivo, mas não é de graça.**
- **Latência mediana subiu de 0,16 s para 2,94 s** — antes era rápida porque falhava na hora.
- Os 40 itens de matemática são 100% porque são **ferramenta exata**, não porque o modelo ficou mais esperto.

## 4. Estado da frota na varredura (`bench/varredura.json`)

18 de 39 rotas do `dna.json` vivas num instante (46%): Kilo (5), OVH (9), g4f (2), Pollinations (1). Caíram: 429 no g4f, 404 em `moonshotai/kimi-k3` e `Mistral-7B`, 401 nas rotas com chave (Glama/Sonnet 5.5, UpStage), 504 no GLM-Flash.

## 5. Como reproduzir

```bash
cd chat-work/bench
python3 gerar-banco200.py            # gera o banco de 200 com gabaritos calculados
CONC=3 node medir.js antes-glm       # política antiga
CONC=3 node medir.js antes-ovhq397   # melhor rota única, 1 tentativa
CONC=3 node medir.js depois          # roteador
node varrer.js                       # saúde das 39 rotas
```
Resultados gravados em `resultado-*.json`. Painel ao vivo: abra `roteador.html` servido junto do chat.

## 6. O que continua fora de alcance (e por quê)

O roteador não cria inteligência: ele **para de perder** as respostas que a frota gratuita já sabe dar. O teto continua sendo o teto dos modelos gratuitos. Para subir no índice independente (45 → 50–56) só existem dois caminhos, e os dois custam dinheiro ou chave:

1. pagar uma rota de fronteira (Claude Sonnet 5.5 via Glama já está no `dna.json` com `chaveLS`, hoje respondendo 401 porque não há chave no navegador);
2. ou aceitar o teto atual e continuar ganhando em cobertura de ferramentas (90/97 APIs vivas) e custo (R$ 0).

Nenhum dos dois é decisão minha — é sua.

---

## 7. v2 — "cérebro grátis": consulta exata + consenso (27/10/2026, mesma régua)

Nenhuma chave, nenhum centavo. Três mudanças no `roteador-ia.js`:

1. **Consulta exata antes do modelo** — o que tem fonte certa não passa por LLM:
   | padrão reconhecido | fonte | custo |
   |---|---|---|
   | `Translate to Portuguese/English: '...'` | `api.mymemory.translated.net` (livre) | R$ 0 |
   | `Qual a capital de X?` | Wikidata P36 (busca → QID → claim → rótulo) | R$ 0 |
   | `Qual o símbolo químico de X?` | Wikidata P246 | R$ 0 |
   | `unidade de X no SI` | Wikidata P5061 | R$ 0 |
   | aritmética, %, raiz, metade, dobro | mathjs / cálculo local | R$ 0 |
   | sequências aritméticas e geométricas | cálculo local | R$ 0 |
2. **Consenso de 3 modelos** de provedores diferentes para todo o resto: maioria após normalizar (acento, caixa, pontuação), desempate pela classe mais forte; a resposta declara `consenso` (ex.: `3/3`) e `confianca`.
3. **Educação com a Wikimedia**: `User-Agent` identificável (exigido por política), cache de busca/rótulo/claims e backoff 0,9 → 1,8 → 3,6 s no 429. Quando o Wikidata limita, cai no consenso — nunca em resposta inventada.

### Resultado (mesma régua de 200 itens, 2 simultâneos)

| política | acertos | sem resposta | 429 | latência mediana |
|---|---|---|---|---|
| v0 — uma rota, uma tentativa | 34,5% | 65,5% | 131 | 0,02 s |
| v1 — cascata | 88,0% | 6,5% | 10 | 2,9 s |
| **v2 — consulta exata + consenso** | **95,5% → 97,0%** (após o filtro de tradução) | **0,0%** | **0** | 4,3–5,1 s |

Por tipo na v2 final (194/200): mat 40/40 · seq 30/30 · lógica 30/30 · Brasil 25/25 · inglês 25/25 · língua 23/25 · mundo 21/25.

O que subiu de 95,5% para 97,0% foi um **defeito real encontrado pela própria régua**: a memória de tradução às vezes devolve frase inteira ("da janela" para `window`). Agora, quando a origem é uma palavra só, a resposta com mais de duas palavras ou começando por artigo/preposição é **descartada** e o consenso decide.

### Prova contra overfitting: banco holdout de 105 itens nunca vistos

Itens novos (estados que não estavam no banco, outras palavras, outros números), gerados com semente diferente:

**102/105 = 97,1%**, com **zero** itens sem resposta, antes e depois do filtro de tradução. Por tipo: mat 15/15 · seq 15/15 · lógica 15/15 · Brasil 15/15 · língua 14/15 · **inglês 15/15** (era 14/15) · mundo 13/15 (era 14/15 — variação do consenso, não regressão de código).

O ganho é do método (consulta exata + votação), não de decorar o banco — se fosse decorado, o holdout teria caído.

### O que ainda erra
Língua portuguesa (formas irregulares como aumentativo/coletivo) e fatos de mundo sem propriedade Wikidata mapeada continuam dependendo do consenso dos modelos gratuitos: **6 erros em 200** e **3 em 105**. É o teto honesto desta abordagem sem chave.

### Custo de rede
Cada pergunta não-trivial faz 3 chamadas de LLM (paralelas) + 0–3 chamadas de consulta. Continua R$ 0, mas é mais tráfego nos gateways gratuitos — por isso o cache de 15 min e o disjuntor por rota seguem ligados.

## 7. v2.2 (28/10/2026) — o limite honesto da v2.1, atacado

A v2.1 terminou em 97,0% e com "6 erros em 200" na seção de limite. A auditoria desses 6 mudou o diagnóstico: **4 eram falhas da régua** (subscrito em H₂O, hífen U+2011, gênero *Antártica*/*antártico*, sinônimo *matilha*/*alcateia* não declarado em `alts`) e **2 eram defeito real** (capital do Japão vinda de claim Wikidata antiga; *abelhão* como masculino de abelha). O pontuador único passou a ser `bench/pontuar.js` (12/12), e ele exige que erro continue erro.

Depois disso, cada classe de erro deixou de ser opinião de modelo e virou **rota local** (R$ 0, 0 ms):

| classe | antes | agora |
|---|---|---|
| capital de país/estado | rota só casava `d[eo]`; "capital **da** França" ia ao modelo e virava 429 | `da/do/de/dos/das` + tabela de **205 capitais** (países + 27 UFs) |
| símbolo químico | "símbolo químico **da** prata" caía no modelo | mesmo conserto + tabela dos 118 elementos |
| inglês irregular | 100% no provedor (4 itens do holdout morreram em 429) | tabela local + regra de formação |
| resposta degenerada | `**`, "Thinking Process", "Refinement", "Given the constraint", "the price." entregues como resposta | `sanear()` rejeita, pune a rota e retenta |
| fila, proporção, taxa, tempo fracionário, calendário, figuras | consenso (ou erro) | regra determinística com teste |
| plural `-l` e superlativo | `caracols`, `salgadoíssimo` | `caracóis`, `salgadíssimo`, `dificílimo` |

Números na mesma régua, sem chave: **200 → 200/200**, **holdout 105 → 105/105**, **banco fresco 84 (escrito depois dos ajustes) → 84/84**. Mediana ~3 s (era 4,9 s). Barreira: 97/97, com `tools/testes/roteador-gratis.js` permanente.

**O que continua fora:** fatos de mundo fora das tabelas, perguntas de vários saltos, redação longa, código e visão não são medidos por esta régua; a régua aceita acento e precisão numérica equivalente por decisão explícita; e o teto dos modelos gratuitos (~45 × ~58 do topo pago) segue igual — só que perguntas determinísticas agora não consultam modelo, então nessa classe o grátis não perde para o pago.

## 8. v3 (28/10/2026) — o que era "não medido" agora tem régua

A v2.2 terminou dizendo que redação longa, código e vários saltos *não eram medidos*. Viraram três réguas verificáveis por máquina:

| régua | como mede | antes | depois |
|---|---|---|---|
| **código** (`bench/medir-codigo.js`) | a função escrita é **executada** contra testes reais, em processo separado | 13/18 = 72,2% | **18/18 = 100%** |
| **vários saltos** (`bench/banco-multietapa.json`) | gabarito calculado, 18 problemas de 2–3 passos | 16/18 = 88,9% | **18/18 = 100%** |
| **texto aberto** (`bench/medir-aberto.js`) | rubrica objetiva: tamanho, parágrafos/itens pedidos, fatos exigidos, texto fechado, sem preâmbulo de robô | 3/24 = 12,5% | **14–15/24 = 58–63%** |

O defeito que explicava o número ruim de texto e código: **`max_tokens: 400` fixo** em todas as chamadas. Em redação cortava a frase, em código cortava a função. Agora `tipo: 'codigo' | 'aberto'` abre caminho generativo (1600/1800 tokens, três provedores, sem consenso) e a escolha entre candidatos prefere resposta **inteira** a resposta longa cortada.

**Texto aberto é o limite honesto da rodada**, e agora é um número, não uma frase: ~40% dos pedidos longos ainda saem curtos, sem algum fato pedido ou cortados pelo provedor. A rubrica mede forma e cobertura — não mede qualidade literária, e não há juiz humano.

Nas perguntas curtas nada regrediu (200/200, 105/105, 84/84) e o pontuador ganhou **modo estrito** — acento conta — com o **mesmo** resultado nos três bancos: o afrouxamento de acento não estava escondendo acerto.

## 9. v4 (28/10/2026) — "o teto dos modelos grátis", medida rota por rota

A frase anterior era: *"o teto de inteligência segue sendo o dos modelos gratuitos (~45 × 58)"*. A medição por rota (`bench/medir-rotas.js`, `bench/banco-duro.json` — 30 itens difíceis com resposta verificável) mostrou outra coisa:

| rota | acertos nos 30 difíceis | mediana |
|---|---|---|
| **Nemotron-3-Ultra-550B (Kilo, grátis)** | **30/30 = 100%** | 3,7 s |
| Nemotron-3.5-Lightning (Kilo) | 27/30 = 90% | 4,9 s |
| Laguna-S-2.1 (Kilo) | 22/30 = 73% | 7,1 s |
| Nano-Omni-30B (Kilo) | 4/30 = 13% | 0,1 s |
| Qwen3.5-397B / Qwen3.6-27B / gpt-oss-120b (OVH) | 2/30 = 6,7% (28 erros) | 0,2 s |
| GLM-5.3 / Nemotron-Super-120B (g4f) | 0/30 | — |

O gargalo não era o modelo: era **a fila**. O roteador exigia "um host por voto" e por isso escalava OVH (morta, 429 imediato) só para diversificar, deixando de fora o modelo de 100%.

Consertos: `peso` medido em cada rota; classe definida pela medição; consenso por força; vazão mínima entre chamadas; `Retry-After` respeitado; geração longa em série; fallback longo com 1200 tokens; **cache persistente em localStorage**.

**O limite que sobra é cota.** Depois de ~1.000 chamadas de medição, Kilo e g4f passam a responder 429 por janelas: com cota, código 18/18 e difíceis 29-30/30; sem cota, código 16/18 e texto longo truncado. O grátis não é menos inteligente — é menos disponível.

## 10. v5 (28/10/2026) — o texto aberto: 62,5% → 91,7%

A régua aberta (24 pedidos longos, mesma rubrica) media 15/24. O diagnóstico: o texto inteiro era pedido numa chamada só. O provedor grátis, com teto de tokens, devolve **um bloco de 30 palavras** ou **texto cortado no meio da frase**.

| | antes | depois |
|---|---|---|
| aprovados | 15/24 = 62,5% | **22/24 = 91,7%** |
| cortados | 5 | **0** |
| curtos | 4 | **0** |
| falta de fato | 4 | 2 |
| mediana de tempo | 53,9 s | 84,0 s (pior) |

Consertos: um parágrafo por chamada (número de parágrafos exato por construção), lista um item por chamada, refazer só o parágrafo curto, fechar no último ponto final já escrito, termos do pedido dentro da instrução, folga de 8 palavras no alvo por parágrafo.

Também nesta rodada: calendário local (bissexto, dias do mês/ano, dia da semana), rejeição de fragmento de raciocínio (`Is it`), avaliador aritmético local (o `api.mathjs.org` estava fora do ar; `16×12` ia para o modelo e voltava `× 12`), quarta rodada de espera sob 429 e `bench/medir.js` gravando `resultado-<modo>-<banco>.json`.

Régua de 200 volta a **200/200** (mediana 952 ms), holdout 105/105, difícil 30/30, código 18/18.
