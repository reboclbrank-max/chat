# Rodada 104 — o defeito da própria correção e o que ele custava

Base: `main@9848907` (rodada 103 publicada). Data: 29/10/2026.

## 1. O defeito que eu mesmo introduzi na rodada 103

Na 103 eu criei `_limiteRota` para encurtar o timeout de rota lenta, derivando a janela da
**latência média de sucesso**. O problema: `latAmostras` só sobe em `_premiar`, isto é, **só quando
a rota responde**. Rota que só estoura o relógio nunca ganha amostra e, portanto, **continuava
recebendo a janela cheia de 25 s. Para sempre.**

Consequência medida na janela de 103: **63 timeouts**, custo médio 17,8 s, **18,7 minutos**
queimados — o maior desperdício isolado daquela janela. A correção existia e não alcançava
exatamente o caso que deveria alcançar.

## 2. O que mudou

| regra | antes (103) | agora (104) |
|---|---|---|
| janela de rota que nunca respondeu | 25 s fixos | 12,5 s → 6,25 s → **6 s** (corte pela metade por estouro, até 3) |
| evidência usada | só sucesso | sucesso **e** falha |
| rota com 4 falhas seguidas | continuava na fila | **descanso de 60 s**, sem ser morta |
| cota (`rate`) | cooldown próprio | inalterado — não é falha de saúde |
| sucesso | zerava falhas seguidas | zera também os estouros |

Regra de segurança preservada: **sem nenhuma evidência, nada muda.** Rota nova recebe o pedido
original intacto.

## 3. Prova de mecanismo (medida no log da janela em curso)

Item `original #20`, candidato, 8 chamadas na mesma resposta:

```
lagunas   timeout  11695ms
ovhoss20  timeout  15192ms
gigante2  timeout  30002ms   ← primeira tentativa, janela cheia
ultra     texto    22112ms
ultra     timeout  19000ms
polli     timeout   5000ms   ← depois da evidência de falha
ovhoss20  timeout   6002ms   ← 6 s, não 25 s
gigante2  timeout   6002ms   ← 6 s, não 30 s
```

As três últimas tentativas custariam 75 s na rodada 103; custaram **17 s**.

## 4. Contratos (14 no total, offline)

`tools/testes/roteamento-com-chave.js` agora cobre, além dos 10 anteriores:

- janela cai pela metade por estouro, respeitando piso de 6 s e sem descer mais;
- sucesso zera `timeoutsSeguidos` e devolve folga à janela;
- disjuntor de 4 falhas seguidas põe a rota em descanso sem matá-la;
- `rate` não aciona o disjuntor.

`tools/testes/chave-do-dono.js` (5 contratos) verifica o comando `!chave`: listar, ver, apagar,
a chave só no cabeçalho `Authorization`, tratamento de 401/403/429 e a proibição de chave real
no repositório.

## 5. Ativação da chave agora é verificável

`!chave groq gsk_...` passou a **testar de verdade** depois de salvar: faz uma chamada mínima e
responde `✅ chave válida — respondeu em N ms`, `❌ chave recusada (401)` ou `⏳ cota no limite (429)`.
Também: `!chave` sem argumento lista os serviços guardados e `!chave groq apagar` remove.
A chave nunca sai do `localStorage`, nunca vai no corpo nem na URL, e **não há chave no repositório**
(mesmo verificador checa `gsk_` no HTML e no roteador).

## 6. Barreira

`npm test`: **107/107 executados**, 3 ignorados por pré-requisito local (Chromium, OCR, `pdftotext`).
Comportamento 24/24 · misto 34/34 · estática 49/49. CSP 10/10.

## 7. Comparação pareada 104

<!-- RESULTADO -->

## 8. O que continua aberto

- **As 5 falhas de fato** (#16 rio, #13 antígeno, #6 resíduo/ambiental, #14 parâmetro, #17
  isolamento) não dependem de timeout. Nenhuma correção desta rodada as toca.
- **Estrutura em parágrafos** continua frágil quando o único que responde devolve 1 parágrafo:
  o item #20 falhou assim mesmo com 73 palavras geradas.
- **`motor*.html` e `dna.json`** seguem sem a rota Groq, de propósito: ali não há tratamento de
  chave e ela viraria 401, marcando a rota como morta.
- **A chave da Groq só existe se o dono criar.** Eu não posso criar conta em nome de outra pessoa.
