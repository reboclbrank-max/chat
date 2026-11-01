# Rodada 138 — auditoria de dependências: de quem ele depende e o que sobra quando tudo cai

**Publicado: `main` = `36be014`** (PR #65, squash). `testes` = success · Pages = success · casca `rebocl-chat-v105`.
Auditoria reproduzível: `node tools/auditoria-dependencias.js`.

---

## 1. Inventário — o que sai da máquina

| papel | o que é | tamanho |
|---|---|---|
| modelo de texto | rotas gratuitas | **19 rotas em 5 hosts** — Kilo 5 · OVH/Kepler 9 · g4f 3 · Groq 1 · Pollinations 1 — em 3 classes (forte/média/leve) |
| chaves | exigência do dono | **18 de 19 anônimas**; só a Groq aceita chave opcional |
| fonte viva | Wikipédia, Wikidata, BrasilAPI, IBGE, mathjs, Open-Meteo, CoinGecko, MusicBrainz, archive.org, TheMealDB | consulta na hora, opcional |
| infraestrutura | GitHub Pages (a página) e Actions (trabalhador do e-mail) | sem servidor próprio, sem banco |

## 2. Ensaio de queda total — sem rede nenhuma, gabarito inteiro

```
respondidas offline: 122/127 · vazias: 5 · ERRADAS: 0
espera: mediana 0 ms · pior 1,5 s · soma 2,1 s
```

As 5 vazias são as verbais (léxico), declaradas desde a 136.

---

## 3. O defeito que a auditoria expôs (e o conserto)

Sem rede, as perguntas fora do caminho local **esperavam 32 a 85 segundos para devolver vazio**: as 19 rotas eram tentadas em sequência mesmo recusando na hora. Espera inútil é pior que resposta curta — e o pior caso é justamente quando o produto é 100% local.

**Disjuntor de rede** em `roteador-ia.js`:

- **3 falhas de rede seguidas** (fetch recusado — 429/500 não contam, são do servidor) → rotas pausadas por 20 s;
- o laço de voltas e o resgate param de insistir com o disjuntor aberto;
- qualquer resposta HTTP que chegue zera a contagem.

| medida | antes | depois |
|---|---|---|
| espera somada nas 5 perguntas | 338.678 ms | **763 ms** (~444×) |
| pior pergunta offline | 84.963 ms | **1,5 s** |
| respostas alteradas | — | **nenhuma** |

---

## 4. "Ilimitado", com número

Ilimitado aqui não é saber tudo: é **não pedir licença a ninguém para o que sabe**.

| camada | depende de quem | medido |
|---|---|---|
| caminho exato (contas, regras, calendário, identidade, código) | **ninguém** | 122/127 sem rede · **0 inventadas** |
| texto aberto e vocabulário | 19 rotas gratuitas em 5 provedores independentes | nenhum provedor único derruba; se todos caírem, diz o motivo em ~1,5 s |
| conteúdo que exige fonte viva | Wikipédia/Wikidata/IBGE etc. | cai para a base local quando eles caem |
| e-mail | GitHub Actions | canal para; a página do chat segue inteira |
| chaves do dono | — | não são necessárias: 18 de 19 rotas são anônimas |

**O que não dá para tornar ilimitado sem terceiro:** gerar texto novo e conhecer vocabulário fora da base local. A tentativa de resolver isso com base pública foi **medida e rejeitada** na rodada 136 — OpenWordnet-PT cobre **0 de 5** casos verbais.

---

## 5. O medidor também dependia da rede — e foi consertado

Ao investigar a falha do CI (run 41244402599, suíte estourando 180 s), dois defeitos no próprio diagnóstico:

- **o programa dizia "sem rede" e usava a rede**: uma prova caía em consulta ao vivo e o mesmo comando levava **de 0,9 s a 26 s**. Agora o `fetch` é bloqueado de propósito (`--com-rede` para quem quiser o caminho online) e há verificação nova: **duas execuções têm de dar o mesmo número**;
- **custo sem medição**: `provarFio` criava um roteador por prova (reiniciando o disjuntor) e temporizadores pendentes seguravam o processo ~8 s. Um roteador para a amostra inteira + sair ao terminar: **suíte de 174 s → 52 s**, determinística.

---

## 6. Guarda novo: `tools/testes/sem-dependencia.js` (3/3)

1. queda total com **≥85% respondido** e **zero erradas**;
2. **pior pergunta offline < 5 s** (o disjuntor funcionando de verdade);
3. redundância — **≥10 rotas, ≥3 provedores independentes**, no máximo 1 rota com chave;
4. o disjuntor **abre** em 3 falhas seguidas e **fecha** quando a rede volta (contraprova com `fetch` falso).

---

## 7. Prova de que nada quebrou

| medição | valor |
|---|---|
| auditoria de dependências | **122/127 offline · 0 erradas · pior 1,5 s** |
| `sem-dependencia.js` | **3/3** |
| guarda do auto-melhoria | `✔ nada quebrado · armadilhas 43/43 · fio 122/122 · cobertura 39/39 · reescrita 274/277` |
| suíte de auto-diagnóstico | **18/18** em **52 s** (era 174 s) |
| barreira completa | **120/120** (3 ignorados) |
| páginas derivadas | sem divergência |
| ao vivo | fácil **29/29** · difícil **18/18** |

---

## Limite declarado

"Não depender de ninguém" vale para o que o produto **sabe**: 96% do gabarito, sem rede, sem chave, sem cota, sem espera. Para o que ele **não sabe** — texto novo e vocabulário — a independência total exigiria rodar um modelo local no aparelho, o que troca dependência de provedor por dependência de hardware. Hoje a escolha é explícita: 19 rotas gratuitas independentes, e silêncio honesto quando todas caem.
