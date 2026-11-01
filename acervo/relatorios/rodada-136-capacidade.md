# Rodada 136 — capacidade dobrada em 9 de 10 eixos

**Publicado: `main` = `eb1d04e`** (PR #63, squash). `testes` = success · Pages = success ·
`https://reboclbrank-max.github.io/chat/` 200 · casca `rebocl-chat-v103` no ar.

---

## 1. A pergunta era "como dobrar" — agora ele responde com régua

`tools/auto-melhoria.js` ganhou o bloco **CAPACIDADE**: dez eixos, cada um com **antes (rodada 135) · hoje · alvo do dobro · falta · estado**. A régua é fixa de propósito — se ela subisse junto com o placar, o alvo fugiria e "dobrar" nunca teria prova.

| eixo | antes (135) | hoje | dobro | estado |
|---|---|---|---|---|
| solucionadores do motor | 16 | **38** | 32 | ✔ 2,38× |
| provas no gabarito | 47 | **123** | 94 | ✔ 2,62× |
| provas resolvidas por código | 40 | **118** | 80 | ✔ 2,95× |
| armadilhas no banco | 17 | **41** | 34 | ✔ 2,41× |
| armadilhas respeitadas | 17 | **41** | 34 | ✔ 2,41× |
| provas que chegam à pessoa (fio) | 40 | **118** | 80 | ✔ 2,95× |
| solucionadores com prova E armadilha | 16 | **38** | 32 | ✔ 2,38× |
| domínios com caminho exato | 9 | **18** | 18 | ✔ 2× |
| provas verbais por código | 1 | **15** | 2 | ✔ 15× |
| texto aberto (régua de 24) | 20 | 20 | 24 (teto) | teto não alcançado |

**9 de 10 eixos dobrados.** O décimo (texto aberto) não depende do motor: depende de fonte viva ou teto de geração — está declarado com número, não escondido.

---

## 2. A fila inteira executada (não só o topo)

22 solucionadores novos em `razao-local.js`, **cada um com prova e armadilha**:

| grupo | solucionadores |
|---|---|
| contas | regra de três direta, média, MDC/MMC, aumento/desconto, juros simples, velocidade média, área/perímetro/triângulo, resto de divisão, fatorial, primos, potência/raiz |
| dados | **mediana**, **moda** |
| álgebra | **equação do 1º grau** |
| texto | ordem alfabética, palíndromo, anagrama, contagem de palavras, **inferência por negação** sobre texto citado |
| representação | bases binária/hexadecimal (inclusive largura fixa: "com 8 bits" → `00001101`), conversão de unidades |
| geração | **uma linha de Python** para soma com filtro de paridade |
| sequências | **Fibonacci conferido termo a termo** (1,1,2,3,5,8 → 13) |
| calendário | **dia da semana de uma data** |

---

## 3. O medidor me barrou 17 vezes antes do push

A primeira versão dos solucionadores novos acertava **56/56 provas** e respondia errado **14 armadilhas**. Cada uma foi consertada (calando a forma ou implementando o caso) e virou armadilha permanente:

| armadilha | o que eu respondia | certo |
|---|---|---|
| "a média de três números é 12; dois são 4 e 8. Qual o terceiro?" | **6** | 24 |
| "MMC de 4, 6 e 8" | **12** | 24 |
| desconto de 15% **e depois** aumento de 10% | **170** | 187 |
| velocidade média **com 1 h de parada** | **60** | 90 |
| área de retângulo **descontando faixa** | **15** | 3 |
| "5! + 1" | **120** | 121 |
| "primos **gêmeos** entre 10 e 30" | **6** | 4 |
| soma dos **ímpares** em uma linha de Python | devolvia o filtro de **pares** (a palavra "ímpar" contém "par") | `x % 2 == 1` |
| ordem alfabética **+ "quantas vogais"** | devolvia só a lista | resposta composta |
| palíndromo **composto** ("arara é e casa não é") | **Sim** | as duas afirmações |
| anagrama **"e têm o mesmo significado"** | **Sim** | anagramas, mas não sinônimos |
| contagem **"sem contar os artigos"** | **7** | 5 |
| "não ficou **insatisfeito**" (dupla negação) | **Não** | satisfeito |
| "2 elevado a 200" | `1,6069380442589903e+60` | inteiro exato (agora cala) |

**Três defeitos de produto** achados no caminho, fora do motor:
1. **anti-eco tratava data como conta** — `25/12/2026` tem dígitos e uma barra; a barra era lida como divisão, `sexta-feira` era marcada como eco e o texto chegava **vazio** (a prova de fio pegou: 104/106);
2. **potência sem precisão** — acima de 2^53 a calculadora local devolvia double arredondado como se fosse exato; agora cala;
3. **negação lia o predicado da frase citada**, não da pergunta — a dupla negação respondia "Não".

---

## 4. Medido e rejeitado, com número (não com opinião)

A fila vinha repetindo "para o verbal, vale base de fatos estáveis com fonte". Isso foi **medido**:

| fonte | tamanho | casos verbais cobertos |
|---|---|---|
| OpenWordnet-PT | 38.020 lemas · 52.670 synsets · 109.734 relações | **0 de 5** |

Motivos, um por caso: `geladeira` não tem synset (o mais próximo é *frigorífico*); `efêmero` e `passageiro` não dividem synset; não há antonímia `escasso`/`abundante` (a base tem 513 relações de antonímia no total); não há meronímia `livro`→`capítulo` nem `sinfonia`→`movimento`.

Montar léxico próprio com essas palavras seria **ensinar para o teste** — a regra que eu mesmo escrevi proíbe. O item saiu da fila de trabalho e virou **`[MEDIDO E REJEITADO]`**, com `bench/lexico-publico.json` e `tools/medir-lexico-publico.py` reproduzível. As 5 provas verbais seguem com o modelo — e o que o produto garante é que o caminho exato **não chuta**.

---

## 5. Prova na barreira

| medição | valor |
|---|---|
| provas resolvidas por código | **118/123** (0 erradas) |
| armadilhas respeitadas | **41/41** |
| prova de fio (entrega sem modelo) | **118/118** |
| cobertura (prova + armadilha por solucionador) | **38/38** |
| `tools/testes/auto-melhoria.js` | **13/13** |
| `tools/testes/razao-local.js` | **80/80** |
| barreira completa | **118/118** (3 ignorados) |
| páginas derivadas | sem divergência |
| ao vivo | fácil **29/29** · difícil **18/18** |

---

## Limite honesto

Dobrar contagem é fácil; dobrar **confiança** não. O que sustenta as 118 respostas exatas são as 41 armadilhas e a regra de devolver `null` quando a forma não casa exatamente — e a única armadilha que ainda falta é a que eu não soube imaginar.
