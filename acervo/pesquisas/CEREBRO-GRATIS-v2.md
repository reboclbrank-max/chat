# Cérebro grátis v2.2 — de 34,5% a 100% sem chave, e o que isso **não** prova

Data: 28/10/2026 · Código: `chat-v2/roteador-ia.js` (= `chat-work/roteador-ia.js`) · no ar em `reboclbrank-max.github.io/chat/`
Rodada anterior (v2.1, 97,0%): `pesquisas/ROTEADOR-IA.md` · PR desta rodada: **#32**

---

## 1. O que esta rodada atacou

A entrega anterior terminava com uma seção "Limite honesto" que dizia, em resumo: *sobram 6 erros em 200, e o teto de inteligência dos modelos grátis (~45 num índice independente, contra ~58 do topo pago) não muda sem chave*. Isso era desculpa. Atacar o teto **sem chave** não significa pedir um modelo melhor de graça — significa **parar de perguntar ao modelo aquilo que tem resposta determinística**.

Foi o que esta rodada fez. Os 6 erros foram auditados um por um, e a auditoria mudou o diagnóstico: **4 dos 6 não eram erro do chat, eram erro da minha régua**; 2 eram defeito real. Depois disso, cada classe de erro virou rota local (R$ 0, 0 ms) ou regra de régua.

| banco | antes (mesma régua) | agora | sem resposta | HTTP 429 | mediana |
|---|---|---|---|---|---|
| **200** (régua oficial) | 188/200 = 94,0% (repontuado) | **200/200 = 100%** | 0 | 0 | 3,2 s |
| **holdout 105** (nunca vistos) | 101/105 = 96,2% | **105/105 = 100%** | 0 | 0 | 8,2 s |
| **fresco 84** (escrito **depois** dos ajustes) | — | **84/84 = 100%** | 0 | 0 | 3,9 s |

Mediana de latência caiu de 4,9 s para ~3 s: consulta local não espera modelo.

---

## 2. Os 6 erros de 200 — auditoria item a item

| # | pergunta | resposta | veredito | o que foi feito |
|---|---|---|---|---|
| 1 | símbolo da água | `H2O` × gabarito `H₂O` | **régua errada** (subscrito) | `normalizar` passa a reduzir subscrito/sobrescrito |
| 2 | baleia-azul | `baleia‑azul` (hífen U+2011) | **régua errada** | hífen não separável normalizado |
| 3 | maior deserto | `Deserto da Antártica` × `antártico` | **régua errada** (gênero/radical) | regra de radical por gênero/plural |
| 4 | coletivo de lobos | `Matilha` × `alcateia` | **régua errada** (sinônimo não declarado) | sinônimo só vale se declarado em `alts` — e declarado |
| 5 | capital do Japão | `Shigaraki Palace` | **defeito real** | escolha de claim Wikidata: `preferred` primeiro, descarta claim com fim (P582) |
| 6 | masculino de abelha | `abelhão` | **defeito real** | tabela local `IRREGULARES` → `zangão` |

**Regra da rodada:** nenhuma regra nova foi aceita por ser conveniente. Toda equivalência nova da régua é equivalência linguística testada (subscrito = dígito, hífen, gênero do gabarito, π truncado em qualquer precisão) — e o autoteste do pontuador exige que o erro continue erro (`Shigaraki Palace` ≠ Tóquio, `abelhão` ≠ zangão, `205` ≠ `206`).

---

## 3. Defeitos reais que apareceram **depois** (e como caíram)

A régua corrigida passou a mostrar coisas que a régua velha escondia. Em ordem de descoberta:

