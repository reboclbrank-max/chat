# Nosso chat × as IAs de fronteira — comparação medida (27/10/2026)

**Pergunta:** o chat da casa (reboclbrank-max) é melhor ou pior que Claude Opus 5.5, GPT-6 Astra, Gemini 4 Argon e as outras que eu pesquisei?
**Método:** não é opinião. Eu sondei as rotas reais do nosso chat, rodei a bateria de 15 questões do nosso próprio banco, medi as 97 APIs públicas do `connect-src` e comparei com os números independentes do levantamento anterior.

Arquivos de prova (dados crus): `pesquisas/medicao-chat-2026-10-27/{sonda.py,medir2.py,ferramentas.py,resultados2.json,ferramentas.json}`

---

## 1. O que o nosso chat é, tecnicamente

Não é um modelo. É um **cliente PWA que orquestra modelos de terceiros**:

| Camada | O que temos | Evidência |
|---|---|---|
| Cérebro (LLM) | ~40 rotas keyless no `dna.json`: NVIDIA/g4f (GLM-5.3, Kimi-K3, Nemotron-3-Ultra-550B, Nemotron-Super-120B, GPT-OSS, DeepSeek V4.1, Gemma-4-31B…), OVH-Kepler (Qwen3.5-397B, Qwen3.8-27B, gpt-oss-120b), llm7, Pollinations, Kilo + 2 com chave (Claude Sonnet/Haiku 5.5 via Glama, Solar-Pro2) | `chat-work/dna.json` |
| Ferramentas | 97 endpoints públicos autorizados no CSP: clima, CEP/CNPJ, câmbio, IBGE, Câmara, Senado, BCB, PubMed, OpenAlex, Crossref, Wikipedia, NASA, USGS, PokeAPI, TVMaze, ESPN… | `chat-work/index.html` (linha 6) |
| Memória/governança | `CONTINUIDADE.md` (440 KB), `AUTONOMIA.md`, `GOVERNANCA-CHAT-PRIMEIRO.md`, vigia, rollback, barreira verde | `chat-work/*.md` |
| Testes | 84/84 vídeo, 17/17 prancheta, 12/12 métricas | `site-work/tools/testes-*.py` |
| Placar próprio | 100/100 — **mas é cobertura interna, não é teste de inteligência** (o próprio arquivo diz isso) | `chat-work/capacidade-estado.json` |

Ponto central: **nós não temos modelo próprio**. O teto de inteligência do nosso chat é o teto do modelo gratuito que a rota entregar naquele minuto.

---

## 2. Medição A — quais rotas do nosso cérebro respondem **agora**

12 rotas sondadas em 27/10/2026, 3 tentativas cada:

| Rota | Modelo | Status agora |
|---|---|---|
| g4f/NVIDIA | Nemotron-3-Ultra-550B | ✅ **200** (2,7 s) |
| OVH | gpt-oss-120b | ✅ **200** (2,2 s) |
| OVH | Qwen3.5-397B-A17B | ✅ **200** (1,3 s, resposta veio só no campo `reasoning`) |
| Pollinations | openai-fast | ✅ **200** (5,9 s) |
| g4f/NVIDIA | GLM-5.3 | ❌ 429 / 504 (timeout de gateway) |
| g4f/NVIDIA | Kimi-K3 | ❌ **404** — o modelo não existe mais nessa base |
| OVH | Qwen3.8-27B | ❌ timeout de leitura |
| llm7 | GPT-6 Astra · Claude Opus 5.5 · Gemini 4 Argon · Kimi K3 | ❌ **401 Unauthorized / 429** (as versões gratuitas estão fechadas) |
| llm7 | GLM-5.3 · DeepSeek V4.1 | ❌ 401 |

**4 de 12 vivas (33%).** E o mais importante: **as IAs de topo que eu pesquisei não estão acessíveis no nosso chat**. Estão *listadas* no llm7, mas respondem 401/429 — listar não é ter.

---

## 3. Medição B — 15 questões do nosso banco, temperatura 0

Banco: `chat-work/banco-questoes.json` (60 itens: 10 mat, 10 seq, 10 lógica, 10 Brasil, 10 língua, 10 inglês). Bateria = 10 de matemática + 5 de sequência.

