# Governança operacional — Chat primeiro

> **Regra fixa do dono, 20/10/2026:** o Chat da Rebocl Brank é o trabalhador principal da casa. Agentes externos entram para usar o que o Chat já sabe/faz, investigar falhas, corrigir limites e trazer ideias **depois** de o Chat ter executado ou declarado, de forma verificável, por que não pôde executar.

## Ordem obrigatória de trabalho

1. **Chat primeiro:** diante de uma tarefa dentro das capacidades, canais e guardas já aprovados, consultar o estado e usar o fluxo existente do Chat antes de criar trabalho paralelo.
2. **Resultado antes de substituição:** o agente externo verifica o resultado, estado ou limitação sanitizada do Chat. Não duplica a tarefa nem cria uma segunda automação apenas para parecer mais rápido.
3. **Suporte delimitado:** se houver erro, falha, bloqueio externo, lacuna técnica ou risco de segurança, o agente externo diagnostica, testa uma correção pequena, registra e devolve a capacidade ao Chat.
4. **Ideias depois da execução:** novas propostas entram depois de observar o que o Chat fez, mediu ou declarou indisponível. Ideia não substitui evidência nem autoriza contornar regras.
5. **Exceções explícitas:** pedido direto do dono, indisponibilidade confirmada do Chat ou tarefa fora das capacidades/guardas dele permite suporte externo proporcional. Segredos, permissões, gastos, contas, exclusões, infraestrutura e ações irreversíveis continuam exigindo a revisão aplicável.

## Sinal explícito de continuidade do dono

Quando o dono enviar **“continue trabalhando”** (ou formulação equivalente), isso autoriza **um próximo corte pequeno, seguro e reversível** dentro desta ordem: consultar primeiro o estado/capacidade sanitizados do Chat, identificar uma lacuna concreta, registrar por que a melhoria foi aceita e quais alternativas foram recusadas, implementar/testar, publicar e salvar a continuidade no Chat e na Base. O sinal evita que seja necessário repetir toda a autorização a cada corte, mas não autoriza trabalho em segundo plano entre mensagens, nem substitui confirmação para gasto, segredo, conta, exclusão, infraestrutura, divulgação sensível, canal novo ou ação irreversível.

Cada corte deve continuar autônomo apenas no sentido técnico permitido: custo R$ 0, privacidade, anti-spam, guardas de canal, atualização PWA explícita e limites de evidência permanecem. Não usar o sinal para aumentar cadência, fabricar tráfego, executar dispatch manual, fingir resultado humano ou substituir o trabalho já atribuído ao Site/ao próprio Chat. Ao encerrar, deixar hash remoto confirmado e registro detalhado para que o próximo “continue trabalhando” comece da `main` atual, não de um workspace temporário.

## Onde a continuidade mora

| Tipo de informação | Casa correta | Regra |
|---|---|---|
| Ferramentas, testes, documentação operacional e estado sanitizado reutilizável | `reboclbrank-max/chat` | Versionar, testar e manter leve; a interface não deve carregar o arquivo inteiro a cada conversa. |
| Decisões, contexto privado e registros de governança | `reboclbrank-max/base` | Registrar a decisão correspondente sem credenciais ou conteúdo privado. |
| Segredos, tokens, mensagens, anexos e dados pessoais | Secrets/cofres/canais privados já aprovados | Nunca copiar para o Chat público, URL, log, Issue ou documentação. |
| Bancada temporária de um agente externo | Ambiente temporário | Não é fonte de verdade nem arquivo permanente; o que for reutilizável precisa estar salvo antes no repositório correto. |

## Limites honestos

“Chat primeiro” não promete disponibilidade infinita, execução sem fila ou poder fora das integrações configuradas. A página pública usa token guardado somente no navegador do dono para conversas privadas; nenhum agente pode contornar essa fronteira. O cérebro local é opcional e depende do aparelho. Uma falha, CI verde ou workflow ativo não prova entrega, alcance, uso humano, satisfação ou SLA.

## Estado registrado nesta adoção

- Fotografia do Chat consultada antes da adoção: `e28dbb89dd4402e6187c5574d887d38ee220baa3`.
- Publicação desta regra no Chat: `8a8f43c8a483b587142cac6c680eef96bf9ffac9`.
- Base de decisões/continuidade antes do registro 345: `1f41325a047d19cd06b5d7fa0ff9a6ed9b2e935d`; publicação do registro: `b27ceddbdfdf20a0175aaf6d52047de899617eab`.
- Marketing do Site com cadência protegida e régua honesta: `d7e7cb092a374ba9889c70b82f259bd9f6970cf4`.
- Agente privado de apoio: `f5f9750ed98014db3933fe796660a54191c116b9`.

A regra não altera canais, cron, custos, segredos, permissões ou conteúdo de conversa. Ela fixa a ordem de responsabilidade para os próximos trabalhos. A barreira de continuidade desta publicação passou 8/8; o hash remoto deve sempre ser conferido antes da próxima alteração.
