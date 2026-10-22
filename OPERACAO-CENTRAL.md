# Central segura do Chat

**Estado:** etapas 1, 2A, 2B e 3A ativas em 21/10/2026.
**Escolha do dono:** Central segura em etapas (`gradual_seguro`).
**Objetivo:** transferir para o Chat, progressivamente, a coordenação de tarefas hoje assistidas externamente, sem transformar a página em executor genérico nem ampliar segredo, custo, publicação ou promoção automática.

Este contrato complementa `AGENTS.md`, `AUTONOMIA.md`, `GOVERNANCA-CHAT-PRIMEIRO.md` e `CONTINUIDADE.md`. Em conflito, prevalece a guarda mais restritiva.

## 1. Mapa fechado e entradas autorizadas

A Central torna descobrível e coerente o que o Chat já pode fazer, em vez de aceitar uma ordem ampla e fingir que a executou.

| Entrada | Canal | Resultado autorizado |
|---|---|---|
| `operar:` / `central:` | Página, e-mail e Telegram | Mostra o mapa fechado de capacidades, limites e próximo estágio, sem rede, armazenamento ou criação de tarefa. |
| `operar: status` | Página, e-mail e Telegram | Encaminha honestamente ao `status:` existente nos canais privados; não inventa estado dinâmico na página. |
| `operar: pesquisa` | Página, e-mail e Telegram | Explica o fluxo de pesquisa pública já existente, separado de conteúdo privado. |
| `operar: navegador` | Página, e-mail e Telegram | Explica o fluxo `navegar:` isolado: página pública, sem login, formulário ou área privada. |
| `operar: marketing` | Página, e-mail e Telegram | Declara que o marketing autorizado continua no `site`, sob fatos, cadência e anti-spam; não publica conteúdo adicional. |
| `operar: testes` | Página, e-mail e Telegram | Explica a barreira fixa já aprovada. |
| `operar: preparo` | Página, e-mail e Telegram | Explica a auditoria interna fixa; nos canais não despacha ação. |
| `operar: dossie` | Página, e-mail e Telegram | Explica a receita 2B e seus limites; e-mail/Telegram não a disparam. |
| `operar: reforco` | Página, e-mail e Telegram | Explica a única receita 3A de patch literal; e-mail/Telegram não a disparam. |
| `!testarchat` | Página com acesso protegido já configurado | Pede exclusivamente `testes-rapidos.yml` do `chat`, em `main`. Não recebe argumento nem escolhe workflow/ref. |
| `!prepararchat` | Página com acesso protegido já configurado | Pede exclusivamente `preparo-controlado.yml` em `main`. Executa cinco guardas fixas e deixa resumo sanitizado; não cria branch, código, commit, push, merge ou promoção. |
| `!dossiechat` | Página com acesso protegido já configurado | Pede exclusivamente `dossie-preparo-controlado.yml` em `main`. Só depois das cinco guardas pode criar **um ramo novo** contendo apenas `propostas/central/dossie-preparo-controlado.md`; não altera código, `main`, PR, merge ou promoção. |
| `!reforcardossie` | Página com acesso protegido já configurado | Pede exclusivamente `reforco-dossie-controlado.yml` em `main`. Só depois das guardas fixas pode criar **um ramo novo** com exatamente o patch literal de workflow/teste do dossiê e um relatório sanitizado; não recebe tarefa, caminho, patch, comando ou texto livre. |

O chip **⚙️ operar** apenas abre `operar:` e é interceptado localmente antes de rascunho, Issue, motor ou API. Texto livre depois de `operar:` não é plano, código, instrução nem fila; recebe somente a sintaxe fechada.

## 2. Guardas das quatro ações manuais

As quatro pontes são alcançadas apenas pela allowlist local. Todas exigem:

1. comando exato, sem argumento;
2. modo somente-local desligado por escolha explícita;
3. acesso protegido previamente configurado no navegador do dono;
4. ausência de outro pedido da Central em curso nesta aba;
5. destino, workflow e ref literais no código (`reboclbrank-max/chat`, workflow fixo e `main`).

`!testarchat` e `!prepararchat` têm intervalo local mínimo de cinco minutos. `!dossiechat` e `!reforcardossie` têm freio local em memória de 24 horas; ele reduz clique repetido nesta aba, mas não é persistência nem alegação de bloqueio remoto. Cada workflow serializa a própria família. A cadência não autoriza contornar revisão, nem se transforma em cron, fila persistente ou retry cego.

