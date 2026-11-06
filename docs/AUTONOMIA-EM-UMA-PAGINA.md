# A autonomia da casa em uma página

Escrito para quem vai decidir se sobe o nível — não para quem programa.
Sem termo técnico sem explicação ao lado.

## O que existe hoje

O nível fica em **um arquivo só**, `autonomia.json`, na raiz do repositório. Nada
mais guarda "lembrança" de nível: se o arquivo sumir, ficar ilegível ou tiver um
valor desconhecido, **a casa age como desligada**. Isso é de propósito — falhar
fechado é melhor que falhar esperto.

| degrau | `nivel` | o que muda na prática |
|---|---|---|
| 1 | `desligado` | nada acontece sozinho; toda mudança passa por uma pessoa |
| 3 | `texto` | a casa pode mesclar sozinha mudanças que só tocam **texto** (documentos, posts) |
| 4 | `codigo` | além do texto, entra sozinho o código de uma **lista curta e explícita** de arquivos |

O degrau 2 é o dia a dia: a casa já faz muita coisa, mas cada mudança de arquivo
continua esperando alguém.

## Quem decide se uma mudança entra

Um programa pequeno, o **mesclador**, olha a mudança e responde sim ou não:

1. Quais arquivos ela toca? Se algum for **essencial** (o que acorda a casa, o
   envio de e-mail, o próprio vigia), a resposta é **não**, sempre.
2. Os arquivos estão na faixa permitida para o nível de hoje? Se não, **não**.
3. A bateria de testes passou? Se não, **não**.

"Essencial" é uma lista escrita à mão, arquivo por arquivo. Ela não é adivinhada
por nome nem por pasta: adivinhar por prefixo já errou uma vez neste projeto.

## Como desligar

Abra `autonomia.json` e troque o nível:

```json
{ "nivel": "desligado" }
```

Vale a partir do próximo ciclo — não precisa reiniciar nada, não precisa pedir
licença a nenhum programa. Desligar é **sempre** permitido; subir de nível é ato
humano, e nenhum programa escreve nesse arquivo.

Se quiser que o degrau volte sozinho, marque uma data:

```json
{ "nivel": "codigo", "expira_em": "2026-12-05" }
```

Passada a data, a casa lê o arquivo como `desligado` e continua funcionando. É a
única autonomia que termina sem ninguém lembrar.

## O que o vigia faz — e o que ele não faz

O **vigia** olha a casa a cada 15 minutos e publica um estado simples: cada item
✅ ou ❌, com uma causa em código (nunca resposta crua de serviço de fora).

- Ele **avisa** por e-mail quando a mesma pane se repete em duas rodadas.
- Ele **tenta** uma recuperação só nos casos em que já sabe que dá certo (turno
  parado, bateria atrasada) — e no máximo uma vez por intervalo.
- Ele **não** mexe em autonomia, **não** religa o que foi desligado à mão e **não**
  conserta configuração errada.
- Nível alto sem prazo, ou sem faixa, aparece como ❌ no estado — aviso, não
  alarme de madrugada.

## O que ainda não está provado

Vale ler antes de subir o nível, porque estas frases continuam verdadeiras:

- a bateria de testes já rodou muitas vezes seguidas sem falhar, mas isso prova
  que ela **abre** sempre — não prova carga de dias diferentes;
- a reversão de emergência já rodou inteira num repositório de ensaio, mas o
  gatilho automático (barreira vermelha numa mudança da casa) nunca disparou em
  produção; se ele falhar, o vigia acusa e avisa, e a casa fica no degrau de hoje;
- o julgamento do mesclador sobre mudanças antigas foi conferido em 40 casos
  reais; o número de decisões ao vivo é menor que o exigido para o degrau 4;
- o prazo (`expira_em`) foi testado com data forjada, não esperando o relógio.

O painel `docs/PORTOES-DO-DEGRAU-4.md` mostra quais portões estão abertos e com
que número — e `node tools/portoes.js` repete a medida na hora.
