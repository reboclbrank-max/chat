# Paridade com as IAs de fronteira — o que temos, o que não temos e o que é possível

Data: 27/10/2026 · Complementa `docs/ROTEADOR-IA.md` e `pesquisas/comparacao-chat-vs-fronteira-2026-10-27.md`.

## 1. O que mudou nesta rodada (com prova)

| Antes | Depois |
|---|---|
| cada rota tentada **uma vez**; onda de 429 derrubava a frota inteira | **cascata por qualidade** com backoff, disjuntor, cache e orçamento de tempo (`roteador-ia.js`) |
| 34,5% / 35,5% de acerto na régua de 200 | **88,0%** (rodada extra: 94,5%) |
| 65,5% dos itens **sem resposta** | **6,5%** |
| 131 HTTP 429 em 200 | **10** |
| aritmética pelo modelo (errava às vezes) | **ferramenta exata primeiro** (mathjs): 40/40 de matemática, 30/30 de sequência |
| resposta sem procedência | toda resposta declara **rota + confiança (alta/média/baixa) + tentativas + tempo** |
| nenhum comando dedicado | **`!melhor <pergunta>`** e painel em **`roteador.html`** |

Está no ar: `https://reboclbrank-max.github.io/chat/` (casca `rebocl-chat-v98`, `roteador-ia.js` no precache, PR #27 mergeado, check `testes` verde).

## 2. Paridade, capacidade por capacidade

| Capacidade | IAs de fronteira (Opus 5.5 · Astra · Gemini 4 Argon) | Nosso chat | Veredito |
|---|---|---|---|
| Texto geral em português | excelente | **acerta 94–100% quando responde** | ✅ paridade útil |
| Aritmética e sequência | ~95–98% no modelo puro | **100% por ferramenta** (11/11 + 40/40 + 30/30) | ✅ **melhor que eles nesse recorte** |
| Conhecimento enciclopédico | índice independente **58** | teto grátis **~45** | ❌ ~1 ano atrás |
| Raciocínio difícil passo a passo | Claude/GPT-6 com "max effort" | `!genio` (5 cérebros + 2 críticas + revisão) sobre rotas fracas | ⚠️ método bom, motor fraco |
| Contexto longo | Astra 1,05 M · Argon 1 M de saída | 128 K–1 M **conforme a rota**, sem garantia | ❌ |
| Visão (ler imagem/foto) | nativo, estado da arte | `!olhar`, OCR local, Qwen2.5-VL-72B no catálogo | ⚠️ funciona, longe do topo |
| Gerar imagem | GPT-Image-2.5 (Arena 1.425) | Pollinations (**200 OK, 15,7 KB em 5,4 s**) | ❌ qualidade |
| Gerar vídeo | Wan 3.0 / Gemini Omni (AA ~1.150) | — | ❌ ausente |
| Voz (falar/ouvir) | nativo nos três | `!falar`, `!ouvir` (vozes do navegador) | ⚠️ básico |
| Busca na web | nativa com citação | `!pesquisar`, `!busca` + **90 APIs públicas** | ✅ paridade prática |
| Execução de código em sandbox | sim | **não existe** | ❌ ausente |
| Agentes longos multi-etapa | Opus 5.5 = **20,77%** no arena.ai | `!enxame`, `!genio`, roteador novo — **sem número comparável** | ❌/⚠️ |
| Ferramentas e conectores | busca + código + conectores de app | **90 de 97 endpoints vivos (93%), mediana 234 ms**, dados BR de verdade | ✅ **ganhamos** |
| Memória persistente | limitada por sessão | `CONTINUIDADE.md` (440 KB) + localStorage + governança | ✅ **ganhamos** |
| Offline / PWA instalável | não | sim (`sw.js` v98, precache da casca) | ✅ **ganhamos** |
| Custo | $4/$20 (Opus) · $10/$50 (Astra) · $1,27/tarefa (Sol) | **R$ 0** | ✅ **ganhamos** |
| Segurança de rede | caixa-preta | CSP estrita com 97 domínios autorizados + contrato no CI | ✅ ganhamos em auditabilidade |
| Disponibilidade | ~99,9% pago | **6,5% de falha** depois do roteador (era 65,5%) | ⚠️ melhorou, ainda atrás |
| Latência | 2 s (rápido) a 60 s (max) | mediana **2,94 s** | ✅ competitivo |

**Placar: 8 ✅ · 5 ⚠️ · 6 ❌** (antes do roteador eram 6 ✅ · 1 ⚠️ · 6 ❌).

## 3. A resposta honesta sobre "a melhor IA do mundo"

Não é possível tornar este chat **o mais inteligente do mundo** sem uma destas três coisas — e nenhuma é código:

1. **Uma rota de fronteira paga.** `anthropic/claude-sonnet-5.5` já está no `dna.json` via Glama com `chaveLS`, mas hoje responde **401** porque não existe chave no navegador. Com chave, o modo difícil sai de ~45 para **50–56** no índice independente. Custo: preço de API (Sonnet 5.5 é a faixa de US$ 3/15 por milhão de tokens). **É a única alavanca que muda o número de inteligência.**
2. **Um sandbox de execução de código.** Isso não é modelo: é infraestrutura (container com rede controlada). Sem isso, "executar código" e "agente longo confiável" ficam fora — e são justamente onde a fronteira ganha por 20 pontos no arena de agentes.
3. **Um modelo próprio.** Fora de alcance: treinar algo no nível de Opus 5.5 hoje custa centenas de milhões de dólares e não é uma decisão de repositório.

O que **é** possível — e foi feito — é parar de perder: com o mesmo dinheiro (zero) e as mesmas rotas gratuitas, a régua de 200 subiu de **34,5% para 88,0%**. Isso é ganho real de produto, medido, e não retórica.

## 4. Próximos passos, em ordem de retorno

| # | Ação | Ganho esperado | Custo |
|---|---|---|---|
| 1 | Plugar chave numa rota de fronteira só no "modo difícil" (`!melhor`) | 45 → 50–56 no índice independente | US$ de API |
| 2 | Sandbox de código (container) com o mesmo contrato de segurança | habilita "executar código" e agente longo confiável | infraestrutura |
| 3 | Repetir a régua de 200 semanalmente e guardar a curva | detecta regressão de frota antes do usuário | R$ 0 |
| 4 | Modelo de imagem de qualidade (rota com crédito) | sai do "decente" para comparável | US$ de API |
| 5 | Medir agência na régua do arena.ai (tarefa de 5+ passos) | número comparável ao 20,77% do Opus 5.5 | R$ 0 |

Nada disso é feito sem sua palavra: os itens 1, 2 e 4 gastam dinheiro e eu não gasto o seu por conta própria.

## 5. Limites registrados (para não virar propaganda)

- O roteador **não cria inteligência**: ele para de perder respostas que a frota gratuita já sabia dar.
- Os **40 itens de matemática são 100% por ferramenta**, não porque o modelo ficou mais esperto.
- **Acerto-quando-responde caiu de 98–100% para 94,1%** — cobertura subiu, precisão média caiu um pouco; é o preço honesto da cascata e está declarado em cada resposta.
- A régua de 200 é **curta e sintética**: matemática, sequência, lógica simples, fatos estáveis. Ela não mede escrita longa, código, visão, nem satisfação humana.
- Nada aqui mede entrega, disponibilidade contratada, SLA ou satisfação de usuário real.