Nenhuma ponte aceita URL, repositório, caminho, nome de workflow, shell, texto de tarefa, patch, comando ou ref fornecidos pela pessoa. Uma resposta de fila confirma somente o pedido: não afirma que a barreira/preparo concluiu, que o ramo foi criado, que o patch é correto ou que algum serviço externo está disponível.

## 3. Fronteiras preservadas

Esta etapa não cria nem libera:

- executor arbitrário, terminal remoto, avaliação de código recebido pela conversa ou dispatcher genérico;
- commit, merge ou promoção cega para `main`; a única escrita remota possível é o push não forçado de um ramo novo, por receita literal e depois das guardas;
- leitura, cópia, envio ou exibição de segredo, credencial, mensagem, anexo, endereço ou dado privado;
- Gmail novo, conta de rede, identidade pública, login, formulário, CAPTCHA ou área privada;
- backup externo, sincronização, conta/nuvem, gasto, cartão, serviço pago, permissão nova ou infraestrutura nova;
- postagem adicional, tráfego fabricado, bots, spam, métricas inventadas ou automação incompatível com termos.

A Central continua sob R$0. O Workspace local permanece local-first e não vira fila remota de operações.

## 4. Etapa 2A — preparo automatizado, mas com rumo

`!prepararchat` chama somente `preparo-controlado.yml@main`. Ele executa o catálogo interno e imutável de cinco contratos — Central, portas locais, PWA, continuidade e guardas dos workflows — e produz somente `pronto_para_revisao` ou `bloqueado` em resumo sanitizado. Não lê texto livre, não escolhe tarefa e não cria branch, arquivo, commit, push, merge ou promoção.

Se uma guarda falha, a receita para e bloqueia revisão. Se todas passam, libera somente a consideração humana de uma receita própria. Não existe cron novo, fila persistente, retry cego ou consumo contínuo de Actions.

## 5. Etapa 2B — dossiê revisável de escopo único

Esta é a primeira receita de escrita da Central, desenhada para cumprir a preparação reversível sem se tornar um editor de repositório.

1. `!dossiechat` despacha exclusivamente `dossie-preparo-controlado.yml@main`, sem input. O workflow aceita somente `refs/heads/main`, confirma que o checkout corresponde ao SHA do evento e que `origin` é literalmente `github.com/reboclbrank-max/chat` antes de qualquer escrita.
2. Ele executa `tools/preparo-controlado.js` primeiro. Se uma das cinco guardas falha, não executa a ferramenta de dossiê, não cria ramo e não faz push.
3. `tools/dossie-preparo-controlado.js` aceita somente SHA hexadecimal de 40 posições, identificador numérico de execução e a ref literal. Ele escreve somente `propostas/central/dossie-preparo-controlado.md`, com texto estático e metadados públicos mínimos de origem; não lê argumento, conversa, URL, arquivo arbitrário, segredo, anexo ou resultado bruto. Antes da criação, valida por `lstat` cada diretório literal (`propostas` e `central`), recusa link simbólico ou alvo já ocupado e cria os componentes ausentes um a um; a escrita usa reserva exclusiva `wx`, portanto destino incompatível ou simbólico falha fechado sem sobrescrita, e um alvo que surja entre a verificação e a escrita também é recusado.
4. Somente então o workflow abre um ramo novo com prefixo literal `central/dossie-preparo-<execução>`, adiciona exclusivamente aquele caminho e faz push não forçado de `HEAD` para esse ramo. Não abre PR, não faz merge, não toca `main`, tag, release, código, dependência, configuração ou infraestrutura.
5. O resultado do workflow declara ramo, conteúdo, revisão e rollback em resumo sanitizado. A pessoa compara o ramo com `main` e decide manualmente se há uma receita futura distinta a desenhar. O dossiê não é especificação executável e nunca equivale a autorização para escrever código.

O workflow declara `contents: write` por ser a permissão mínima disponível para criar o ramo remoto. Essa exceção está na allowlist explícita de `tools/testes/auditoria-workflows.js`; não recebe `actions: write`, entradas de dispatch, segredos explícitos, ação de pull request ou qualquer ação externa além do checkout/setup Node fixados por SHA e do push literal. A ferramenta de dossiê não lê credencial e seu conteúdo não contém segredo.

