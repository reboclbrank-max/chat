# Auditoria completa do Chat — 2026-10-17

## Escopo, método e limite da conclusão

Auditoria autorizada para código, rotas, workflows, recuperação, segurança, uso real e qualidade. A análise combinou leitura estática, testes offline, execuções oficiais do GitHub Actions e estados públicos sanitizados. Nenhum valor de segredo, mensagem, destinatário, ID privado, anexo ou conteúdo de caixa foi lido ou incluído.

Esta é uma auditoria de engenharia baseada no repositório e nas provas disponíveis; não é teste de invasão, certificação externa nem garantia de disponibilidade de serviços gratuitos.

## Retrato verificado

| Área | Evidência observada | Conclusão |
|---|---|---|
| Qualidade | 4 amostras rastreáveis; 40 respostas; 20 questões distintas; média 97,5%; 0 rota muda | Cobertura interna de regressão; não mede satisfação nem capacidade geral. A falha histórica 9/10 permanece registrada. |
| Saúde operacional | Vigia com 8/8 itens verdes em `2026-10-17T05:46:37.227Z`; run `39007488850` success | Fotografia técnica do momento, não disponibilidade contínua. |
| Barreira | Suíte local de 24 unidades + 8 cenários passou; CI final `39007569602` success | Porta de regressão antes de uso; não substitui teste real do canal. |
| Workflows | 12 workflows ativos; actions externas fixadas por SHA; runners em Ubuntu 24.04; permissões explícitas | Orçamento de privilégios é verificável e agora tem teste contínuo. |
| Navegador público | Chrome isolado provado no run `39000200086`; apenas URL pública e referência opaca entram antes do push | Sem segredos de e-mail/Telegram/IA/marketing no processo de navegação. |
| Canais | E-mail e Telegram usam o mesmo núcleo, com testes de comandos, origem, anexos e filas | Canais preservados; nenhuma conta, segredo ou destino foi alterado. |

## Teste controlado no canal real — 2026-10-17

Uma rodada ponta a ponta foi executada pela caixa real e pelo trabalhador real do canal, mas com mensagens sintéticas, identificáveis e sem publicar conteúdo privado. Portanto, ela é evidência de comportamento do produto sob carga controlada — **não** de satisfação, adoção ou experiência de uma pessoa usuária.

- Foram enviados 38 casos controlados. No corte original de 14 minutos, 26 respostas chegaram; um caso de e-mail automático ficou corretamente sem resposta; 11 casos que deveriam responder continuavam não lidos.
- O relatório original mostrou `27/27 PASS`, mas esse número era enganoso: o script montava o denominador só com mensagens que já tinham resposta, ocultando as 11 ausências. Isso é uma falha de aferição, não aprovação do lote.
- Uma coleta posterior confirmou que os casos pendentes foram atendidos cerca de 14–15 minutos após o início da rodada. Há evidência de fila/latência sob rajada; não há evidência de perda silenciosa nessa rodada. A coleta histórica não deve ser usada como contagem de usuários ou de uma rodada, pois agrega mensagens de até 36 horas.
- A inspeção sanitizada dos retornos tardios encontrou uma regressão funcional concreta: `pesquisa: capital de Sergipe` foi indevidamente respondido pela ferramenta local de geografia e não trouxe URL de fonte. A causa era a interceptação de qualquer texto com tema geográfico antes da rota `pesquisa:`. A correção preserva os comandos geográficos explícitos e deixa todo prefixo de outra ferramenta chegar à sua rota própria.
- A coleta também ignorava apenas o alias sintético normal, mas não o alias sintético usado para simular remetente não autorizado; por isso seu inventário poderia contar a própria mensagem de teste como se fosse retorno. A filtragem dos dois aliases foi centralizada e coberta por regressão.
- A checagem de adoção do trabalhador de e-mail reconhecia mudanças em `email-chat.js`, mas não em `geografia-brasil.js`, que ele importa. Assim, uma correção nessa ferramenta poderia esperar a troca normal de turno para entrar em uso. A lista passou a reconhecer essa dependência e uma regressão garante a troca após a barreira aprovada.
- Na nova rodada com aferição corrigida, houve **37/38** checagens aprovadas, com latência observada de **1,3–17,5 min** (média 9,6). O caso `pesquisa:` passou, agora com fonte; a única falha foi a foto R3-6 em modo degradado: reconheceu formas/cores, mas não entregou a data exigida e declarou visão indisponível. O workflow falhou como deveria, publicou a prova e não ocultou a falha. Este resultado confirma a correção de medição e de rota, mas também confirma que visão sob carga ainda não é confiável o bastante para afirmar aprovação integral.

