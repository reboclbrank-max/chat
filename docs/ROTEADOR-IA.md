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

## 11. v6 (28/10/2026) — visão com régua, parágrafos em paralelo

**Visão.** Sondagem com PNG e content-array OpenAI, rota por rota: Kilo 404 ("No endpoints found that support image input"), g4f 502 ("multimodal processing is not enabled"), Pollinations 400 ("does not support image input"), **OVH Qwen3.5-397B 200** (leu `7`, `Q`, `esquerda`). Rota `ovhvl` no roteador, vazão de 6 s, 5 tentativas respeitando `Retry-After`. Régua: `bench/banco-visao.json` (11 imagens, gabarito objetivo) + `bench/medir-visao.js` → **11/11 (100%)**, mediana 2,4 s. Sem rota de visão, o roteador devolve sem-resposta.

**Texto longo, latência.** `tools/sonda-latencia-paragrafo.js`: laguna 9,2 s e compliant; nemotron-ultra 20,4 s e 359 palavras (estoura); qwen-397 11,1 s mas devolve raciocínio sem conclusão; lightning acima de 60 s. Parágrafos vão em paralelo (até 3 workers em 3 provedores distintos), com o host escolhido por **latência medida** — antes o primeiro da lista era o nemotron-ultra e o laguna era descartado por ser do mesmo provedor. Item de 3 parágrafos: 223 s → ~26 s.

**Resíduos de conteúdo.** `Atenciosamente.` aplicado por código em e-mail/carta; falsos positivos `agradeço a atenção` e `ficamos à disposição` deixaram de contar como despedida; lista cobra a cota de palavras por item; `numerarLista` numera listas soltas.

## 12. v7 (29/10/2026) — investigação e retificação metodológica

Foram corrigidos casos de `sanear()` que rejeitavam texto extenso, cabeçalhos de raciocínio e
falhas de recuperação de lista. Isso **não demonstra que esses casos causaram a diferença** entre
as execuções da régua.

Retificação: os quatro resultados 18, 19, 21 e 18 de 24 foram descritos como "mesmo código".
Os logs correspondem, respectivamente, a versões distintas: `90bcece`, `459acc1`, `a2bb362` e
`8fd04dd`. Cotas e condições também variaram. Esses números não provam nem equivalência
estatística nem uma relação causal entre paralelismo, velocidade e cobertura. Logs preservados em
`bench/historico-aberto-98-run{1..4}.log`. Comparações futuras devem incluir versões e repetições.

## 13. v8 (29/10/2026) — planejamento e limite da primeira medida de estilo

Duas execuções da mesma versão `5e6d626` deram **22/24 e 20/24** na rubrica original, com
medianas convencionais recalculadas de **23,4375 e 76,1385 s**, respectivamente. Os antigos
JSONs rotularam o valor central superior como mediana: 24,006 e 82,861 s. Preservamos as respostas e
logs em `bench/resultado-aberto-99-{a,b}.json` e `bench/historico-aberto-99-{a,b}.log`.
Amostra pequena; não prova causalidade nem substitui a terceira repetição anteriormente proposta.

