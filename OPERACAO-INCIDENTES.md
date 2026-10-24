# Operação segura de incidentes do Chat

> Procedimento público, fechado e sem conteúdo de caixa, logs, jobs ou segredos.
>
> Este documento reduz ações impulsivas diante de fila, atraso ou execução duplicada. Ele não autoriza dispatch, retry, cancelamento, leitura de logs ou mudança de configuração por conta própria.

## 1. Fonte de observação permitida

Use somente metadados sanitizados da execução: nome do workflow, evento, estado, conclusão, data e SHA. Não abrir:

- logs, jobs, steps, saídas ou texto de erro;
- caixa de e-mail, mensagens, anexos ou destinatários;
- secrets, PATs, variáveis, histórico de credenciais ou URLs autenticadas.

Uma fotografia de execução não confirma resposta entregue, leitura humana, disponibilidade ou SLA.

## 2. Decisão fechada por estado

| Fotografia observada | Ação automática permitida | Ação humana permitida |
|---|---|---|
| Um turno `in_progress` | Observar. | Nenhuma ação de fila. |
| Um `queued`/`pending` recente, sem executor | Observar; o vigia registra estado sanitizado. | Aguardar a plataforma. |
| Fila sem executor acima da janela técnica | Marcar `fila-estagnada`; não criar trabalho adicional. | Revisar a situação por metadados e decidir explicitamente o próximo corte. |
| Dois ou mais turnos `in_progress` | Marcar `turnos-duplicados`; não cancelar nenhum. | Revisão humana decide se uma intervenção pontual é necessária. |
| Execução concluída com falha | Registrar `execucao-falhou`; não reexecutar às cegas. | Diagnóstico proporcional, sem abrir conteúdo privado por padrão. |
| Ausência/atraso comprovado | Somente os corretores já existentes e fail-closed podem atuar dentro das suas allowlists e freios persistidos. | Não criar uma recuperação genérica nem um dispatch manual fora do fluxo aprovado. |

A reserva do e-mail continua sendo o único corretor do próximo turno: ela pede um leitor apenas depois de confirmar que não existe estado não concluído. O leitor longo não pré-enfileira sucessor.

## 3. Proibições permanentes

Não usar uma fila como motivo para:

- cancelar ou reexecutar automaticamente uma execução;
- despachar workflow/ref arbitrário ou criar uma segunda corrente;
- desproteger `main`, usar bypass, PAT humano ou force-push;
- apagar log, prova, estado ou ramo operacional para "destravar";
- prometer que a plataforma externa ficará sem fila.

Uma autorização humana excepcional para cancelar uma única execução precisa declarar o alvo, o motivo, a ausência de retry/novo dispatch e o registro factual posterior. Ela não cria uma regra geral de cancelamento.

## 4. Escalonamento humano e rollback

A pessoa revisora decide qualquer ação fora desta tabela. Mudança de código segue o fluxo protegido: branch revisável, check `testes`, uma aprovação humana, conversa resolvida e merge humano. Não há `CODEOWNERS` até que identidades GitHub reais sejam fornecidas pelo responsável; não inventar revisores.

Rollback de código é um revert revisado. Rollback de política de Actions ou proteção de branch não é automático e exige decisão humana separada. O ramo `estado/operacional` não deve ser apagado enquanto contiver estado/artefato necessário para auditoria ou continuidade.

## 5. Limites

Este procedimento organiza resposta segura a incidentes; não conserta fila do GitHub, runner, cron, rede, Gmail, entrega, disponibilidade externa ou satisfação humana. Ele preserva R$0, privacidade, reversibilidade e revisão humana.