Um diagnóstico curto de foto iniciado depois da rodada ficou preso no seu próprio leitor IMAP (sem teto de operação) e foi cancelado para não consumir o timeout inteiro; ele não produz evidência sobre a foto. O teste curto foi então endurecido com sonda, tetos, reconexão e saída não zero para resultado parcial/ausência/erro antes de ser reutilizado.

O painel `CAPACIDADE.md` também deixa de chamar seu número interno de “resultado observável”: passa a expor separadamente a última rodada real sanitizada e dá precedência textual à falha do canal. Isso não muda pesos para fabricar nota; impede que o `100/100` interno esconda uma falha real.

A investigação encontrou ainda o vigia preso em sua própria checagem IMAP de caixa; a execução foi cancelada, pois uma sonda de saúde não pode ficar pendurada indefinidamente. A correção aplica teto a conexão, trava, busca, leitura e logout IMAP e limita o job do vigia a 15 minutos. Isso preserva a detecção de caixa pendente, sem deixar o monitor inteiro travado. A execução real posterior `39046039694` terminou com sucesso e publicou 8/8 itens técnicos verdes em `2026-10-17T15:40:03.261Z`; é recuperação observada do monitor, não prova de satisfação humana nem de disponibilidade contínua.

Correções publicadas nesta série: toda entrada enviada agora entra no denominador; ausência de resposta passa a ser `FALHOU`, o processo termina com código não zero em falha/erro, a janela padrão foi ajustada de 14 para 25 minutos conforme a fila observada, a coleta deixa de contabilizar mensagens sintéticas de ambos os aliases, mudança em geografia força adoção segura pelo próximo turno, e o diagnóstico de foto deixa de esconder travamento/resultado parcial. A nova janela é uma calibração de observação, não uma promessa de SLA.

## Código e rotas

### Canal de e-mail e Telegram

- `tools/email-chat.js` concentra comandos locais, respostas por motores, anexos, memória de conversa curta, retorno de navegação e proteções de origem.
- Testes simulam MIME problemático, remetente não autorizado, foto, PDF, três fotos, memória, e-mail devolvido e indisponibilidade de motores. Todos passaram na barreira atual.
- A rota local de geografia é consultada antes de motor/rede apenas quando o pedido é inequivocamente brasileiro; texto comum e comandos explícitos de outras rotas (por exemplo, `pesquisa:`) não são interceptados.
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

O Chat estava acessível nas páginas consultadas e respondeu os casos controlados observados, mas **não está comprovado como pronto, forte em rajadas ou satisfatório para uso humano**. O teste real revelou limites que a barreira e o placar não revelavam: fila suficiente para exceder a janela de 14 minutos, um denominador que ocultava mensagens sem resposta, coleta contaminável por remetente sintético e uma regressão que desviava `pesquisa:` para geografia sem fonte.

A rodada corrigida confirmou no produto a aferição honesta e a rota de pesquisa, mas não teve aprovação integral: a visão falhou em um caso sob carga. A conclusão honesta é: canal funcional nos casos observados, com capacidade de rajada parcialmente demonstrada (37/38 neste lote controlado), visão ainda instável sob carga e sem evidência de satisfação de pessoas usuárias.