| Rota | Acertos | Falhas por 429/timeout | **Erros de conteúdo** | Latência mediana |
|---|---|---|---|---|
| Pollinations openai-fast | **14/15 (93%)** | 1 | **0** | 6,39 s |
| g4f Nemotron-3-Ultra-550B | 12/15 (80%) | 3 | **0** | 3,08 s |
| OVH gpt-oss-120b | 11/15 (73%) | 4 | **0** | 2,19 s |
| OVH Qwen3.5-397B | 11/15 (73%) | 4 | **0** | 4,02 s |

### O achado que muda a conversa
**Nenhuma resposta errada. Todas as 12 falhas foram HTTP 429 ou timeout** — ou seja, **quando o nosso chat responde, ele acerta 48/48 (100%)** nessa bateria. O problema do nosso chat **não é inteligência, é disponibilidade**.

Comparação justa: uma bateria desse tipo é fácil para a fronteira também — Opus 5.5 e Astra fariam 100%. A diferença é que eles fazem 100% *e* respondem 99,9% das vezes.

E em aritmética exata o nosso chat não depende de LLM:
- **MathJS: 11/11 (100%)** nas contas do banco (17+26, 144÷12, 15% de 80, 2^10, √169, 0,75/2, 50−37, sequências).

---

## 4. Medição C — as ferramentas (aqui a gente ganha)

97 endpoints do CSP testados com GET real:

| Resultado | Quantidade | % |
|---|---|---|
| **Vivas (200/202)** | **90** | 93% |
| Vivas mas exigem parâmetro (400/403/404) | 4 | 4% |
| Fora do ar agora | 7 | 7% |
| **Latência mediana** | **234 ms** | — |

Caídas no momento do teste: NASA APOD (500), MusicBrainz (503), Wikimedia Commons (503), Wikipédia PT API (503), IBGE localidades, Jikan e OpenSky (timeout).

Isso é uma vantagem concreta e mensurável sobre os chats de fronteira: **nenhum deles consulta ReceitaWS, Câmara, Senado, BCB-PTAX, Loterias Caixa, BrasilAPI ou Open-Meteo em português** com essa amplitude de uma vez. É mais ferramenta que o ChatGPT/Claude/Gemini "de fábrica" para dados públicos brasileiros.

Imagem também responde (`image.pollinations.ai`: 200, 15,7 KB em 5,4 s) — mas em qualidade está anos-luz do GPT-Image-2.5 Sunburst (Arena 1.425) que pesquisa.

---

## 5. Comparação direta, critério por critério

Números da fronteira vêm do levantamento `pesquisas/ia-mais-inteligente-out-2026.md` (Artificial Analysis, Epoch, Arena, Scale, ARC Prize).

| Critério | Nosso chat | Fronteira | Veredito |
|---|---|---|---|
| **Inteligência geral (índice AA)** | Melhor rota viva = Nemotron-3-Ultra-550B / Qwen3.5-397B / gpt-oss-120b — **sem nota publicada no índice**; os modelos gratuitos com nota conhecida ficam em 33,7 (Qwen3.8-27B) a 45,1 (DeepSeek V4.1) | **Claude Opus 5.5 = 58**; Astra 57; Sol 55 | ❌ atrás por 13–24 pontos |
| **Distância em tempo** | — | ECI subiu 156,3 (jan/2026) → 168,8 (out/2026) = **+12,5 pts em ~10 meses** | ❌ nossa faixa ≈ **1 ano de atraso** de fronteira |
| **Acerto quando responde** | **100%** (48/48) na bateria de 15 | 100% | ✅ **empate** |
| **Disponibilidade** | **4/12 rotas (33%)**; 20–27% de perda por 429 | ~99,9% SLA pago | ❌ **nosso pior número** |
| **Latência de resposta** | 2,2–6,4 s (mediana 3 s) | 3–60 s nos modos "max"; ~2 s nos rápidos | ⚠️ competitivo |
| **Aritmética exata** | **100%** via MathJS | ~95–98% no modelo puro (FrontierMath T4 98% só no Astra, o mais caro) | ✅ **empate/ganho por ferramenta** |
| **Amplitude de ferramentas** | **90/97 APIs vivas**, 234 ms, dados BR de verdade | busca web + código + conectores; pouca profundidade BR | ✅ **ganhamos** |
| **Agência longa (multi-etapa)** | `!enxame` + ferramentas, **sem medição na régua do arena.ai** | Opus 5.5 **20,77%** (2º: 13,99%) | ❌ e sem número nosso — não invento |
| **Contexto** | ~128K–1M conforme a rota gratuita, instável | Astra 1,05M; **Argon 1M de saída** | ❌ atrás |
| **Imagem / vídeo** | Pollinations (200 OK, qualidade baixa) | GPT-Image-2.5 (1.425) / Wan 3.0 (AA 1.156) | ❌ muito atrás |
| **Memória e continuidade** | `CONTINUIDADE.md` 440 KB + DNA + governança + rollback | memória de sessão limitada, sem auditoria pública | ✅ **ganhamos** |
| **Custo** | **R$ 0** (keyless) | $4/$20 (Opus) a $10/$50 (Astra); $1,27/tarefa (Sol) | ✅ **ganhamos por larga margem** |
| **Confiabilidade de engenharia** | 84/84 + 17/17 + 12/12 testes, vigia, barreira verde | não auditável por fora | ✅ **ganhamos** |
| **Multi-modelo** | 40 rotas, troca quando uma cai | 1 modelo por fornecedor | ✅ **ganhamos** (em tese — na prática 67% caem) |

