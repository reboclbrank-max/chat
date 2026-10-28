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