### Rollback específico da 2B

- Remover `!dossiechat`, `operar: dossie`, `dossie-preparo-controlado.yml`, a ferramenta, testes, allowlist de escrita e documentação neste repositório, com nova versão de casca PWA.
- Apagar manualmente cada ramo `central/dossie-preparo-<execução>` que tenha sido criado após a revisão. A receita não apaga ramo automaticamente, para não ocultar evidência ou transformar rollback em nova automação cega.
- Como `main` não é alterada e o ramo contém somente o dossiê, não há migração, dado produtivo, conta, segredo, dependência ou infraestrutura para reverter.

## 6. Etapa 3A — primeira receita fechada de patch de código

A 3A resolve uma lacuna concreta e estreita: o workflow 2B já adicionava seu único arquivo, mas a proposta reforça que o índice staged seja conferido como **exatamente** aquele caminho antes do commit. Isso é uma mudança de código de segurança, não um mecanismo para escolher mudanças futuras.

1. `!reforcardossie` despacha exclusivamente `reforco-dossie-controlado.yml@main`, sem input. O workflow valida `refs/heads/main`, SHA do checkout e `origin` literal antes de qualquer patch ou escrita remota.
2. O catálogo é deliberadamente uma entrada congelada: `reforco_dossie_escopo_v1`, limitada ao repositório `reboclbrank-max/chat`, ref `refs/heads/main`, prefixo `central/reforco-dossie-` e três caminhos literais: `.github/workflows/dossie-preparo-controlado.yml`, `tools/testes/dossie-preparo-controlado.js` e `propostas/central/reforco-dossie-controlado.md`.
3. `tools/reforco-dossie-controlado.js` não recebe argumento, conversa, caminho, URL, patch, shell ou Git. Ele aceita somente o contexto GitHub fechado, valida com `lstat` os diretórios e os dois arquivos-alvo literais como entradas reais sem link simbólico, exige uma ocorrência exata de cada âncora e só então prepara os dois edits literais. O diretório do relatório também precisa ser literal, o relatório não pode existir e sua criação é exclusiva (`wx`) antes dos dois edits; base divergente, link simbólico, destino ocupado, contexto inválido ou âncora ausente falham fechados antes de qualquer escrita remota.
4. O workflow roda o preflight 2A e o contrato próprio da receita antes do patch; depois roda o contrato do dossiê já alterado, o preflight novamente e `git diff --check`. Falha em qualquer ponto impede a etapa de ramo e push.
5. Somente depois das validações ele cria `central/reforco-dossie-<execução>`, adiciona exatamente os três caminhos e compara a lista staged com a allowlist literal antes do commit/push não forçado. Não abre PR, merge, tag ou release e nunca toca `main`.
6. O relatório contém apenas SHA, execução, ref, objetivo, escopo, revisão e rollback. Ele não recebe ou reproduz segredo, token, conteúdo de conversa, anexo, URL privada ou saída bruta.
7. A revisão humana compara o ramo com `main`, confere os três caminhos e decide qualquer merge fora desta receita. Sucesso técnico não autoriza promoção.
8. O rollback é apagar manualmente o ramo `central/reforco-dossie-<execução>` e, se a capacidade for retirada, remover a quarta ponte, o workflow, ferramenta, teste, allowlist/documentação e renovar a casca PWA. Não há migração, dado produtivo, conta, dependência, permissão nova, infraestrutura ou custo para desfazer.

`contents: write` continua a permissão mínima para publicar o ramo isolado e aparece explicitamente na auditoria. A ferramenta de patch não acessa credencial; a separação entre segredo/conversa e o checkout público é total. Não houve dispatch real, ramo remoto, canal real, segredo, conta, publicação nem tráfego fabricado na validação deste corte.

## 7. Próximo estágio continua bloqueado

Fora da única receita 3A, toda nova alteração de código continua bloqueada até corte próprio que entregue e teste, no mínimo:

1. catálogo pequeno de receitas/tipos de tarefa, sem prompt ou comando arbitrário;
2. allowlist explícita de repositório e caminho;
3. branch ou artefato reversível, nunca commit cego em `main`;
4. validação proporcional, resultado sanitizado, registro de rollback e revisão antes de promoção;
5. separação total de segredos e de qualquer conteúdo de conversa;
6. bloqueio explícito para permissões, dependências, infraestrutura, exclusão, conta, gasto e ação pública irreversível.

Mesmo depois de um corte futuro, autorização ampla do dono não substitui configuração operacional concreta para contas, destino, identidade, segredo, provedor ou publicação.

## 8. Auditoria de paridade com agente (21/10/2026)

A pergunta “o Chat já faz tudo que o agente faz?” continua com resposta **não**, de forma deliberada: a Central coordena capacidades configuradas e fechadas; não recebe a camada geral de arquivos, repositórios, shell, ferramentas ou credenciais de um ambiente de agente.

- **Exercitado de forma controlada:** as simulações offline verificam a quarta ponte literal, o catálogo de uma entrada, a recusa de argumento, o patch em raiz temporária, a lista staged e o workflow. Isso não é dispatch real nem prova de ramo remoto.
- **O que o Chat pode fazer agora dentro do produto:** responder comandos locais, operar o Workspace local, atender canais configurados sob suas guardas, orientar pesquisa/navegador público isolado, pedir a barreira fixa, pedir a pré-verificação fixa, pedir o dossiê reversível e pedir o reforço 3A quando houver acesso configurado.
- **O que continua fora:** abrir/alterar arquivos arbitrários, executar terminal ou código recebido, escolher URL/repositório/workflow/ref, criar patch livre, revisar/promover `main`, usar ferramentas externas gerais, acessar segredo/conta/identidade, criar conta, backup externo, gasto, permissão ou publicação irreversível.
- **Limite da prova:** não houve dispatch real de `!testarchat`, `!prepararchat`, `!dossiechat` ou `!reforcardossie`, e-mail/Telegram real, conversa, segredo, postagem, conta ou tráfego externo fabricado nesta implementação. Simulação verifica guardas e formato; não afirma que execução externa concluiria, que ramo remoto existiria ou que há qualidade, entrega, uso, disponibilidade ou satisfação.

## 9. Alternativas recusadas

| Alternativa | Motivo da recusa |
|---|---|
| Botão ou comando que execute qualquer texto | Transformaria conversa em shell/dispatcher e permitiria mudança não auditável. |
| Despachar workflow/ref informados pela pessoa | Ampliaria a superfície de execução e permitiria contornar revisão. |
| Gerar código, diff livre ou patch a partir da conversa | Misturaria conteúdo não confiável à escrita com `contents: write`. |
| Transformar o catálogo 3A em executor de receitas genéricas | Permitiria ampliar alvo/escopo sem novo corte, revisão e testes próprios. |
| Commit automático em `main` depois de teste | Teste não é revisão; êxito técnico não autoriza promoção irreversível. |
| Abrir PR automaticamente | Uma PR é ação remota adicional e poderia aparentar aprovação; a revisão começa apenas pelo ramo/artefato. |
| Cron ou receita que escolha sozinha código/repositório | Repetiria Actions sem objetivo verificável e transformaria observação em automação sem rumo. |
| Branch/arquivo criado pelo preflight 2A | A 2A só mede guardas; escrever ali confundiria diagnóstico com mudança. |
| Gravar tarefas livres no Workspace ou GitHub como “fila” | Criaria persistência/privacidade e falsa promessa de atendimento sem executor seguro. |
| Usar Gmail, criar contas ou backup externo como atalho | Não há configuração concreta de conta, destino, retenção ou reversão; essas ações seguem bloqueadas. |

## 10. Validação exigida deste corte

A receita 3A só é aceitável se a revisão local verificar, no mínimo: sintaxe dos scripts novos/alterados e das quatro rotas; contratos da Central, preparo, dossiê, reforço, comandos/PWA/continuidade e auditoria de workflows; execução em raiz temporária com base incompatível bloqueada; auditoria estática dos dois workflows; `git diff --check`; scanner de adições sem credencial; e revisão do diff completo. Para front-end, o browser controlado permanece necessário antes de alegar integração visual. Nenhum resultado de CI, número, simulador ou placar substitui resultado real, revisão humana ou a confirmação do ramo remoto quando houver dispatch autorizado.