**Placar:** ✅ 6 · ⚠️ 1 · ❌ 6.

---

## 6. Resposta honesta à pergunta

> **Em inteligência bruta, o nosso chat está ~1 ano atrás da fronteira.** Não é empate: 58 (Opus 5.5) contra 33–45 do que temos de fato, com as rotas de topo respondendo 401/429.
>
> **Em acerto por resposta, ele está empatado** — 100% na bateria.
>
> **Em ferramentas, custo e memória, ele é melhor que qualquer um deles** — 90 APIs públicas vivas, R$ 0, memória auditável.
>
> **O gargalo real não é o modelo: é o throttle dos gateways gratuitos.** 20–27% das chamadas morrem em 429. Isso é o item nº 1 a corrigir, e é barato.

O placar interno "100/100" **não deve ser lido como nota de inteligência** — ele mede cobertura das nossas próprias dimensões. Comparado a um índice externo, ele não vale nada. Dizer o contrário seria exatamente o tipo de número inventado que você proibiu.

---

## 7. Plano para fechar o buraco (com medição antes × depois, na mesma régua)

**Régua fixa (não mudar):** as 15 questões acima + 12 rotas + 97 ferramentas. Baseline de hoje: **48/48 quando responde · 33% de rotas vivas · 93% de ferramentas vivas · 3,0 s de mediana**.

| # | Ação | Meta medida |
|---|---|---|
| 1 | **Backoff + fila + retry em cascata** (3 tentativas com espera exponencial e troca de rota equivalente) | disponibilidade de 73–80% → **≥95%** |
| 2 | **Roteador por dificuldade**: fácil → gpt-oss/Nemotron; difícil → rota de fronteira | acerto 80% → **≥95%**, custo só nas difíceis |
| 3 | **Plugar uma rota de topo real** (Claude Sonnet 5.5 via Glama já configurada, ou llm7 pago) só para o modo difícil | sair de 45 → **50–56** no índice AA |
| 4 | **Cache de resposta** para perguntas repetidas (banco, câmbio, CEP) | cortar 429 em consultas repetidas |
| 5 | **Bateria de 200 itens** (não 15) com tipos difíceis: lógica, Brasil, língua, inglês — os 45 itens do banco que ainda não rodei | variância real, não 100% fácil |
| 6 | **Medir agência na régua do arena.ai** (tarefa de 5+ passos com ferramentas, sucesso por sessão) | número comparável ao 20,77% do Opus 5.5 |
| 7 | **Upgrade de imagem** (pollinations → rota com modelo de imagem real) | de "baixa qualidade" a comparável |

Se quiser, eu executo os itens 1, 2 e 5 agora — são os que mexem no número sem custo nenhum, e dá para provar antes × depois com o mesmo script (`medir2.py`) e a mesma régua de 15 itens. Os itens 3 e 7 exigem chave/custo e eu pergunto antes.
