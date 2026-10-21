# Central segura do Chat

**Estado:** etapa 1 ativa em 21/10/2026.
**Escolha do dono:** Central segura em etapas (`gradual_seguro`).
**Objetivo:** transferir para o Chat, progressivamente, a coordenação das tarefas que hoje dependem de apoio externo, sem transformar a página em executor genérico nem ampliar segredo, custo ou poder de publicação.

Este contrato complementa `AGENTS.md`, `AUTONOMIA.md`, `GOVERNANCA-CHAT-PRIMEIRO.md` e `CONTINUIDADE.md`. Em conflito, prevalecem as guardas mais restritivas.

## 1. O que a etapa 1 entrega

A Central torna descobrível e coerente o que o Chat já pode fazer, em vez de aceitar uma ordem ampla e fingir que ela foi executada.

| Entrada | Canal | Resultado desta etapa |
|---|---|---|
| `operar:` / `central:` | Página, e-mail e Telegram | Mostra o mapa fechado de capacidades, limites e próximo estágio, sem rede, armazenamento ou criação de tarefa. |
| `operar: status` | Página, e-mail e Telegram | Encaminha de forma honesta ao comando existente `status:` nos canais privados; não inventa estado dinâmico na página. |
| `operar: pesquisa` | Página, e-mail e Telegram | Explica o uso do fluxo de pesquisa pública já existente, separado de conteúdo privado. |
| `operar: navegador` | Página, e-mail e Telegram | Explica o fluxo `navegar:` já isolado: página pública, sem login, formulário ou área privada. |
| `operar: marketing` | Página, e-mail e Telegram | Declara que o marketing autorizado continua no `site`, sob fatos, cadência e anti-spam; não publica conteúdo adicional. |
| `operar: testes` | Página, e-mail e Telegram | Explica a única ação de teste manual desta etapa. |
| `!testarchat` | Página com acesso protegido já configurado | Pede exclusivamente o workflow existente `testes-rapidos.yml` do `chat`, em `main`. Não recebe argumento, não escolhe outro workflow/ref e não altera código, segredo ou branch principal. |

O chip **⚙️ operar** apenas abre `operar:` e é interceptado localmente antes de rascunho, Issue, motor ou API. O texto livre depois de `operar:` não é tratado como plano, código ou instrução; ele recebe somente a sintaxe fechada.

## 2. Guarda da única ação manual

`!testarchat` é uma ponte estreita para a barreira que já existia. Ela só é alcançada pela allowlist local e exige simultaneamente:

1. comando exato, sem argumento;
2. modo somente-local desligado por escolha explícita;
3. acesso protegido previamente configurado no navegador do dono;
4. ausência de outro pedido em curso nesta aba;
5. intervalo local mínimo de cinco minutos desde o último pedido nesta aba.

O destino, o workflow e a ref são literais no código. A ação não aceita URL, repositório, nome de workflow, shell, texto de tarefa ou ref fornecidos pela pessoa. Uma resposta de fila é apenas confirmação de pedido: não afirma que a barreira concluiu, que o código é correto, que houve publicação nem que algum serviço externo está disponível.

## 3. Fronteiras preservadas

Esta etapa não cria nem libera:

- executor arbitrário, terminal remoto, avaliação de código recebido pela conversa ou dispatcher genérico;
- commit, push, merge ou promoção cega para `main`;
- leitura, cópia, envio ou exibição de segredo, credencial, mensagem, anexo, endereço ou dado privado;
- Gmail novo, conta de rede, identidade pública, login, formulário, CAPTCHA ou área privada;
- backup externo, sincronização, conta/nuvem, gasto, cartão, serviço pago, permissão nova ou infraestrutura nova;
- postagem adicional, tráfego fabricado, bots, spam, métricas inventadas ou automação incompatível com termos.

A Central continua sob R$0. O Workspace local permanece local-first e não vira fila remota de operações.

## 4. Etapas seguintes — ainda não implementadas

