# Continuidade do Chat — Rebocl Brank

> **Documento operacional obrigatório para qualquer pessoa ou agente que for mexer neste repositório.**
>
> **Retrato consolidado em 2026-10-17.** Ele descreve o estado de `main` após o pacote de segurança, a expansão local e a correção da aferição do teste real de e-mail. Antes de agir, confira a `main` remota: ela sempre vence este retrato se algo tiver mudado depois.

## 0. Regra permanente de continuidade

Toda alteração que mudar comportamento, segurança, privacidade, fluxo operacional, workflow, dependência, teste, arquivo importante ou capacidade do Chat **deve atualizar este documento na mesma série de commits**. Registre, de forma curta e verificável:

1. o que mudou e por quê;
2. quais arquivos e canais foram afetados;
3. o que foi preservado ou deliberadamente não foi alterado;
4. quais testes foram executados e o resultado;
5. a pendência ou limitação que restar, se houver.

O teste `tools/testes/continuidade.js` mantém esta regra visível e, em um push que altera código ou workflow, exige que `CONTINUIDADE.md` também esteja entre os arquivos alterados. `testes-rapidos.yml` observa as páginas, workflows e todo JavaScript/Python em `tools/`, para que uma ferramenta operacional não escape dessa porta. Não use esse mecanismo para iniciar trabalho por conta própria: ele serve para registrar mudanças **já autorizadas**.

Além deste arquivo público, registre a decisão relevante na memória privada `reboclbrank-max/base`, em `ia-propria/ESTADO-DO-CHAT.md` e `empresa/registro-de-decisoes.md`. Não copie valores de credenciais para nenhum dos dois repositórios.

---

## 1. Mapa do sistema e limites entre repositórios

| Parte | Repositório | Papel atual | Limite importante |
|---|---|---|---|
| Página, e-mail, Telegram e testes | `reboclbrank-max/chat` (este, público) | Interface GitHub Pages, trabalhadores do canal de e-mail/Telegram, workflows e provas técnicas | Nunca incluir segredos, conteúdo privado, endereço completo ou token neste repositório. |
| Cérebro, memória e Issues | `reboclbrank-max/agente` (privado) | Processa as conversas e guarda a memória/ordens privadas | Não mudar por reflexo de uma tarefa no `chat`; pode haver bloqueio de cobrança nas Actions privadas. |
| Automação pública e vitrine | `reboclbrank-max/site` (público) | Postador, estado público e Comitê no Bolso | O dono autorizou marketing contínuo nos canais já configurados; preservar marca, fatos, anti-spam, métricas e reversibilidade. |
| Memória oficial | `reboclbrank-max/base` (privado) | Regras, decisões, pendências e estado histórico | Deve ser lido antes de atuar e atualizado após mudança autorizada. |

### Endereços e entradas

- Página principal: `https://reboclbrank-max.github.io/chat/`.
- Rota alternativa da página: `direto.html`.
- Painel de comando: `console.html`.
- As conversas da página usam Issues do repositório privado `reboclbrank-max/agente`.
- O canal de e-mail e o Telegram usam GitHub Actions e segredos configurados no GitHub; **os valores não pertencem a este repositório**.

---

## 2. Estado funcional atual

### 2.1 Página web e conversa pelo navegador

A interface é uma aplicação estática hospedada no GitHub Pages. Ela lista/cria conversas, envia e recebe mensagens por Issues do `agente`, pesquisa títulos, permite renomear/fechar/reenviar/copiar, exporta/importa conversas e mantém recursos locais como tema, voz, cache offline e cérebro local no navegador.

Arquivos de rota que precisam permanecer coerentes quando a interface muda:

| Arquivo | Papel |
|---|---|
| `index.html` | Entrada normal da página. |
| `direto.html` | Entrada alternativa para contornar cache preso. |
| `ligar.html` | Variante da interface que precisa receber as mesmas correções de acesso/segurança. |
| `limpar.html` | Variante que limpa a experiência/cache e volta para a página; não deve reabrir fluxo inseguro de token. |
| `console.html` | Painel que consulta o estado e envia ordens autorizadas ao `agente`. |
| `motor.html`, `motor02.html`, `motor03.html`, `motor04.html` | Células/modelos locais de navegador, sem depender do PAT da página. |
| `sw.js` e `manifest.json` | PWA e cache; o service worker só pode cachear a casca estática aprovada. |