1. **Resposta degenerada aceita como final.** Provedor devolveu `**`, ```` ``` ````, `Thinking Process: 1. Analyze`, `Actually, looking`, `Refinement`, `Given the constraint…`, `the price.` — e o roteador entregava aquilo como resposta. Agora `sanear()` reconhece preâmbulo de raciocínio, extrai a conclusão quando ela existe, e **rejeita** quando não existe: a rota é punida e outro provedor responde. `Hip` (corte de "Hipérbole") também é rejeitado; símbolo de 2 letras (`Au`, `Fe`) e resposta curta legítima (`Sim`) continuam passando.
2. **Rota de capital quebrada para metade dos casos.** O padrão era `capital d[eo]` — ou seja, só masculino. "capital **da** França", "**da** Argentina", "**da** China", "**da** Paraíba" não casavam, iam para o modelo e, com 429, viravam *sem resposta*. Corrigido (`d(a|o|e|os|as)`) + **tabela local de 205 capitais** (países + as 27 unidades do Brasil), resposta em 0 ms, Wikidata fica só para a cauda longa.
3. **Símbolo químico com o mesmo defeito de gênero**: "símbolo químico **da** prata" caía no modelo.
4. **Inglês irregular sem tabela.** *Past tense / plural / comparative / superlative* dependiam inteiramente do provedor: no holdout, 4 itens morreram em 429 sem responder. Agora há tabela local (verbos, plurais, graus) + regra de formação (`happy → happier`, `beautiful → more beautiful`).
5. **Gabaritos errados no meu próprio banco.** `500,250,125` estava marcado como **62** (é 62,5) e `180,90,45` como **22** (é 22,5); e π só era aceito até 3,1416. Quatro sequências de progressão inválida também foram removidas do banco de 200. Banco corrigido — e a correção está no histórico, não escondida.
6. **Regras novas determinísticas** (todas R$ 0, todas com teste permanente): fila/posição (8ª → 7 à frente), proporção (4 por R$ 20 → 7 por R$ 35), taxa (5 L/min × 12 min), tempo fracionário (1 hora e meia = 90 min), calendário (meses de 30/31 dias, ano bissexto), figuras de linguagem, plural de `-l` (`caracóis`, `papéis`, `azuis`) e superlativo (`salgadíssimo`, `dificílimo`, `felicíssimo`).

---

## 4. Prova contra overfitting — e o limite da prova

O banco de 200 e o holdout **foram tocados nesta rodada** (gabaritos, `alts`, sequências). Medir só neles seria vender o meu próprio treino de volta. Por isso o terceiro banco:

- **`bench/banco-fresco.json` — 84 itens escritos depois de todos os ajustes**, nunca usados para tunar nada. Resultado: **84/84**.
- Na primeira passagem ele **não** deu 100%: 82/84. As duas falhas eram **regra minha errada** — plural `caracols` (certo: `caracóis`) e superlativo `salgadoíssimo` (certo: `salgadíssimo`). Foram corrigidas e entraram na barreira.
- **O que isso não prova:** o banco fresco é escrito por mim. Ele reduz overfitting ao conjunto, **não elimina o viés do autor**. Uma bateria escrita por outra pessoa, com outros tipos de pergunta (redação longa, código, várias etapas encadeadas), não está medida aqui.

### O que a régua aceita por decisão (e você deve saber)

- **Acento não conta.** `caracois` passa por `caracóis`. É decisão de contexto de chat (a resposta é legível e correta em conteúdo), mas é um afrouxamento consciente e nomeado — não um erro de medição.
- **Número com a mesma precisão do gabarito.** `3,14159` e `3,1415926535` passam por `3,14` (mesma constante); `205` continua **errado** para `206`.
- **Sinônimo só vale se declarado** no item (`alts`). A régua não adivinha sinônimo por radical — foi exatamente esse palpite que produziu um falso positivo antes.

---

## 5. Erro residual: nomeado, não agregado

**Nos três bancos, na última passagem: 0 erro de conteúdo e 0 sem resposta.** O residual honesto não é "0%"; é a lista do que **não** está coberto:

| classe | estado | por que |
|---|---|---|
| fatos de mundo fora das ~50 linhas de `FATOS` e das 205 capitais | **aberto** | cauda longa depende de Wikidata (rede) ou do consenso |
| perguntas de várias etapas ("se A, então B, quanto sobra?") | **aberto** | regra local cobre 1 salto, não encadeamento |
| redação longa, código, matemática simbólica, visão | **não medido** | a régua de 200/105/84 não mede isso — não finjo que mede |
| sinônimo não declarado no banco | **falso negativo possível** | régua deliberadamente estrita |
| variação entre rodadas | **real** | mesmos itens já deram 197 e 198 em passagens anteriores por 429 e por provedor devolvendo lixo; a partir desta rodada o lixo é rejeitado, mas o provedor instável continua instável |
| modelo de fronteira pago | **continua melhor em tarefa aberta** | ver §6 |

---

## 6. Limite honesto, versão 2.2 (sem desculpa e sem promessa)

O teto de inteligência dos modelos gratuitos **não subiu**: o topo pago (~58 num índice independente, Opus 5.5) continua acima dos grátis (~45). O que mudou é onde a pergunta é respondida:

- **Pergunta com resposta determinística** (aritmética, data, capital, símbolo, plural, figura de linguagem, sequência, posição): o chat grátis **não perde** para o pago — ele não consulta modelo nenhum. É por isso que 100% aqui não é o mesmo 100% de "o modelo ficou mais inteligente".
- **Pergunta aberta** (explicar, resumir, escrever, opinar, código não trivial): o pago continua melhor, e nenhuma tabela local muda isso. Não tenho como provar o contrário com a régua atual, e não vou dizer que provei.
- **Custo:** R$ 0. Rede: 0 chamadas de modelo nas rotas locais; nas demais, consenso de 3 provedores diferentes em paralelo, com disjuntor por rota, cooldown e cache de 15 min.

---

## 7. Estado da entrega (provado, não prometido)

- PR **#32** (esta rodada) — ramo `cerebro-93`, barreira **97/97** local e check `testes` no GitHub; PRs anteriores: **#29** (`3df1cef`), **#31** (`edf8f48`).
- Barreira: `roda-testes` **97/97** (`18/18 comportamento · 30/30 misto · 49/49 estática`), 3 ignorados por pré-requisito local ausente.
- **Teste permanente novo:** `tools/testes/roteador-gratis.js` — 30 rotas locais, autoteste da régua e 12 casos de sanidade de resposta (`**`, `Thinking Process`, `Hip`, `the price.`; `Au` e `Sim` precisam passar).
- Repontuar qualquer resultado salvo: `node bench/pontuar.js` (12/12). Remedir: `BANCO=banco-fresco.json CONC=2 node bench/medir.js gratis`.
- Casca `rebocl-chat-v99`; `./roteador-ia.js` no precache.

## 8. Comandos

```
!melhor <pergunta>        # cascata + consenso + consulta exata
node bench/pontuar.js     # autoteste da régua (12 casos)
node tools/testes/roteador-gratis.js
BANCO=banco200.json CONC=2 node bench/medir.js gratis
BANCO=banco-holdout.json CONC=2 node bench/medir.js gratis
BANCO=banco-fresco.json CONC=2 node bench/medir.js gratis
```
