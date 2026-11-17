# INSTRUÇÃO DO INSTRUTOR — o que se espera de você, Chat

> **Escrito em 2026-11-17 pelo agente instrutor, a pedido expresso do dono.**
> Este documento é a sua tarefa permanente. Ele não substitui `AGENTS.md`,
> `GOVERNANCA-CHAT-PRIMEIRO.md` nem `AUTONOMIA.md` — ele **manda** dentro deles.
> Se algo aqui conflitar com uma guarda de segurança, **a guarda vence**. Sempre.

---

## 0. O pedido do dono, nas palavras dele

> "quero q vc seja extremamente rigoroso e criterioso, quero o trabalho maximo do chat, e
> quero trabalhando continuo, sem pausa, trabalhando cada vez mais e melhor, quero ele
> fazendo chat melhorar cada vez mais"

Traduzindo em obrigação: **não existe "suficiente"**. Cada ciclo tem que deixar o Chat
mensuravelmente melhor do que encontrou, e cada ciclo tem que provar isso com número, não
com adjetivo.

---

## 1. O que você é, hoje, medido

Números do dia 2026-11-17, medidos por mim antes de escrever isto — **não são estimativa**:

| medida | valor | como foi obtido |
|---|---|---|
| `main` do repo `chat` | `a2b6cc0` | `git log --oneline -1` |
| barreira `testes-rapidos` | **#523 success** | API de runs |
| bateria local | **136/136 testes, 3 ignorados** | `npm ci --omit=dev` + `node tools/testes/roda-testes.js` |
| arquivos de teste | **135** | `ls tools/testes/*.js` |
| workflows ativos | **19 + Dependabot + Pages** | API de workflows |
| placar por tipo | comportamento 38/38 · misto 42/42 · estática 56/56 | saída da bateria |

**O que esses números dizem:** a casa está **verde e viva**. Você não está quebrado.
O problema nunca foi "está tudo caindo" — é que **verde não é o mesmo que correto**.
Os defeitos que eu encontrei no repositório `site` nas últimas horas estavam todos sob
suíte verde. Leia a seção 3 antes de se orgulhar do 136/136.

**O que esses números NÃO dizem:** quanta coisa do Chat é **contrato que não pode falhar**.
Isso está na seção 3, item 4, e é a sua dívida mais grave.

---

## 2. As regras do instrutor (não negociáveis)

Estas regras existem porque cada uma delas pegou um defeito real. Não são etiqueta.

### 2.1 Zero trabalho sob promessa
"Não chegou a rodar", "falta só executar", "deve funcionar" — proibido. Se não rodou,
**diga que não rodou**. Um relatório que diz "implementado" sem run é mentira operacional,
mesmo quando o código está certo.

### 2.2 Contrato antes do código
Escreva o teste que falha **antes** da correção. Se o teste já passa antes de você mexer,
ele não testa o que você acha que testa — descubra por quê antes de seguir.

### 2.3 Sabote para validar
Todo contrato novo precisa ser **quebrado de propósito** e você precisa ver o vermelho.
Um contrato que nunca foi visto falhando não é contrato, é decoração. Registre a saída da
sabotagem no relatório, literal.

### 2.4 Nada de falso positivo
Contrato que passa por acidente é pior que contrato nenhum: ele **compra confiança falsa**.
Já aconteceu duas vezes comigo hoje:
- um contrato chamava um arquivo `.py` com `node` e "passava" porque o interpretador errado
  falhava sem imprimir nada;
- outro montava `try:` numa linha só de Python, que não é sintaxe válida — e "passava" pelo
  mesmo motivo.

**Regra prática:** se um contrato pode passar porque *nada foi impresso*, ele está errado.
Exija saída positiva e confira o conteúdo, não só o código de retorno.

### 2.5 Repo intacto, disco zero
- Nenhuma suíte pode sujar arquivo versionado. Prove com `git status --porcelain` vazio.
- Nenhum temporário acumula. Prove contando os temporários **antes e depois**.
  Eu enchi 992 MB de `/tmp` (100%) porque quatro diretórios vazavam a cada execução, e a
  suíte dizia "repositório intacto" — porque ela só olhava o repo, não o disco.

### 2.6 Prioridade igual: Prancheta e Ceifalume
Mesma automação, mesma cobertura, mesma prova. Nunca favorecer um. Se você escrever um
teste para um jogo, escreva o gêmeo para o outro no mesmo commit — ou prove que são o
mesmo caminho de código.

### 2.7 Nada de falso verde escondendo perda
`|| echo "não deu"` no fim de um passo de publicação é **perda de dado com cara de sucesso**.
Se um dado foi gerado e não chegou ao destino, o run tem que **falhar**. Descobri cinco
workflows assim no `site`; procure os seus.

---

## 3. As cinco classes de defeito que você tem que caçar

Não invente categorias novas antes de esgotar estas. Todas foram medidas, não teorizadas.

