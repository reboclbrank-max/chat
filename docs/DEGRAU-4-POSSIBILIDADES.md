# Degrau 4 — o mapa de possibilidades

O pedido: continuar subindo, mas **arquitetando tudo antes**, para que o degrau 4 não vire
empecilho. Este documento é o mapa completo — as opções, o custo de cada uma, o que já está
construído e a ordem recomendada.

A pergunta que organiza tudo: **se a máquina mesclar código errado, quem responde pelo erro?**
No degrau 3 a resposta é a faixa (`docs/`, `posts/`): o pior erro é uma página com erro de
digitação. No degrau 4 a resposta passa a ser a barreira de testes e a capacidade de desfazer.
Por isso o mapa começa por elas, não pelo código.

## 1. Cinco desenhos possíveis

| # | desenho | o que a máquina faz | risco | custo | reversível? |
|---|---|---|---|---|---|
| **A** | **Não subir** (hoje) | mescla só texto | mínimo | zero | — |
| **B** | **Faixa de código estreita** | mescla os poucos arquivos de uma lista explícita, com contrato próprio | médio: um erro entra sem ninguém ver | alto: cada arquivo exige prova | sim, se a barreira for confiável |
| **C** | **Modo sombra** | decide o que faria, **registra** e não age | **zero** | baixo | não precisa |
| **D** | **Ensaio com prazo** | liga por tempo limitado, desliga sozinho na primeira `main` vermelha | médio | médio | sim |
| **E** | **Código amplo** | mescla qualquer código com barreira verde | alto: erro pequeno vira casa parada de madrugada | alto | tarde demais |

**Recomendação: C agora, B depois, D como travessa de segurança, E nunca.**

### Por que C primeiro

O que falta para justificar B **não é confiança, é evidência**: não temos nenhum registro de
quantas vezes o julgamento da máquina teria acertado. O modo sombra produz essa evidência sem
risco nenhum: a cada PR aprovada pela barreira, a máquina calcula "eu mesclaria isto?" e
anota o veredito e o motivo. Depois de algumas dezenas de casos, o número de acertos deixa de
ser opinião — e vira a condição de liberação do degrau 4.

### Por que D é travessa e não degrau

Um degrau que só existe por prazo não é autonomia, é experiência. Serve para **reduzir a
duração do risco** de um primeiro caso real: liga, observa, desliga sozinho se a `main` ficar
vermelha. Não substitui as condições de liberação.

## 2. Quanto código poderia, algum dia, ser candidato

Levantamento de 05/11 no repositório:

| medida | número |
|---|---|
| arquivos em `tools/` | 47 |
| com teste próprio em `tools/testes/` | 22 |
| que falam com rede, processo ou API do GitHub | 34 |
| sem rede nem processo (puros ou quase puros) | ~19 |

Os ~19 sem rede são os únicos que poderiam, em tese, entrar na faixa `codigo-seguro`. E ainda
assim **um por um**, com contrato e com prova de que não publicam estado. Não existe promoção
por pasta, por extensão ou por "parece inofensivo".

## 3. O que já está construído

| peça | arquivo | estado |
|---|---|---|
| interruptor de autonomia | `autonomia.json` + `tools/autonomia.js` | pronto, falha fechada |
| mapa de risco | `tools/risco-de-arquivo.js` | pronto, desconhecido = essencial |
| termômetro da barreira | `tools/termometro-barreira.js` | pronto, reprovando com motivo |
| reversão | `tools/mesclador-estreito.js` | **consertada em 05/11** (ver §4) |
| nível visível no estado da casa | item “Autonomia (nível)” do vigia | pronto |

## 4. Os três defeitos reais que só apareceram em produção

Nenhum destes foi encontrado por teste offline. Todos apareceram porque o mecanismo **rodou
de verdade** — e é por isso que o mapa começa pela confiabilidade e não pelo código.

**a) A reversão não conseguia abrir PR.** Quando a `main` ficou vermelha em 05/11 (run
`41962952619`), o job de reversão rodou e morreu com:

```
HTTP 403 GitHub Actions is not permitted to create or approve pull requests
```

O GitHub bloqueia, por padrão, que Actions abram PR. Ou seja: a trava 2 do degrau 3 estava
**escrita, testada e quebrada**. Correção: quando a PR é proibida, a reversão vai por merge do
ramo na `main` — que devolve exatamente a **árvore já validada**, a última que estava verde.

**b) A reversão poderia reverter o commit errado.** A versão anterior procurava "o último
commit marcado `[mesclador]`". No caso real, a `main` ficou vermelha num merge **humano**
(`#93`) e o mecanismo iria desfazer uma reversão antiga, sem relação com a falha. Correção:
só reverte o commit que a **execução vermelha** avaliou, e só se ele for do mesclador.

**c) A instabilidade do navegador tinha causa, e era nossa.** O log real:

```
✘ navegador-csp.js → navegador não abriu porta de depuração — ERROR:dbus/bus.cc:405
```

A causa não é "Chromium é instável": o lançador **reusava o mesmo diretório de perfil entre
tentativas**. Depois de matar a tentativa 1 com SIGKILL, o perfil fica com `SingletonLock`
apontando para um processo morto; a tentativa 2, no mesmo diretório, é lida como "já existe
instância aqui" e morre sem abrir a porta. Correção em `tools/testes/cdp.js`: perfil novo por
tentativa, travas removidas, porta conferida, espera maior.

Provado com um **navegador falso** (não precisa de Chromium instalado) em
`tools/testes/cdp-recuperacao-navegador.js`: 5 contratos, incluindo o que reproduz o
comportamento antigo e mostra que ele **falha**. É a diferença entre "acho que consertei" e
"consertar está provado, e o defeito era real".

## 5. Ordem recomendada, com portões

```
hoje           A  (texto)                    ← estamos aqui
portão 1  →    barreira confiável             termômetro aprovado com janela verde nova
portão 2  →    C  (sombra)                    ≥ 30 vereditos registrados, ≥ 95% de acordo com o que entrou
portão 3  →    B  (faixa de código, 1 arquivo) + D (prazo)   reversão exercitada por caso real
portão 4  →    B com 3–5 arquivos            depois de um mês sem incidente
nunca     →    E                             erro pequeno demais para matar a casa de madrugada
```

Cada portão tem número, não adjetivo. Enquanto um portão não fecha, o nível fica onde está — e
o vigia mostra o nível no estado da casa, para ninguém precisar perguntar.

## 6. O que este mapa recusa

- **Subir por cansaço de esperar.** Nível é decisão com evidência, não com paciência.
- **Faixa definida por heurística.** Lista explícita ou nada.
- **Instabilidade conhecida virando "já passou".** Pendência não envelhece: só sai quando o
  arquivo citado é consertado e alguém marca a entrada como corrigida.
- **Autonomia que se autoriza.** Quem obedece ao nível nunca pode mudar o nível.