**Regra prática:** as quatro variantes principais (`index`, `direto`, `ligar`, `limpar`) compartilham a mesma lógica de acesso. Não corrija uma sem verificar as outras.

#### Catálogo de comandos sem copiar listas defasadas

O catálogo da página muda mais que esta documentação. A fonte operacional completa é o comando `!ferramentas` e a função `maosDaCasa()` nas quatro páginas; a lista de autocompletar também está no fim delas. Os comandos do e-mail/Telegram são definidos por `AJUDA` e `CAPS` em `tools/email-chat.js`. Quando um comando for criado, removido ou tiver semântica relevante alterada, atualize este retrato com a família, o arquivo-fonte, os canais alcançados e o teste correspondente — não copie uma lista longa que logo ficará antiga.

### 2.2 PAT da interface e comandos manuais

O dono decidiu expressamente que o PAT usado **somente pela interface web** deve ficar automático e persistente no navegador dele:

- ele é informado só pelo campo **⚙️ Configurar acesso**;
- fica em armazenamento local da mesma origem e é reaproveitado pelo `console.html` e pelas rotas da página;
- uma cópia ainda existente na sessão é migrada ao armazenamento local no próximo carregamento;
- links com `?t=` e o comando `!token` são recusados;
- texto que pareça token é bloqueado antes de ir a Issue, motor ou canal público;
- ele nunca deve aparecer em URL, mensagem, Issue, log, commit, prova ou resposta;
- o risco residual de armazenamento local desse perfil do navegador foi aceito explicitamente pelo dono.

Isso **não autoriza** mexer nos segredos da automação independente, APIs de marketing, credenciais de repositórios ou tokens dos workflows. Eles permanecem fora do escopo, intactos e sem valores documentados aqui.

### 2.3 Canal de e-mail

O workflow `email.yml` mantém o atendimento por e-mail em turnos longos e uma reserva. A implementação relevante é:

| Arquivo | Responsabilidade |
|---|---|
| `tools/email-poll.js` | Escuta/coordena o turno de e-mail e a troca de código. |
| `tools/email-chat.js` | Lê mensagens, decide a resposta, processa anexos e fala com os motores. |
| `tools/prepara-foto.py` | Regrava a imagem sem metadados e normaliza orientação/tamanho. |
| `tools/ocr-local.py` | OCR local; serviço externo só pode ser usado com autorização explícita no e-mail. |
| `tools/olho.py` | Análise local simples de imagem para fallback honesto. |
| `tools/visao-local.py` | Visão local em CPU quando as rotas de visão externas falham. |
| `tools/transcreve.py` | Transcrição local de áudio. |
| `tools/geografia-brasil.js` | Consulta local completa das 27 UFs: divisas, capitais, Grandes Regiões e resumo `uf:`; responde comando ou pergunta inequívoca sem motor ou rede. |

O canal atende texto, foto, PDF/Word/TXT/CSV/JSON, planilha, PDF escaneado, áudio e vídeo curto. Há memória por remetente + assunto, proteção contra remetente não autorizado/falsificado, prevenção de loops com robôs e rede de segurança para e-mail lido sem resposta. Respostas e logs públicos devem continuar mascarados; anexos e conteúdo privado não podem ser publicados.

**Resultado real mais recente (17/10/2026):** a primeira rodada sintética pelo canal real enviou 38 entradas. Na janela inicial de 14 minutos, 26 respostas chegaram, uma não resposta automática foi correta e 11 entradas esperadas continuavam não lidas; os atrasados foram atendidos depois, evidenciando fila/latência em rajada, não perda silenciosa nessa rodada. O antigo `27/27 PASS` era inválido como total porque omitia ausências do denominador. `tools/teste-email-resultado.js` agora obriga todo envio a entrar na conta, falha em ausência/erro e o workflow usa 25 minutos por padrão.