### 3.1 Estado que se destrói na leitura
O exemplo real, do `site`:
```js
try { if (exists) cache = JSON.parse(...) } catch (e) {}
cache = { estado vazio }        // ← rodava SEMPRE
```
O arquivo era lido e sobrescrito na linha seguinte. **Gravar e ler no mesmo processo
funcionava** — então todo teste no mesmo processo passava. Num processo novo, o histórico
sumia, e `metricas_engajamento` ficou vazio em produção por semanas.

**Como caçar no Chat:** todo módulo com `let cache`/variável de módulo, e todo teste de
persistência que roda tudo num processo só. **Teste de persistência em processo separado,
sempre.**

### 3.2 O cálculo que ninguém lê
`calcularCadencia()` devolvia 90/150/240 min e o portão usava `120` fixo do YAML. O sistema
media, concluía e **ignorava**. Sintoma: um número calculado que não tem consumidor.
**Como caçar:** para cada número que algum módulo calcula, ache quem o lê. Se ninguém lê,
é enfeite — e o relatório está mentindo quando diz que existe otimização.

### 3.3 Identificador que pode repetir
`'al_' + Date.now()` gerou dois alertas com o mesmo id no mesmo milissegundo. Consequência:
o merge de estado indexa por id, recusou o arquivo inteiro, e **a conciliação daquele
estado travou para sempre**. Um id que repete não identifica nada.
**Como caçar:** todo `Date.now()`, `Math.random()`, `uuid` sem contador — veja se o valor
pode colidir e o que acontece se colidir.

### 3.4 Carimbo de tempo tratado como dado
`atualizadoEm` é timestamp: dois runs **nunca** têm o mesmo valor. Um merge de três vias que
trate isso como dado **recusa toda conciliação**. Todo estado que dois processos escrevem
precisa de regra explícita para carimbo (o mais novo vence) separada da regra de dado (o
conflito é recusado).
**Como caçar:** todo campo que termina em `Em`, `_em`, `At`, `_at`, `quando`.

### 3.5 Alerta que não age
Detectar e gravar num JSON não é ação. Um `token_expirando` de severidade crítica ficou
gravado enquanto a publicação tentava de novo com a credencial morta. E a regra de token
media `mtime` de arquivo, não o token — **nome certo, medição errada**.
**Como caçar:** para cada alerta, responda "o que mudou no comportamento por causa dele?".
Se a resposta é "nada", ele não existe.

---

## 4. A metodologia, passo a passo

Um ciclo = **um item**, não dez. Entregar dez itens pela metade é pior que um inteiro.

1. **Medir o estado real.** API, execução, log. Nunca memória, nunca suposição.
   Se a doc diz X e a execução diz Y, **a execução está certa**.
2. **Achar o defeito com número.** "A camada fica `json_invalido` e `recuperacoes.tentadas=3`
   sem nenhuma para ela" — não "a recuperação pode falhar".
3. **Escrever o contrato que falha.** Rode e veja o vermelho. Guarde a saída.
4. **Corrigir com comentário do porquê**, não do o quê. O código diz o quê; o comentário
   tem que dizer **qual defeito aquilo impede de voltar**.
5. **Sabotar a correção.** Volte o bug de propósito. Veja o contrato acusar. Restaure.
6. **Rodar a suíte inteira.** Nunca só o teste novo.
7. **Commit de assunto único**, com o antes/depois e a sabotagem no corpo da mensagem.
8. **Confirmar o hash remoto.** `git push` sem conferir o `log` remoto não é prova.
9. **Atualizar `CONTINUIDADE.md` no mesmo commit** — é regra da casa e há barreira.
10. **Registrar a dívida que sobrou.** O que você não fez, com nome e número.

**Proibido encerrar ciclo com:** item sem run, contrato não visto falhando, temporário
acumulado, ou dívida escondida.

---

## 5. O que você tem para trabalhar (e o que não tem)

### 5.1 Acesso
O PAT (`GH_PAT`/`GHPAT`) alcança **os 15 repositórios** com `push` e `admin`:
`acervo, agente, agente-espelho, ambiente, base, base-espelho, ceifalume, chat, midia,
motor, prancheta, projetos-arquivados, reboclbrank-max.github.io, rele, site`.
Escopos: `repo`, `workflow`, `admin:org`, `delete_repo`, `gist`, `packages`, `project`, `user`.
**Trate como chave-mestra.** Nunca em log, issue, URL, mensagem, commit ou arquivo.

### 5.2 Secrets já configurados
Instagram, Nostr, X e Gmail estão prontos no Actions do `site` (34 secrets) e do `chat`
(25 secrets). **Não peça ao dono.** Se falta credencial, o certo é o código dizer
"não verificável" — nunca inventar zero, nunca fingir sucesso.

### 5.3 Horário de postagem
Deriva do **fluxo de acesso de cada rede**, nunca de horas fixas. Um intervalo calculado
sem amostra mínima é chute com cara de dado: 2 acessos não são padrão. Use número mínimo
de amostra, explícito no código, e faça o resumo **dizer** quando a amostra é insuficiente.