Retificação do gabarito: a primeira execução reprovou "espalhamento de Rayleigh" (#11); a
segunda reprovou "painéis" (#22). O histórico permanece reprodutível no banco anterior. Com as
alternativas justificadas para #6, #11 e #22 no novo banco, e apenas reavaliando as mesmas
respostas, as contagens passam a 24/24 e 22/24. Isso **não** atesta veracidade: a resposta A #8
contém um número contradito pelo IBGE. Não se trata de uma nova geração.

Retificação do estilo: a v1 não reconhecia muitos conectivos acentuados ou seguidos de pontuação
 e contava tipos em vez de ocorrências. Os antigos números 0,5→0,4 e as classificações de texto
"doente" são inválidos. A v2 corrige a contagem e não atribui qualidade por limiares inventados.
Ver `docs/AVALIACAO-TEXTO-ABERTO.md` para os limites e uma leitura qualitativa identificada.

**Visão:** nova execução da régua de 11 imagens simples: 11/11, mediana **2,6 s na última
chamada ao provedor**, duração total 260 s. A medida não registrou a duração de cada pedido
incluindo espera; não é correto chamar 2,6 s de tempo total do usuário.


## 14. v9 (29/10/2026) — gabarito auditado, qualidade sem placar falso

O banco original e as respostas completas foram preservados; quatro alternativas foram
justificadas em `docs/AUDITORIA-REGUA-ABERTA-100.md`. A reavaliação das mesmas respostas não é
geração nova. Uma passada real do gerador, com a rubrica original, deu **21/24 e 26,2815 s** de
mediana convencional (o JSON antigo indica 27,580 s, valor central superior); o holdout de seis perguntas deu **5/6** (o item #104 ficou com um parágrafo, após
235,5 s). Ambos usaram o código com hash `eccc2a2d…`, anterior apenas à adição dos metadados
de aviso de formato e verificação. A repetição com esses metadados foi interrompida após 4/24
itens, sem placar, quando um item levou 307 s. O arquivo `bench/diff-avisos-100.patch`, aplicado
em reverso, reconstitui o hash da versão medida; os testes de aviso não alteram o texto bruto.

O cronômetro da visão agora registra duração total por pedido além da última tentativa. No novo
teste, 11/11: mediana real **9,49 s**, mediana da última chamada 3,79 s, total 260 s. O dado
anterior de 2,6 s era apenas a última chamada, não o tempo total do usuário.

O prompt não obriga nome próprio, data ou número não verificado. O plano é recebido como lista
multilinha e filtrado; a segunda tentativa tem prazo próprio limitado. Testes offline conferem que
uma falha de plano não derruba o texto e que um bloco bom não é descartado durante o retry.

`bench/estilo.js` v2 corrige o bug de acentuação/pontuação e registra ocorrências, mas só fornece
indicadores descritivos. `docs/AVALIACAO-TEXTO-ABERTO.md` apresenta rubrica e uma leitura
qualitativa exploratória pelo assistente, não uma validação humana independente. O roteador
marca respostas abertas como **não verificadas**; quando o fallback não entrega a quantidade de
parágrafos/itens solicitada, informa o aviso às quatro interfaces, sem modificar o texto bruto.

## 15. v10 (29/10/2026) — recuperação, checkpoint e limites de verdade

A rodada 101 tenta uma resposta completa também em listas, conserva trechos fechados, não
apaga linhas de continuação e permite retomar uma rota depois de seu cooldown dentro do prazo,
sem antecipar `Retry-After`. Parcial é sinalizado e não é armazenado no cache. O medidor grava
cada item, identifica código/banco/rubrica/medidor por hash e não aceita prefixo como placar.
A mediana para quantidade par foi corrigida e os números antigos acima foram retificados a
partir dos tempos individuais, sem alterar os JSONs históricos.

Na **mesma régua original**, 100 → 101 final deu 21/24 → 22/24; holdout 5/6 → 6/6.
A 101 intermediária deu 15/24 e 5/6; todas as versões ficam registradas, não só a melhor.
O #16 final passou no formato mas contém “floração” em vez de uma etapa identificável de
tratamento, e o #104 generalizou incorretamente o bloqueio de reservas de obras emprestadas.
A rubrica não verifica essas afirmações. No banco suplementar contextual, reavaliando as
**mesmas respostas**, 100 e final 101 têm 23/24; o banco original não foi alterado.
Ver `docs/RODADA-101-RESULTADOS.md` para falhas, fontes, horários, rastros, medidor e limites.


## 16. v11 (29/10/2026) — trechos públicos auditáveis e fim do cadastro pendente

**Estado: opcional, desligado por padrão.** A comparação pareada completa desta rodada mediu a camada ligada em toda pergunta aberta e ela **não superou** a versão anterior: 17/24 contra 21/24 no banco original, 5/6 contra 6/6 no holdout, 6/6 contra 5/6 no conjunto novo e 34/44 contra 37/44 no total. Por isso o envio mantém o comportamento anterior e só consulta a base com `fontes: true` explícito (`!melhor fontes: <pergunta>` na interface). Detalhes, discordâncias e limites em `docs/RODADA-102-RESULTADOS.md`.

Quando pedida, a camada consulta **antes de gerar** um arquivo local e versionado, `fontes-publicas.json`, com trechos curtos de páginas públicas escolhidas (wikipedia com `oldid` fixo, CAESB, BNDES, Secretaria de Educação de Goiânia, Biblioteca de Itajaí). Não há busca na web no momento da pergunta: a pergunta não vai a buscador, a terceiro novo ou à URL de origem. O casamento é aproximado por tokens, aceita no máximo dois trechos, exige cobertura mínima da pergunta e recusa fonte sem relação (por exemplo, “juros compostos” não recebe a página de compostagem). Se não houver cobertura suficiente, o texto sai **sem** fonte local e **sem citação decorativa**.

A fonte é tratada como dado não confiável: URL só HTTPS e host de `pt.wikipedia.org` ou `*.gov.br`, sem credencial ou porta; trecho com aparente instrução é descartado; o pedido recebe instrução explícita para não seguir ordens do trecho, não tratar regra institucional como universal e não inventar referência. A resposta continua marcada `verificacaoFactual: nao_verificada`; os usados vão em `fontesConsultadas` e a interface mostra ligação, data do retrato, licença e o aviso de que a fonte **não verifica cada afirmação**. O cache separa pedidos com e sem fontes.

Limites declarados: é um conjunto pequeno e datado, escrito e revisado pelo mesmo agente que fez a solução; não cobre notícia, lei atualizada, números recentes ou tema fora da lista; link vivo não prova o conteúdo nem a adequação ao caso; o filtro de injeção é conservador, não uma garantia. Um modelo pode ignorar ou distorcer o trecho. Isso **não** é verificação factual automática, aprendizado contínuo nem treinamento do modelo.

A mesma rodada pausou a rota LLM7 no produto: os termos exigem aprovação escrita para integração em outro produto e não há prova de autorização. As chamadas diretas foram retiradas do chat principal, das quatro células e do `dna.json`; a reserva de texto aberto de e-mail/Telegram foi substituída por rota OVH já gratuita, exercitada em teste com rede simulada. Entradas antigas no navegador continuam sujeitas a allowlist ou bloqueio de host. Um proxy de terceiro não é identificável por esse filtro e permanece fora do alcance desta mudança.
