# Rodada 132 — os dois abertos, fechados

`main` = **`34bbe1d`** · PR **#59** (squash, check `testes` success, Pages success) · casca PWA **v102**

## Antes → depois (tudo medido, nada estimado)

| item | antes | depois |
|---|---|---|
| difícil (18 perguntas) | 14/18 → 15, 13, 16 (variância) | **18/18 em 3 corridas seguidas** |
| fácil (29) | 29/29 com erro de modelo intermitente | **29/29** |
| probabilidade sem reposição (3/10) | respondia **1/5** sempre | **3/10 em 1 ms** |
| contagem com dígito (271) | respondia **468**, **657** | **271 em 5 ms** |
| matriz descrita (quadrado branco) | respondia **círculo preto** | **quadrado branco em 2 ms** |
| idade (10) | respondia **20** | **10 em 1 ms** |
| rajada 12 perguntas × 4 concorrentes | 20/29 no meio da rajada | **12/12 com texto, 12/12 certas, 0 resgates** |
| eco | 0 cortes | **6/6 com texto, 0 recomeços** |
| memória (3 turnos) | nome esquecido às vezes | **cidade e nome lembrados** |
| respostas sem modelo | 3 (aritmética) | **14 das 18 difíceis e 17 das 29 fáceis, em 0–70 ms** |

## O que foi feito

**1. `razao-local.js` (novo, 28 KB)** — 14 soluções exatas consultadas depois da aritmética local e **antes** de qualquer modelo:

sequência (quadrados, oblongos, dobre+passo, 1ª/2ª diferença, geométrica) · contagem com dígito por força bruta · trabalho conjunto de torneiras · problema de idade por álgebra · dedução proposicional e categórica **por busca de contraexemplo** (nenhum contraexemplo = válido; não é intuição) · fila/ordenação (só responde se o arranjo é único) · probabilidade com e sem reposição · inclusão-exclusão · custo total · regra de três inversa · matriz descrita em texto · rotação em pontos cardeais · memória de lista · código de uma linha (`map`/`join`/`len`/`typeof`).

**Regra de segurança:** forma que não casa exatamente devolve `null` e o modelo responde. Pedidos parecidos-mas-diferentes ficam de fora de propósito — torneira que **esvazia**, regra de matriz **desconhecida**, giro de **45°**, urna **com** reposição. Resposta exata errada seria pior que resposta de modelo.

**2. `_esperarRotaBoa()`** — o outro aberto: sob rajada, as rotas fortes entram em 429 e o roteador descia na hora para o modelo leve. Agora, se a classe forte está em descanso **curto** (≤ 15 s e dentro do orçamento), ele espera e responde na forte. Descanso longo não vira espera — aí responder rápido é melhor. Uma vez por pergunta, desligável com `semEsperaBoa`.

**3. Página e casca** — `index.html` carrega `razao-local.js` antes do roteador; `direto/ligar/limpar` regravadas por `montar-paginas.js`; service worker v101 → **v102** com o módulo no precache; `CONTINUIDADE.md` registrado (regra 0.1).

## Prova

- `tools/testes/razao-local.js` — **40/40**, incluindo **11 casos que o módulo não deve resolver** ou que só parecem iguais.
- `tools/testes/espera-rota-boa.js` — **4/4**, com dublê de `_chamar` (nenhuma chamada de rede).
- Barreira completa — **117/117** (3 ignorados); páginas derivadas sem divergência; barreira do `main` e Pages: **success**.
- Ao vivo no arquivo **publicado** (`raw.githubusercontent.com/.../main`): `3/10` em 12 ms, `271` em 5 ms, `10` em 1 ms. `https://reboclbrank-max.github.io/chat/razao-local.js` → **HTTP 200**.
- Cada resposta das baterias foi conferida à mão uma por uma (não só o placar).

## Limites que continuam valendo

- O raciocínio local é exato **onde atua** e silencioso onde não atua. Ele não cobre texto aberto, interpretação, código complexo nem conhecimento factual — isso continua sendo do modelo, com os erros que o modelo tem.
- A espera pela rota boa troca latência por qualidade: sob pool muito apertado a resposta pode levar até **15 s a mais**.
- Duas "falhas" que apareceram na medição eram do **meu instrumento**, não do produto: o corretor apagava ponto decimal (`2.4` virava `24`) e o gabarito da rajada não aceitava "avaro" como antônimo de "generoso". Corrigidos.
