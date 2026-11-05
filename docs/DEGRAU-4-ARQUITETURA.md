# Degrau 4 — a arquitetura antes da permissão

O degrau 4 é: **a máquina mescla código sem ninguém olhar**. Antes de dar essa permissão,
este documento fixa o que precisa existir para que ela não vire empecilho — e o que já
existe, pronto e medido.

A regra que organiza tudo: **subir de degrau não é ganhar velocidade, é trocar quem
responde pelo erro.** No degrau 3, quem responde é a faixa (`docs/`, `posts/`). No degrau 4,
quem responde passa a ser a barreira de testes. Se a barreira não for confiável, o degrau 4
não é autonomia: é roleta.

## As quatro peças, e onde cada uma está

| peça | para que serve | estado |
|---|---|---|
| **interruptor** (`autonomia.json` + `tools/autonomia.js`) | diz quanto a casa pode fazer hoje; falha fechada | **pronto** |
| **mapa de risco** (`tools/risco-de-arquivo.js`) | diz o que cada arquivo pode machucar; desconhecido = essencial | **pronto** |
| **termômetro da barreira** (`tools/termometro-barreira.js`) | mede se a barreira merece ser o juiz | **pronto — e reprovando** |
| **volta** (reversão do mesclador) | desfazer sem pedir licença a ninguém | **provado em produção** |

## 1. Interruptor de autonomia

Um arquivo na raiz, lido por quem age:

```json
{ "nivel": "texto" }
```

Três níveis fechados: `desligado`, `texto`, `codigo`. Regras de projeto:

- **falha fechada** — arquivo ausente, ilegível ou nível inventado = `desligado`;
- **sem memória** — não existe "ele estava ligado ontem", então nada religa sozinho;
- **desligar é imediato** — o próximo ciclo já obedece, sem publicar nada;
- **quem obedece ao nível não pode mudar o nível** — `autonomia.json` é `essencial` no mapa
  de risco, então o mesclador nunca o altera sozinho.

O vigia mostra o nível no estado da casa (item **“Autonomia (nível)”**) e **acusa** se
alguém ligar `codigo` sem o termômetro aprovado.

## 2. Mapa de risco

Classificação por **lista explícita**, nunca por heurística:

| categoria | o que é | pode entrar sozinho? |
|---|---|---|
| `texto` | `docs/**` e `posts/**` (`.md`, `.json`) | sim (degrau 3) |
| `codigo-seguro` | código com contrato próprio, sem credencial, sem publicar estado | só se estiver na lista explícita |
| `essencial` | e-mail, segredos, postador, workflow, dependência, página pública, **desconhecido** | nunca |

A lista de `codigo-seguro` está **vazia hoje**, de propósito. Promover um arquivo é ato
humano: exige contrato próprio e prova de que ele não cala a casa.

## 3. Termômetro da barreira — o juiz presta?

Mede, com dado real dos últimos 60 ciclos da `main`: taxa verde, falhas recentes e se
alguma falha se concentra num passo só (sintoma de teste instável, não de defeito).

Critérios para liberar o degrau 4: **≥ 20 execuções**, **≥ 90% verde**, **zero falha nas
últimas 10** e **nenhum passo concentrando mais de 40% das falhas**.

Medição de 05/11/2026:

```
execuções medidas: 60 · verdes 59 · vermelhas 1 · verde em 98.3%
falhas nas últimas 10: 0
passo que mais reprova: Navegador controlado (quatro rotas, desktop e mobile) — 100% das falhas
⛔ degrau 4 NÃO liberado
```

Ou seja: a barreira está **quase** lá, e o único motivo que a reprova é exatamente o teste
instável que já é conhecido (`navegador-lista-controlado.sh`). É um empecilho **nomeado e
pequeno** — não uma opinião.

## 4. A volta

Se a `main` ficar vermelha depois de um merge do mesclador, ele abre a PR de reversão e ela
passa pela mesma barreira. **Provado em produção em 05/11**: a PR `#92` foi criada pelo
próprio mecanismo, ficou verde e foi mesclada sozinha (`9d0a135d7f07`), desfazendo o merge
anterior. Nunca há push direto na `main`.

O que ainda não foi exercitado é o **gatilho** (reversão nascida de uma `main` vermelha de
verdade). Provocar isso exigiria sujar produção de propósito.

## Condições de liberação (Go / No-Go)

Só se sobe para `codigo` quando **todas** forem verdadeiras:

1. termômetro **aprovado** com dado novo (não reaproveitado);
2. teste de navegador **estabilizado** — sem ele, a barreira reprova por instabilidade;
3. lista de `codigo-seguro` com **poucos arquivos**, cada um com contrato próprio;
4. reversão exercitada por um caso real (não forçado);
5. o dono diz **"vamos"** com os quatro itens acima na mão.

Enquanto qualquer uma faltar, `autonomia.json` fica em `texto` — e o degrau 3 continua
fazendo o trabalho dele, sem pressa e sem risco.

## O que o degrau 4 nunca vai poder

Mesclar segredo, turno de e-mail, postador, workflow, dependência ou a própria configuração
de autonomia. Isso não é uma promessa de comportamento: esses arquivos **não existem** na
faixa de nenhum nível.