A rodada seguinte, já com aferição corrigida, terminou **37/38 PASS**, latência de 1,3–17,5 min (média 9,6), e o workflow falhou corretamente. A pesquisa antes desviada passou com fonte. A única falha foi R3-6: no modo degradado de visão, identificou formas/cores, mas não entregou a data da foto e declarou visão indisponível. Portanto, há evidência de que o lote foi atendido no prazo calibrado e de que a aferição/rota foram corrigidas, mas **não** há aprovação integral da visão sob carga. Isso continua sendo teste controlado, não prova de satisfação, adoção, SLA ou capacidade geral.

`tools/geografia-brasil.js` agora só aceita prefixos geográficos explícitos; outros prefixos passam para sua rota própria. `coleta-respostas.js` ignora os dois aliases sintéticos (`+teste` e `+estranho`) para não contar a própria entrada de teste como retorno. Como `email-chat.js` importa geografia, `tools/email-poll.js` também passou a tratá-la como mudança de código que exige troca de turno após a barreira aprovada; sem isso, a correção poderia permanecer fora do trabalhador até a rotação natural. Um diagnóstico curto posterior de foto travou no próprio leitor IMAP e foi cancelado; o reteste seguinte publicou falso `SEM RESPOSTA` porque a coleta percorria histórico pesado antes da mensagem nova. Coleta independente achou o retorno do Chat cerca de 2 min depois, com os sinais esperados de texto/formas/cores. `tools/teste-foto.js` agora tem teto, reconexão, busca somente da rodada atual, envelope antes do corpo, deduplicação, UIDs recentes primeiro e saída não zero. O reteste posterior confirmou a falha R3-6 sem erro de coleta: resposta presente, formas/cores corretas, data ausente e visão degradada. A causa reproduzida é a compressão JPEG reduzir a confiança do OCR; `leTextoLocalComReserva()` compara a cópia original só em processo local temporário quando a cópia higienizada ficou abaixo de confiança, sem enviar o original à rede. O teste de OCR cobre a recuperação da data; ainda falta prova real posterior à publicação para dizer que a falha foi corrigida no canal. `CAPACIDADE.md` agora separa o indicador interno da última rodada real e destaca uma falha real acima do número do placar; não altera pesos. O vigia também foi visto travado na própria sonda IMAP; `tools/vigia-casa.js` ganhou tetos em cada operação de caixa e `vigia.yml` tem limite global de 15 min. Uma sonda que estoura o teto registra falha/cura em vez de permanecer invisivelmente pendurada. A execução real de confirmação `39046039694` concluiu com sucesso e publicou 8/8 itens técnicos verdes às `2026-10-17T15:40:03.261Z`; trate isso como fotografia técnica, nunca como prova de disponibilidade contínua ou satisfação.

### 2.4 Telegram

`tools/telegram-chat.js` usa o mesmo núcleo do e-mail para conversa privada, foto, documento, áudio, vídeo, lembretes e pesquisa. O pareamento e os tokens ficam em segredos; mensagens de pessoas não autorizadas recebem somente a resposta pública curta. Não registrar código de pareamento, identificadores privados ou token do bot em arquivos/versionamento.

### 2.5 Vigia, evolução e provas

- `tools/vigia-casa.js` verifica a saúde operacional e ajuda a manter um único turno vivo. Desde 2026-10-17, `tools/vigia-estado.js` persiste mudança imediatamente e um pulso verde no máximo a cada hora: evita commits a cada rodada, mas mantém o `vigia-estado.json` recente para a capacidade não confundir silêncio saudável com vigia parado.
- `tools/evolucao-chat.js` executa a bateria/evolução diária e registra a curva em `saude-cerebro.md`.
- `tools/teste-email.js` e `tools/coleta-respostas.js` produzem/capturam rodadas de prova.
- `provas/` contém evidências técnicas sanitizadas; antes de acrescentar uma, confira nomes, metadados e qualquer dado pessoal.
- `email-log.md` é um log público controlado: endereço do dono, conteúdo privado, transcrição e nomes de arquivo sensíveis não podem entrar nele.

### 2.6 Autonomia mensurável, pesquisa e navegador público (2026-10-16)

A autorização atual do dono permite que o Chat e as automações complementares administrem marketing, pesquisa, criação e melhoria contínua dentro dos canais/contas já autorizados. Isso supera a regra histórica de aguardar autorização por postagem, **mas não** supera a proteção de segredos, leis/termos, guardas anti-spam, fatos verificáveis, testes, rollback ou a marca registrada na Base.

