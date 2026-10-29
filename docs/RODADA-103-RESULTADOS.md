# Rodada 103 — o que limitava o chat, medido, e o que foi corrigido

Data: 29/10/2026 · ramo `cerebro-103` · base da rodada 102: `ec290aab`

Este documento responde três perguntas com número, não com opinião:

1. de tudo que o chat faz, o que depende de cota?
2. o que de fato limita o chat hoje?
3. o que foi corrigido nesta rodada, e o que isso mudou na régua?

---

## 1. Só existe cota onde há GPU de outra pessoa

Levantamento do código publicado (`index.html`, `chat-*.js`, `roteador-ia.js`):

| Camada | Depende de API? | Cota |
|---|---|---|
| Exportar MD/JSON, imprimir, coleções, favoritos, workspace | não | nenhuma |
| PWA, offline, 135 modelos locais (WebLLM) | não | nenhuma |
| Calculadoras, hash, lembretes, tarefas | não | nenhuma |
| Sincronizar conversas (Issues do GitHub) | sim (API própria) | sem teto prático |
| Wikipédia, IBGE, DuckDuckGo, BCB | sim (pública, sem chave) | limite de ritmo |
| **Gerar o texto da resposta** | **sim** | **tem teto** |

Uma linha de todo o produto depende de cota: a geração de texto.

## 2. O que limitava — medido na janela de 102

Janela `14:13:17Z → 14:51:44Z`, 88 respostas, **208 chamadas** de modelo. **85 falharam (40,9%).**

| Falha | Chamadas | Tempo médio | Tempo total | Peso |
|---|---|---|---|---|
| `timeout` | 21 | 24,8 s | **8,7 min** | maior desperdício |
| `servidor` | 21 | 14,0 s | 4,9 min | 2º |
| `degenerada` | 13 | 11,1 s | 2,4 min | 3º |
| `rate` (cota) | 30 | 0,5 s | **0,2 min** | **o menor** |

**42,1% dos 38,4 minutos da janela foram gastos em tentativa que não virou resposta.**

Por rota:

| Rota | Chamadas | Falhou |
|---|---|---|
| `lagunas` (Kilo) | 97 | 23% |
| `ovhoss20` | 47 | 40% |
| `ultra` (g4f) | 24 | 67% |
| `polli` | 8 | **100%** |
| `ovhq`, `ovhq38`, `ovhq9`, `ovhoss` | 16 | **100%** |

Conclusão medida: **cota é o 4º limitador.** O 1º é gateway sem chave que cai e demora.

## 3. O defeito do gabarito (achado nesta rodada)

As 5 respostas reprovadas de #22 diziam **"painéis"** (4) ou **"módulo"** (1). A rubrica procurava
`painel|placa` — o singular. O plural de *painel* é *painéis*: o **l vira i**, e a regex não casava.

E o banco auditado da rodada 101 **já continha** `pain[ée]is` e a guarda de negação
`(?<!não )(?<!nunca )(?<!jamais )`. A régua de 102 mediu com o banco **anterior** a essa auditoria.
Ou seja: o falso negativo era do motor de avaliação, não da resposta.

### Correção

`bench/equivalencias-rubrica.js` — equivalências só com prova, em três categorias:

| id | tipo | o que aceita | prova |
|---|---|---|---|
| `painel-plural` | MORFOLOGIA | `pain[ée]is` | plural do mesmo substantivo |
| `modulo-fotovoltaico` | FATO | `módulo solar/fotovoltaico` | BNDES: células interligadas formam painéis |
| `celulas-agrupadas-em-modulos` | FATO | contexto fotovoltaico + células agrupadas em módulos | padrão copiado do banco auditado 101 |
| `gra-bretanha` | FATO | começou/iniciou/surgiu na Grã-Bretanha, **com guarda de negação** | Britannica |
| `data-para-seculo` | ARITMÉTICA | `17xx` = século XVIII | conversão de ano para século |

Cada uma tem exemplo positivo **e negativo**, e o teste permanente
`tools/testes/equivalencias-rubrica.js` (8 contratos) rejeita o negativo — equivalência que aceita
tudo não entra. O hash dos dois arquivos fica preso em `tools/testes/medicao-pareada.js` para não
mudar em silêncio.

