# Plano — extração final do núcleo das páginas

Referência: achado A4 da auditoria `base/ia-propria/AUDITORIA-CHAT-2026-10-24.md`.
Estado em 2026-10-24: **primeiro corte concluído** (fonte única + teste de sincronia).
Este documento descreve o corte seguinte, que ainda **não** foi executado.

## O que já foi feito (2026-10-24)

- `index.html` é a **fonte única**. `direto.html`, `ligar.html` e `limpar.html` são geradas por
  `tools/montar-paginas.js` a partir de `paginas/rotas/<rota>.json`.
- Regras por rota: **6** para `direto`, **6** para `ligar`, **2** para `limpar` (total 14).
- O contrato `tools/testes/paginas-geradas.js` falha se a regeneração divergir do arquivo
  commitado, se uma regra ficar órfã, se uma função fora de `abrir`/`enviar`/`reabrirUltima`
  passar a divergir, ou se o número de regras crescer acima do teto revisado.
- Medição que motivou o corte: das **221** funções declaradas, **218 são idênticas** nas quatro
  rotas; o bloco de JavaScript inline tem **495 KB** e a casca (HTML/CSS) é idêntica.

Ganho imediato: uma correção de comportamento/comando passa a ser escrita **uma vez** em
`index.html`, e o esquecimento de uma rota vira falha de teste em vez de bug silencioso.

## O que falta (corte seguinte)

Servir o núcleo como arquivo externo, para o repositório parar de guardar quatro cópias de 495 KB:

1. `chat-nucleo.js` = o bloco inline comum (218 funções + estado de módulo).
2. `index.html` e derivadas passam a ter `<script src="chat-nucleo.js"></script>` e um `<script>`
   inline curto com as funções da rota (`abrir`, `enviar`, `reabrirUltima`) e a inicialização.
3. `sw.js` ganha `./chat-nucleo.js` na `CASCA` e sobe de versão (ativação continua só pela
   escolha da pessoa).
4. Ordem de execução: o script externo entra **no mesmo ponto** onde hoje está o inline, para
   preservar a ordem (bindings `const`/`let` de scripts clássicos são visíveis ao script seguinte,
   mas apenas nessa ordem).

### Por que ainda não foi feito

- **Muda a ordem de execução e o carregamento**: hoje tudo é um script único; amanhã são dois, e o
  service worker passa a cachear um arquivo a mais. Sem navegador não é possível provar que
  `DOMContentLoaded`, listeners e o PWA continuam iguais.
- **Migração de testes**: cerca de 45 suítes leem o HTML das rotas e comparam texto. Elas passariam
  a precisar de uma leitura combinada (`página + núcleo`). É mecânico, mas amplo, e um erro de
  migração esconde regressão em vez de revelar.
- A validação mínima exigida é **Chromium controlado** (as quatro rotas, layout desktop/móvel,
  PWA, rascunho e Workspace), que o ambiente desta sessão não tem. Alternativa parcial aceitável:
  `jsdom` para provar que os globais existem e que nenhuma função ficou órfã — mas isso **não**
  substitui a prova visual.

### Passos do corte seguinte

1. Congelar o estado atual (este corte) e abrir ramo próprio.
2. Gerar `chat-nucleo.js` por script, a partir do corpo do bloco inline de `index.html`.
3. Migrar os testes de leitura de página para um helper único `lerPagina(rota)` que devolve
   `casca + núcleo` — um arquivo por commit, com o corredor verde a cada passo.
4. Subir `sw.js` e rodar o Chromium controlado nas quatro rotas.
5. Rollback: reverter o commit; as páginas geradas voltam ao formato inline.

### Critério de aceite

- `git grep -c "" index.html` cai de ~4.176 para menos de 200 linhas (só a rota).
- Repositório perde ~1,5 MB de duplicação.
- Corredor completo verde, Chromium controlado 4/4, `sw.js` com o novo ativo na casca.
- `paginas-geradas.js` continua provando que as rotas derivadas não divergem.