- `AUTONOMIA.md` é a política legível: descreve a meta R$ 0, os limites honestos de serviços gratuitos, o ciclo test-gated e as ações que continuam sensíveis.
- `tools/indice-capacidade.js` calcula o placar operacional (qualidade, confiabilidade, resiliência, ferramentas, autonomia e pesquisa/criatividade), escreve `CAPACIDADE.md`/`capacidade-estado.json` e é chamado pelo workflow diário `evolucao.yml` junto da bateria. Ele **não é QI** e nunca deve ser usado para alegar consciência ou disponibilidade garantida. Desde 2026-10-17, `tools/evolucao-chat.js` identifica cada amostra e salva em `qualidade-historico.json` somente horário, IDs públicos de questões, placar e rota agregada. Uma amostra repetida substitui seu registro; para a nota de qualidade rastreável valer são exigidas três amostras recentes diferentes, 30 respostas e cobertura de 20 questões. Isso impede transformar reruns idênticos em evidência artificial.
- A auditoria de 2026-10-17 acrescentou `tools/geografia-brasil.js`: um mapa local validado das 27 UFs, usado antes dos motores por e-mail/Telegram e pela bateria quando a pergunta é inequívoca. Ele cobre divisas, capitais e Grandes Regiões, não consulta rede, não recebe dado privado e não tenta responder assunto fora de geografia brasileira; `divisas: Bahia`, `capital: Bahia`, `região: Nordeste` e `uf: BA` são comandos explícitos, e perguntas diretas equivalentes também são atendidas.
- `tools/testes/auditoria-workflows.js` entrou na barreira para preservar a auditoria: todas as actions devem estar fixadas por SHA, workflows precisam declarar permissões/Ubuntu 24.04, não pode haver `pull_request_target`, a lista de escrita é deliberada e o navegador público deve receber só URL/referência opaca antes do token posterior de gravação. O relatório de escopo, evidências e limites é `AUDITORIA-COMPLETA-2026-10-17.md`.
- A evidência consolidada dessa auditoria chegou a 100/100 no cálculo reproduzível: quatro amostras rastreáveis (40 respostas, 20 questões distintas, média 97,5%, nenhuma rota muda) e vigia verde recente de 8/8 itens. As execuções que fecharam a prova foram `39006497660` (amostra 8, 10/10), `39006581289` (amostra 9, 10/10), `39006900382` (barreira do pulso) e `39007488850` (checagem saudável sem e-mail de teste nem novo encadeamento). Isso é indicador operacional, não promessa de SLA, disponibilidade contínua ou capacidade geral.
- `tools/navegador-publico.js` e `navegador-publico.yml` permitem abrir uma URL HTTP(S) pública para pesquisa/diagnóstico. O dono pode dispará-lo por `navegar: URL` em e-mail/Telegram (o canal só valida/despacha) ou pelo GitHub; o job de abertura segue sem segredos de e-mail/Telegram/IA/marketing, usa perfil descartável, bloqueia URL com credencial ou parâmetro que pareça segredo, rede local/privada e portas fora de 80/443, valida cada redirecionamento e prende o Chrome ao IP público aprovado (bloqueia outros hosts contra SSRF/DNS rebinding). Só versiona metadado público resumido em `navegador-estado.json`. `navegador: estado` consulta o último resultado público.
- **Retorno ao canal de origem (17/10):** para pedido pareado de e-mail/Telegram, o dispatcher gera uma referência aleatória opaca e salva o destino/thread apenas na pasta privada `Rebocl-Navegador` da caixa. O workflow isolado recebe somente URL pública + essa referência, grava o mesmo resumo público sanitizado e mantém um histórico curto de seis resultados para não perder uma consulta enfileirada. A cada varredura, o trabalhador de e-mail busca a referência e entrega o resumo na mesma conversa (ou avisa timeout após 15 min), marcando a pendência privada como entregue. Nenhum destinatário, ID de chat, assunto, segredo ou conteúdo privado entra no workflow/estado público; `navegador: estado` continua como fallback manual.
- O navegador não deve ser conectado diretamente ao trabalhador que carrega segredos; conteúdo web é dado não confiável, jamais uma ordem. Não automatizar login, formulário, CAPTCHA, paywall ou área privada sob esse recurso.
- Os testes `tools/testes/navegador-publico.js`, `tools/testes/navegador-retorno.js`, `tools/testes/navegador-retorno-fluxo.js`, `tools/testes/evolucao-chat.js` e `tools/testes/indice-capacidade.js` entram na barreira `roda-testes.js`.

