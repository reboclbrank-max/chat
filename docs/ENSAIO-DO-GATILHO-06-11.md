# O ensaio do gatilho: a reversão acordou de verdade (06/11)

Era o maior item da lista de "não provado": *o gatilho de reversão nunca disparou com falha
real*. Ele disparou — num repositório descartável, criado só para isso e apagado depois.

## O que foi montado

Um repositório privado com três peças: uma barreira de mentira que reprova quando um
arquivo de documento contém a palavra `QUEBRA`; o workflow do mesclador (só o job de
reversão); e os três módulos reais do mesclador (`mesclador-estreito.js`, `autonomia.js`,
`risco-de-arquivo.js`), copiados sem alteração.

## O que aconteceu, em ordem

| passo | resultado real |
|---|---|
| commit `[mesclador] ensaio: quebra de proposito…` na `main` | barreira rodou (`push`) e ficou **vermelha** |
| `workflow_run` da barreira vermelha | job **reverter** executou — não foi pulado |
| o reverter achou o commit certo pelo sha vermelho | `[mesclador] revertendo 4ddea4ae33: docs/estado.md` |
| tentou abrir a PR de reversão | `HTTP 403` — Actions não abre PR neste repositório |
| caiu no caminho alternativo | `main revertida para 0e986ba02c (docs/estado.md)` |
| conferência final | `docs/estado.md` voltou a `ok` na `main` |

Log do job, sem edição:

```
mesclador: PR de reversão proibida pelo repositório — usando merge do ramo na main
mesclador: main revertida para 0e986ba02c (docs/estado.md)
```

## O que isso prova

1. **a barreira vermelha na `main` acorda a reversão** — o `workflow_run` funciona;
2. **o alvo é o commit certo** — o sha que a execução vermelha avaliou, não "o último merge";
3. **o caminho do 403 funciona em produção**, não só no teste com GitHub de mentira: a PR foi
   proibida e a reversão foi por merge do ramo;
4. **a volta fecha** — o arquivo voltou ao estado anterior.

## O que o ensaio também revelou

Depois do merge de reversão **não houve execução nova na `main`** — o mesmo buraco do merge
normal, agora no caminho da volta: merge com o token do robô não gera evento de `push`. Ou
seja, a `main` revertida ficava sem barreira, justo no momento em que alguém precisa saber se
ela voltou sã.

Corrigido no mesmo PR: depois de reverter por merge, a reversão **pede a barreira** por
`dispatch`, com o mesmo aviso alto (`ATENÇÃO`) se o pedido falhar. Contrato em
`tools/testes/reversao-caminho-do-403.js` (6 casos, incluindo a ordem: mescla primeiro, pede
depois).

## O que continua não provado

- O gatilho agora está provado **num repositório de ensaio**. No repositório de verdade, o
  caminho é o mesmo código e o mesmo workflow — mas nenhuma falha real aconteceu lá, e
  espero que continue assim.
- A reversão por PR (quando o repositório permite) não foi exercitada em CI; só a de merge.
