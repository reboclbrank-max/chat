# Auditoria completa do Chat — 2026-10-17

## Escopo, método e limite da conclusão

Auditoria autorizada para código, rotas, workflows, recuperação, segurança, uso real e qualidade. A análise combinou leitura estática, testes offline, execuções oficiais do GitHub Actions e estados públicos sanitizados. Nenhum valor de segredo, mensagem, destinatário, ID privado, anexo ou conteúdo de caixa foi lido ou incluído.

Esta é uma auditoria de engenharia baseada no repositório e nas provas disponíveis; não é teste de invasão, certificação externa nem garantia de disponibilidade de serviços gratuitos.

## Retrato verificado

| Área | Evidência observada | Conclusão |
|---|---|---|
| Qualidade | 4 amostras rastreáveis; 40 respostas; 20 questões distintas; média 97,5%; 0 rota muda | Critério de qualidade rastreável satisfeito. A falha histórica 9/10 permanece registrada. |
| Saúde operacional | Vigia com 8/8 itens verdes em `2026-10-17T05:46:37.227Z`; run `39007488850` success | Confiabilidade observada atual, com pulso público de no máximo uma hora. |
| Barreira | Suíte local de 24 unidades + 8 cenários passou; CI final `39007569602` success | Alterações passam por porta de regressão antes de uso. |
| Workflows | 12 workflows ativos; actions externas fixadas por SHA; runners em Ubuntu 24.04; permissões explícitas | Orçamento de privilégios é verificável e agora tem teste contínuo. |
| Navegador público | Chrome isolado provado no run `39000200086`; apenas URL pública e referência opaca entram antes do push | Sem segredos de e-mail/Telegram/IA/marketing no processo de navegação. |
| Canais | E-mail e Telegram usam o mesmo núcleo, com testes de comandos, origem, anexos e filas | Canais preservados; nenhuma conta, segredo ou destino foi alterado. |

## Código e rotas

### Canal de e-mail e Telegram

- `tools/email-chat.js` concentra comandos locais, respostas por motores, anexos, memória de conversa curta, retorno de navegação e proteções de origem.
- Testes simulam MIME problemático, remetente não autorizado, foto, PDF, três fotos, memória, e-mail devolvido e indisponibilidade de motores. Todos passaram na barreira atual.
- A rota local de geografia é consultada antes de motor/rede apenas quando o pedido é inequivocamente brasileiro; texto comum não é interceptado.
- Limite preservado: provedores gratuitos podem falhar ou variar. O fallback local responde quando há cobertura local, mas não transforma uma rota externa em SLA.

### Página e console

- As quatro variantes de entrada (`index`, `direto`, `ligar`, `limpar`) continuam sob a barreira de segurança da interface, com 44 verificações aprovadas.
- O PAT persistente continua limitado ao armazenamento local do navegador autorizado, por decisão explícita do dono. Não há retorno de `?t=` nem de `!token` como canal de credencial.
- O teste não é substituto para revisão visual em todos os dispositivos; mudanças de front-end seguem exigindo verificação das quatro rotas e do service worker.

### Navegador público

- Entradas do workflow são somente `url` e `referencia`; a referência tem formato opaco e não carrega destinatário/thread.
- O Chrome roda antes da etapa que recebe o token de gravação. O browser workflow não referencia `secrets.*`.
- Mantidos bloqueios de rede privada, portas incomuns, credencial na URL, redirecionamentos não aprovados e conteúdo web como dado não confiável.

## Workflows, confiabilidade e recuperação

- Há uma única cadeia de atendimento de e-mail viva, com a próxima rodada pendente como reserva; isso é o desenho de continuidade, não duplicidade.
- O vigia observa página, site, publicação, turno, bateria, itch e caixa. Mudanças de saúde gravam imediatamente; saúde estável deixa pulso no máximo horário. Isso resolveu o falso sinal de vigia “desatualizado” quando a casa apenas permanecia verde.
- `evolucao.yml` gera a curva de qualidade e o placar; amostras repetidas substituem, não somam. A amostra 8 substituiu 9/10 por 10/10 depois da correção de produto; a amostra 9 completou a cobertura distinta.
- Ações que precisam escrever conteúdo ou disparar recuperação estão enumeradas no teste de auditoria. Workflows de leitura ficam em `contents: read`; não há `pull_request_target`.

## Segurança e privacidade

1. Todas as actions externas encontradas estão fixadas por SHA completo, não por tag móvel.
2. Todos os workflows revisados declaram permissões e usam `ubuntu-24.04` fixado.
3. O novo teste `tools/testes/auditoria-workflows.js` bloqueia regressão de pin, permissões, `pull_request_target`, orçamento de escrita e isolamento do navegador.
4. Scanner estreito do diff, revisão de arquivos e `git diff --check` são executados antes de publicação. Nenhum achado é exibido caso o scanner encontre padrão sensível.
5. Não foram concedidas permissões, dependências, serviços pagos, canais ou destinos novos.

## Qualidade e correções comprovadas

- A cobertura de rotas da bateria passou a incluir `frota`, `reserva`, `llm7` e `omni`, o mesmo conjunto real do canal.
- O comparador de valores numéricos aceita grupos de milhar sem unir decimais indevidamente.
- A geografia de divisas não é exceção de gabarito: o mapa completo de 27 UFs é validado por simetria. Bahia permanece a única resposta aceita para o máximo de oito divisas estaduais.
- A evidência de 100/100 publicada em `CAPACIDADE.md` depende de vigia recente e qualidade rastreável; não houve mudança de peso, arredondamento ou denominador.

## Expansão mensurável iniciada após a auditoria

A mesma ferramenta de geografia foi ampliada com dados estáticos conferidos na página de divisão territorial do [IBGE Educa](https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html):

- **27/27 UFs** têm nome, sigla, capital, Grande Região e divisas locais validadas;
- comandos e perguntas naturais agora respondem `capital: Bahia`, `Qual a capital de Sergipe?`, `região: Nordeste`, `Em que região fica Mato Grosso do Sul?` e `uf: BA`;
- consultas seguem sem rede e sem motor; a integração do canal é exercitada com `fetch` deliberadamente indisponível;
- a unidade de geografia passou de 4 para 6 verificações e a de comandos passou a 21/21, cobrindo a capacidade real do e-mail/Telegram.

A expansão é reversível: está isolada em `tools/geografia-brasil.js`, sua integração já existente em `ferramenta()` e testes/documentação correspondentes. Não altera dados privados, filas, contas, custos ou permissões.

## Gargalos e próximos sinais úteis

| Situação | Tratamento atual | Próximo sinal honesto |
|---|---|---|
| Oscilação de modelos públicos | Quatro rotas, filtros de resposta inútil e fallback local quando aplicável | Registrar falha de rota em nova amostra distinta; não aumentar nota por rerun. |
| Entrega final de navegação pareada | Implementada e testada/Chrome provado | Observar uma consulta normal originada no canal, sem disparar mensagem artificial ao dono. |
| Serviços gratuitos | Vigia, cadeia, reserva e recuperação | Não prometer 24h absoluto; tratar alerta real antes de aumentar cadência. |
| Dados factuais locais | Conjunto fechado, validado e sem rede | Expandir somente domínios completos, com fonte, testes estruturais e não-interceptação. |

## Conclusão

Não foi identificado defeito crítico ativo no escopo auditado. Foram encontrados e tratados dois riscos operacionais concretos: vigia saudável que parecia antigo por falta de pulso persistido e ausência de uma guarda automática para pin/privilégio/isolation de workflows. A expansão seguinte começou por uma capacidade factual completa, local e verificável, preservando todos os limites aprovados.