A próxima frente permitida é uma **preparação limitada de mudança de repositório**, e não uma promoção automática. Ela só pode entrar depois de um corte próprio que entregue e teste, no mínimo:

1. catálogo pequeno de receitas/tipos de tarefa, sem prompt ou comando arbitrário;
2. allowlist explícita de repositório e caminho;
3. criação de branch ou artefato reversível, nunca commit cego em `main`;
4. validação proporcional, resultado sanitizado, registro de rollback e revisão antes de promoção;
5. separação total de segredos e de qualquer conteúdo de conversa;
6. bloqueio explícito para permissões, dependências, infraestrutura, exclusão, conta, gasto e ação pública irreversível.

Mesmo depois desse corte, autorização ampla do dono não substitui configuração operacional concreta para contas, destino, identidade, segredo, provedor ou publicação.

## 4.1 Auditoria de paridade com agente (21/10/2026)

A pergunta “o Chat já faz tudo que o agente faz?” foi testada contra `main` em `chat@198b0c9e02d5cedaa08bee7effc5e9646f054fec`. A resposta é **não**, de forma deliberada: a Central coordena capacidades configuradas e fechadas; ela não recebe a camada geral de arquivos, repositórios, shell, ferramentas ou credenciais de um ambiente de agente.

- **O que foi exercitado de forma controlada:** o corredor integral fechou 83/83 com IMAP/SMTP/motores simulados, OCR/PDF locais e sem canal real; o browser isolado passou nas quatro rotas, desktop e móvel, com perfil/IndexedDB temporários e rede externa bloqueada. Uma fixture de UI enviou `operar:` pela página real e confirmou a interceptação local. Outra fixture chamou a ponte com API simulada: aliases retornaram o mapa, argumento/modo somente-local/acesso ausente bloquearam antes da API, e a única forma válida formou exclusivamente o POST literal para `chat/testes-rapidos.yml` em `main`, com repetição bloqueada.
- **O que o Chat já pode fazer dentro do produto:** responder comandos locais, operar o Workspace local, atender os canais configurados sob suas guardas, orientar pesquisa/navegador público isolado e pedir a única barreira fixa quando houver acesso configurado. Isso não transforma resultado técnico em execução remota geral, entrega, uso, disponibilidade ou satisfação.
- **O que continua fora:** abrir/alterar arquivos arbitrários, executar terminal ou código recebido, escolher URL/repositório/workflow/ref, criar branch/commit/push/merge, revisar/promover `main`, usar ferramentas externas gerais, acessar segredo/conta/identidade, criar conta, backup externo, gasto, permissão ou publicação irreversível. A página também não acessa o workspace nem as ferramentas internas de quem a auxilia.
- **Limite da prova:** não houve dispatch real de `!testarchat`, e-mail/Telegram real, conversa, segredo, postagem, conta ou tráfego externo fabricado. A simulação verifica guardas e formato, não afirma que uma execução externa concluiria nem substitui revisão humana. A próxima etapa permanece a do item 4, sem salto de escopo.

## 5. Alternativas recusadas nesta etapa

| Alternativa | Motivo da recusa |
|---|---|
| Botão ou comando que execute qualquer texto | Transformaria conversa em shell/dispatcher e permitiria mudança não auditável. |
| Despachar workflow/ref informados pelo usuário | Ampliaria a superfície de execução e permitiria contornar revisão. |
| Commit automático em `main` depois de teste | Teste não é revisão, e êxito técnico não autoriza promoção irreversível. |
| Gravar tarefas livres no Workspace ou GitHub como “fila” | Criaria persistência/privacidade e falsa promessa de atendimento sem executor seguro. |
| Usar Gmail, criar contas ou backup externo como atalho | Não há configuração concreta de conta, destino, retenção ou reversão; essas ações seguem bloqueadas. |

## 6. Rollback

O rollback desta etapa é estrito: remover a ponte `!testarchat`, o roteamento `operar:`, o chip, os testes e esta documentação; avançar a versão da casca PWA em uma publicação posterior. Não há migração, banco, fila persistente, segredo, conta ou alteração de dados remotos para desfazer.