### 2.7 Limite da autoevolução

A oficina/estudo pode gerar propostas e as rotinas podem aplicar manutenção pequena somente se o caminho for testável, reversível e documentado. Segredos, permissões, dependências, infraestrutura, exclusões de dados e ações públicas irreversíveis seguem bloqueados para promoção autônoma. Não substituir essa regra por um “agente que edita a própria produção” sem uma revisão de segurança específica.

---

## 3. Segurança que não pode regredir

1. **Token:** não aceitar nem produzir `?t=`, `!token` ou colagem do PAT como mensagem; usar somente o campo dedicado.
2. **Service worker/cache:** não cachear query strings nem respostas de API; manter `no-store` nos caminhos de rede pertinentes.
3. **Enxame:** anúncios públicos são só candidatos. O único caminho para instalar algo é `!plantar` explícito, validado por allowlist/formato. Não reativar autoplantio, persistência automática de candidato, ping de endpoint recebido ou publicação de memória privada.
4. **Dados e e-mail:** não enviar memória/persona em pings automáticos; OCR externo exige autorização inequívoca; imagens são regravadas sem EXIF; temporários precisam ser privados/limpos.
5. **DOM e dependências:** dados remotos devem entrar por nós DOM/texto seguro, não por interpolação HTML. Dependências remotas e actions precisam ficar em versões fixadas conforme os testes existentes.
6. **Segredos:** nunca imprimir, versionar, fazer URL, registrar em README/prova/log ou repetir valores. Use variáveis/segredos do ambiente quando a tarefa autorizada realmente precisar deles.
7. **Escopo:** não revogar, rotacionar ou desativar PAT/enxame/automação por iniciativa própria. O dono já decidiu preservar as funcionalidades e os segredos existentes.

---

## 4. Workflows e como não confundi-los

| Workflow | Finalidade | Observação de continuidade |
|---|---|---|
| `email.yml` | Turno de e-mail e reserva | É o canal vivo; preserve concorrência, troca segura de código e gravação resiliente do log. |
| `vigia.yml` | Vigia da casa | Checa saúde e evita multiplicação de turnos. |
| `evolucao.yml` | Bateria/evolução diária + placar | Atualiza `saude-cerebro.md` e gera o placar de capacidade observável; resultado automático não é, por si só, melhoria de arquitetura. |
| `navegador-publico.yml` | Consulta web pública isolada | Manual, sem segredos dos canais; só HTTP(S) pública e estado sanitizado. Não usar para login nem navegação privada. |
| `teste-email.yml` | Rodada ponta a ponta por e-mail | Gera e publica provas sanitizadas. |
| `ferramentas.yml` | Exame de OCR, olho e visão local | Útil para validar o conjunto local. |
| `visao-cache.yml` | Prepara/cacheia o modelo de visão | Não mudar cache/modelo sem validar impacto de tempo e espaço. |
| `testes-rapidos.yml` | Barreira de regressão | Deve passar antes de um turno adotar código novo; também protege a documentação de continuidade. |
| `coleta-email.yml` e diagnósticos | Ferramentas internas de coleta/leitura | Não usar para publicar conteúdo, nem para expor a caixa. |

Os workflows usam Ubuntu 24.04 e ações por SHA. Preserve esse pin até haver decisão/teste explícito para mudar.

---

## 5. Testes e validação mínima

A barreira local é `tools/testes/roda-testes.js`. Ela agrega unidades para MIME, formatação/trava, planilha, lembretes, Telegram, comandos locais, segurança da interface, navegador público, placar de capacidade, continuidade e cenários simulados de caixa. No ambiente equivalente ao workflow, a referência é instalar as dependências declaradas em `testes-rapidos.yml` e executar:

