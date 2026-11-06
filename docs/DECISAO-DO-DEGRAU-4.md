# Ligar o degrau 4: a decisão que é sua

Este documento existe para uma decisão só. Ele mede, mostra as duas opções e o que cada
uma custa. Nenhum programa vai mudar o nível por conta própria — essa linha é sua.

## O que está medido hoje

Medido na `main` com `node tools/portoes.js`, não de memória:

```
🚪 3/4 abertos (nível atual: texto)
✅ 1. barreira confiável — janela de 11 execuções, zero falha
✅ 2. julgamento com evidência — 49 registros ao vivo, nenhum incidente
✅ 3. faixa de código e volta — reversão exercitada de ponta a ponta num repo de ensaio
⛔ 4. mais de um arquivo — falta o mês sem incidente (~05/12)
```

## O que o degrau 4 faz — e o que ele não faz

**Faz:** além de documento em `docs/` e `posts/`, a casa passa a mesclar sozinha o **código
de três arquivos nomeados**, cada um com o custo do próprio erro declarado:

| arquivo | se a máquina mesclar uma versão errada |
|---|---|
| `tools/indice-capacidade.js` | placar de capacidade errado, no próprio documento |
| `tools/inventario-estado-operacional.js` | inventário errado — lê, não escreve |
| `tools/dossie-preparo-controlado.js` | dossiê errado que uma pessoa lê antes de decidir |

**Não faz:** não toca em e-mail, segredos, postador, workflows, dependências, páginas
públicas nem em nenhum instrumento que mede os portões. Não decide conteúdo. Não sobe de
nível sozinho. Não mescla PR de fork, PR em rascunho, PR grande demais, nem nada com a
barreira vermelha.

## O ponto que muda a conversa

O painel considera `nivel: "codigo"` **legítimo hoje**: ele exige os portões 1, 2 e 3 — e os
três estão abertos. O portão 4 (o mês) não é exigência para ligar; ele é a medida de
maturidade: um mês rodando sem incidente.

Ou seja: **esperar o mês é escolha, não bloqueio.**

## Opção A — ligar agora, com prazo

```json
{ "nivel": "codigo", "desde": "2026-11-06", "expira_em": "2026-12-05" }
```

- **O que ganha:** a máquina faz o trabalho repetitivo de hoje (mesclar documento e três
  arquivos de código), e você deixa de ser o gargalo em cada PR. É o ensaio que o próprio
  desenho previu: começa com prazo e termina sozinho.
- **O que arrisca:** um erro num desses três arquivos entra sem você ver antes. O custo está
  tabelado acima, e é sempre "documento ou número errado", nunca "casa calada".
- **A rede:** passada a data, a casa volta sozinha para `texto`. E desligar antes é uma linha.
- **O que fica sem prova:** o gatilho de reversão nunca disparou com uma falha real; o
  registro ao vivo tem 49 decisões, não meses.

## Opção B — esperar 05/12

- **O que ganha:** o mês inteiro rodando no degrau 3, com o portão 4 fechado por medida —
  a posição mais defensável que existe.
- **O que perde:** mais um mês com você no caminho de cada mudança. E o portão 4 só mede o
  que o degrau 4 faz: esperar parado não exercita a faixa.

## Como ligar e como desligar

Ligar: edite `autonomia.json` com o bloco da Opção A. Desligar: troque `nivel` por
`"desligado"` — vale no próximo ciclo, sem reiniciar nada.

O vigia passa a mostrar no estado da casa: *"autonomia no degrau 4: 3 arquivo(s) na faixa,
prazo até 2026-12-05"*. Se o prazo vencer, ele mostra *"desligada pelo prazo"* — e isso é o
sistema funcionando, não uma falha.

## O que continua não provado (leia antes de decidir)

1. O gatilho de reversão em produção **nunca disparou com falha real**. O pior caso é
   conhecido e coberto: o vigia acusa barreira vermelha e avisa você.
2. A janela da barreira prova que o navegador abre sempre — **não** prova carga de dias
   diferentes.
3. A faixa foi exercitada num repositório de ensaio (o nível abre a porta, o essencial
   continua fechado), mas **nenhum arquivo da faixa foi mesclado errado de propósito** para
   ver o estrago. O custo de cada um é frase escrita, não medição.
4. O prazo foi provado com relógio real em quatro segundos — a comparação funciona; um mês
   de espera, não foi esperado.