### Re-pontuação dos mesmos textos de 102 (nenhuma resposta nova)

| grupo | A antes → depois | B antes → depois |
|---|---|---|
| original (24) | 21 → 22 | 17 → 18 |
| holdout (6) | 6 → 6 | 5 → 5 |
| novo (6) | 5 → 6 | 6 → 6 |
| repetições (8) | 5 → 7 | 6 → 8 |
| **total (44)** | **37 → 40** | **34 → 37** |

A distância entre as duas versões **não mudou**: 3 pontos nos dois sentidos. O gabarito estava
punindo os dois lados; corrigi-lo não transforma a camada de fontes em vencedora.

Continua havendo falso negativo conhecido: `A #22 r0` diz "células conectadas formam um módulo"
sem "solar" nem "agrupadas em" — o padrão auditado exige a forma específica e ele segue reprovado.
Não afrouxei mais sem prova.

## 4. O que foi corrigido no produto

### 4.1 Timeout adaptativo por rota (`_limiteRota`)

Antes: 25 s fixos para qualquer rota, mesmo as que nunca responderam. 21 timeouts × 24,8 s = 8,7 min.

Agora, depois de a rota ter latência medida: janela = `2,5 × latência média`, com piso de 6 s;
rota que já estourou o relógio 2× seguidas cai para `1,6 ×`. **Sem amostra, nada muda** — o
comportamento antigo fica intacto até existir evidência.

### 4.2 Fila por evidência (`_candidatos`)

Rota com **3 falhas seguidas** vai para o fim da própria classe. Continua alcançável como último
recurso, mas não gasta 25 s na frente de quem responde. Um sucesso zera a contagem.

### 4.3 Rota com chave do dono — Groq (`chaveLS`)

O código já previa chave (`m.chaveLS`), mas **nenhum motor declarava slot**: `grep chaveLS` na
frota dava zero. A porta estava construída e morta.

Agora existe a rota `groq` (`https://api.groq.com/openai/v1`, `openai/gpt-oss-120b`) com
`chaveLS: 'rebocl_chave_groq'`, **nativa e inativa**:

- sem chave, `disponivel()` devolve `false`, a rota não é tentada, não consome tempo e não gera erro;
- com chave, o cabeçalho `Authorization: Bearer` é enviado e a chave aparece **só** ali;
- nenhuma chave entra no repositório (teste verifica que o catálogo não contém `gsk_…`);
- ativação pelo próprio chat: `!chave groq <valor>` (grava no `localStorage` do navegador).

Justificativa de escolha: o contrato da Groq proíbe treinar com input/output do cliente. O tier
gratuito do Gemini usa os dados para treinar fora de UE/CH/UK — incompatível com a postura de
privacidade do produto. Cloudflare Workers AI também proíbe, mas exige `account_id` na URL e por
isso ficou de fora desta rodada.

`https://api.groq.com` foi adicionado ao `connect-src` das quatro páginas (CSP 10/10).

## 5. Barreira

`npm test`: **107/107 executados, 3 ignorados** por pré-requisito local (Chromium, OCR, pdftotext).
Comportamento 24/24 · misto 34/34 · estática 49/49. Novos: `roteamento-com-chave.js` (10 contratos),
`equivalencias-rubrica.js` (8 contratos).

## 6. O que continua em aberto, sem enfeite

- **A camada de fontes segue perdedora** (diferença de 3 pontos mantida). Opt-in, como em 102.
- **5 falhas de fato** continuam: #16 (rio), #13 (antígeno), #6 (resíduo/ambiental), #14 (parâmetro),
  #17 (isolamento). Nenhuma melhoria de timeout resolve conhecimento.
- **Truncamento** segue possível: o teto de 110 s continua sendo o teto do instrumento.
- **A Groq só passa a existir quando houver chave.** Sem chave, nada muda no comportamento — e o
  teste garante que é assim.
- **A base de fontes continua pequena, datada e escrita pelo mesmo agente** que implementou.
- Rubrica corrigida **não é** verificação de verdade factual. Ela mede forma e termo.