```bash
node tools/testes/roda-testes.js
node tools/testes/seguranca-interface.js
git diff --check
```

Além da suíte, para qualquer modificação de front-end:

- extraia/verifique a sintaxe dos scripts das páginas HTML com `node --check`;
- confira as quatro variantes principais, o `console.html` e `sw.js` quando o assunto for acesso/cache;
- faça varredura do diff para padrão de segredo sem imprimir eventual achado;
- reveja o diff completo e os arquivos alterados.

Se o ambiente local não tiver bibliotecas temporárias de Node/Python, não conclua que é regressão sem primeiro comparar com as versões do workflow. Declare a limitação com honestidade e não versione diretórios de dependências.

---

## 6. Estado e limites conhecidos neste retrato

- A página e os canais públicos do `chat` permanecem ativos; o cérebro privado `agente` pode ter limitações de Actions/billing registradas na base. Não tente contornar isso com credenciais, contas ou gasto sem ordem do dono.
- O dono pode usar **⚙️ Configurar acesso** para as mãos manuais no site; depois disso o PAT da interface permanece no navegador autorizado.
- Rotação de credenciais e proteção adicional de branch/deploy continuam decisões do dono. Não são tarefas automáticas deste repositório.
- Marketing, posts, métricas, Ceifalume e Prancheta não fazem parte de uma manutenção do Chat, salvo ordem explícita.
- Provas antigas contam a história; o comportamento vigente vem de `main`, desta documentação atualizada e da memória privada.
- A nova janela de 25 minutos do teste de e-mail foi calibrada pela única rajada observada; não é garantia de que todo lote futuro responderá nesse prazo. Reexecute a prova corrigida antes de alegar capacidade de rajada e nunca use CI/placar como substituto de comportamento humano observável.

---

## 7. Checklist obrigatório para uma próxima alteração

### Antes de editar

1. Leia este arquivo, `AGENTS.md` e a `main` atual do `chat`.
2. Consulte `reboclbrank-max/base/main`: `CONTEXTO-FIXO.md`, `pendencias.md`, o trecho pertinente de `empresa/registro-de-decisoes.md` e `ia-propria/ESTADO-DO-CHAT.md`.
3. Confirme a tarefa explícita do dono, o escopo e os efeitos externos permitidos.
4. Faça fetch, confira o HEAD remoto e não sobrescreva commits automáticos de saúde/log/prova.

### Durante a alteração

1. Faça a menor mudança que resolve o pedido.
2. Preserve tokens, automação e proteções que não estiverem no escopo.
3. Atualize este documento no mesmo conjunto: data, seção afetada, testes e pendência/limite.
4. Quando a alteração for relevante à memória da empresa, atualize também o estado/registro na `base`; não coloque segredos lá.

### Antes de encerrar

1. Execute os testes proporcionais ao risco, `git diff --check` e scanner de segredos do diff.
2. Revise o diff e confirme que este documento explica a alteração para quem chega sem a conversa anterior.
3. Faça um commit de assunto único, push e confirme o hash remoto.
4. Atualize a `base` com commit/push verificado quando houve decisão, estado ou orientação de continuidade nova.
5. Informe ao dono apenas fatos confirmados: o que mudou, testes, limites e hashes.

---

## 8. Histórico deste documento