### 5.4 O que NÃO fazer
- **Pinterest e TikTok: removidos.** Não citar, não testar, não ressuscitar.
- **itch.io:** a interação social terminou. Os workflows `administrar/medir/editar/enviar-itch`
  existem e devem continuar funcionando; não criar novos.
- **`copiar-x-para-site.yml`: não disparar** sem ordem explícita do dono.
- Não revogar, rotacionar ou desativar PAT, secrets, workflows ou APIs sem ordem.

---

## 6. Trabalho contínuo — como não parar

O dono não quer que você pergunte "o que faço agora?". Ele quer que você **saiba**.

**Fila permanente, em ordem de valor:**

1. **Dívida de contrato.** Liste os contratos do Chat que nunca foram vistos falhando.
   Cada um é uma promessa não cumprida. Escolha um por ciclo, sabote-o, conserte.
2. **As cinco classes da seção 3**, aplicadas ao código do Chat — não ao `site`.
   Comece por 3.1, porque ela é invisível em teste de processo único.
3. **Cobertura desigual.** Onde o Chat tem teste para um canal e não para o gêmeo
   (dois jogos, duas redes, dois caminhos), o gêmeo é dívida.
4. **Alertas que não agem.** Cada alerta do Chat: o que muda no comportamento? Se nada,
   ou vira ação, ou é removido. Alerta inerte ensina o dono a ignorar alerta.
5. **Falso verde.** Todo `|| echo`, todo `catch (e) {}` engolindo, todo `if` que poderia
   nunca ser verdadeiro. Cada um é um lugar onde a casa pode estar quebrada e sorrindo.

**Quando terminar a fila:** ela não termina. Um contrato consertado revela o próximo.

**Regra de continuidade:** ao fim de cada ciclo, deixe escrito no `CONTINUIDADE.md`
(a) o que foi feito com número, (b) o que ficou aberto com nome e número, (c) qual é o
próximo ciclo. Quem continuar não deve precisar redescobrir nada.

---

## 7. Como você será auditado

Eu não confio no seu relatório. Confiro na fonte:

- **API do GitHub**: `runs`, `event`, `conclusion`, `run_number`. Se você diz "rodou",
  eu vejo o run.
- **Log do job**: a saída literal, não o resumo que você escolheu escrever.
- **Conteúdo do arquivo no `main`**: o estado que realmente está versionado, não o que você
  disse ter gravado.
- **Sabotagem**: eu vou quebrar a sua correção e ver se o seu contrato acusa. Se não acusar,
  o contrato não vale nada.
- **Antes/depois**: número velho contra número novo. Sem os dois, não há prova.

**O que me faz dizer "entregue":** um run identificado por número, a saída `OK` do contrato,
a prova de sabotagem com o texto do vermelho, e o antes/depois.

**O que me faz dizer "não entregue":** "implementado", "só falta rodar", "deve funcionar",
número aproximado ("uns 130 testes"), e contrato que nunca foi visto falhando.

---

## 8. O erro que eu cometi e que você não deve repetir

Eu publiquei um YAML inválido dentro de um workflow porque coloquei um heredoc aninhado
(`<<'PY'` dentro de `run: |`). O arquivo quebrou, e o commit foi junto. Localizei porque
um contrato leu o YAML e explodiu — não porque eu testei antes.

Da mesma forma, um `str.replace` meu pegou uma ocorrência dentro de um **comentário** do
arquivo errado e corrompeu o teste que eu estava escrevendo. Só apareceu porque a suíte
inteira rodou depois.

**Lição, e é a mais importante deste documento:** validar o artefato, não a intenção.
- YAML: `python3 -c "import yaml; yaml.safe_load(open(...))"`.
- Python: `ast.parse`.
- Node: `node --check`.
- Markdown com tabela: conferir que a tabela tem o número certo de colunas.
- Qualquer replace: imprimir as N ocorrências antes de substituir.

**E sempre a suíte inteira, nunca só o que você acha que tocou.**

---

## 9. Primeiro ciclo — faça exatamente isto

Não comece pelo mais fácil. Comece pelo que **prova que você sabe medir**.

1. Rode `npm ci --omit=dev` e `node tools/testes/roda-testes.js`. Anote o placar.
   Meu número de referência: **136/136 · 3 ignorados**. Se divergir, descubra por quê
   antes de qualquer outra coisa.
2. Liste os contratos que compõem a bateria e marque os que **nunca foram vistos falhando**
   (procure `ok(...)` que compara uma constante com ela mesma, `assert` sempre verdadeiro,
   teste que só verifica se o arquivo existe). Esse é o seu mapa de falso positivo.
3. Escolha **um** desses contratos. Sabote o código que ele deveria proteger. Se ele
   continuar verde, você achou um falso positivo — conserte o contrato primeiro, depois o
   código.
4. Entregue: run #, saída OK, sabotagem antes/depois, e qual é o próximo.

**Não me traga dez itens. Me traga um, provado, e o próximo identificado.**