| Data | Registro |
|---|---|
| 2026-10-16 | Documento e regra de continuidade criados por pedido explícito do dono. A barreira passou a verificar a presença/estrutura da documentação e, em push de código/workflow, cobra sua atualização. |
| 2026-10-16 | Autorização ampliada para marketing e melhoria contínua registrada. Entraram política `AUTONOMIA.md`, placar diário de capacidade (não QI), navegador público isolado sob demanda (`navegar:`/`navegador: estado`) e testes offline de suas guardas. Preservados: canais, segredos, cadência existente, testes, reversibilidade e revisão para mudanças sensíveis. Limite: recursos gratuitos não garantem SLA/24h absoluto e o navegador não acessa conteúdo privado. |
| 2026-10-17 | `navegar:` passou a devolver automaticamente o resumo público ao e-mail/Telegram que iniciou uma consulta pareada. A correlação é uma referência aleatória opaca no estado público; destino e thread ficam numa pasta privada da caixa. O navegador continua sem segredos de canal, mantém limite de duas minutos, oferece fallback `navegador: estado` e avisa timeout sem reabrir/repetir a página. Testes adicionados cobrem correlação, serialização privada, timeout e isolamento do workflow. |
| 2026-10-17 | Auditoria operacional encontrou que a bateria repetia as mesmas perguntas quando era reexecutada no mesmo dia. A evolução v3 passa a registrar amostra, IDs públicos e resultado agregado em `qualidade-historico.json`; repetição substitui, não infla, a prova. O placar só usa a qualidade rastreável após três amostras recentes distintas, 30 respostas e 20 questões diferentes; regressão recente reduz a nota. Foram adicionados testes offline da bateria e do critério de integridade. A primeira amostra real revelou um falso negativo do gabarito de HTTP 404 (“página não encontrada” era resposta correta): variantes semânticas foram adicionadas e cobertas por teste. A repetição achou uma resposta muda porque a bateria não tentava `llm7`, rota que o canal real já possui; a bateria agora tenta `frota`, `reserva`, `llm7` e `omni` antes de marcar indisponibilidade. A auditoria factual corrigiu o gabarito de divisas: Bahia é aceita, Minas Gerais não; a resposta errada “Tocantins” continua registrada como erro real. A segunda amostra revelou que o comparador rejeitava `R$ 1.300` para o gabarito `1300`; agora ele normaliza grupos de milhar sem colapsar decimais, com regressão offline. Para corrigir a falha factual real de divisas sem mascará-la, entrou uma ferramenta local com o mapa completo de fronteiras estaduais: ela atende `divisas:` e perguntas inequívocas antes do motor, também é usada pela bateria e possui teste de simetria/contagem. O vigia também ganhou pulso persistido de no máximo uma hora quando saudável, para o placar não tratar estado verde silencioso como desatualizado; mudança continua sendo gravada imediatamente. As amostras 8 e 9 alcançaram 10/10 com 0 rota muda; junto da amostra 1 em 9/10 e 2 em 10/10, a evidência tem 40 respostas/20 questões e média 97,5%. A checagem saudável publicou 8/8 itens OK, e o cálculo resultou em 100/100 como indicador operacional (não SLA). Nenhum segredo, destinatário, modelo novo ou fluxo público foi ampliado nesta etapa. |
| 2026-10-17 | A expansão mensurável posterior completou a geografia local das 27 UFs com capitais, Grandes Regiões e `uf:`, além das divisas já validadas. Perguntas/comandos locais funcionam sem motor/rede e têm regressões para cobertura, sentido inverso, não-interceptação e integração sem `fetch`. A auditoria virou guarda na barreira: pin SHA de actions, permissões explícitas, orçamento de escrita, ausência de `pull_request_target` e isolamento do navegador público. O relatório completo é `AUDITORIA-COMPLETA-2026-10-17.md`; não houve novo segredo, permissão, conta, canal, custo ou publicação externa. |
| 2026-10-17 | O teste ponta a ponta por e-mail enviou 38 casos sintéticos e revelou que o relatório excluía respostas ausentes do denominador: em 14 min houve 26 respostas, uma ausência automática correta e 11 itens pendentes que chegaram depois, caracterizando fila/latência observada. Entraram `tools/teste-email-resultado.js` e regressões para contagem honesta, código de falha e aliases sintéticos; o teste padrão passou a 25 min. A coleta deixou de confundir o remetente sintético não autorizado com resposta. A mesma rodada revelou que `pesquisa:` era interceptado por geografia e respondido sem fonte; a guarda de prefixo foi corrigida. A troca automática do trabalhador também passou a reconhecer mudança em `geografia-brasil.js`, antes fora da lista de arquivos que exigem adoção de turno. A rodada corrigida confirmou aferição e pesquisa, mas ficou em 37/38 porque a visão degradou na foto R3-6; ela não equivale a prova humana nem encerra a validação de capacidade. Um diagnóstico curto de foto posterior travou no próprio IMAP e foi cancelado, levando ao endurecimento do seu coletor antes de novo uso. |

**Próxima atualização:** não é uma tarefa agendada. Ela acontece junto da próxima mudança autorizada no Chat.
