# Auditoria operacional do Chat — 2026-10-17

## Escopo e método

Auditoria autorizada pelo dono para elevar a capacidade operacional com evidência, antes de expandir o uso real. Foram conferidos o estado remoto, páginas públicas, fluxos principais, barreira de regressão, painel de capacidade e os limites de privacidade/R$ 0. Nenhuma credencial, mensagem, destinatário, conteúdo de caixa ou ID de canal foi consultado para este relatório.

## Evidências observadas

- Página principal, rota direta e site oficial responderam HTTP 200 durante a auditoria.
- A barreira oficial `testes-rapidos.yml` mais recente disponível concluiu com sucesso para o código publicado de retorno assíncrono do navegador.
- O navegador público isolado concluiu uma leitura real controlada em Chrome; e-mail/Telegram, destinos e segredos continuaram fora desse workflow.
- O vigia tinha todos os itens observados saudáveis no último estado público e mantinha turnos/concurrency do e-mail sob observação.
- O placar anterior estava em 98/100: a única redução vinha da média das cinco baterias de texto, não de canais, segurança, recuperação ou vigia.

## Achado corrigido nesta série

A bateria diária usava somente o dia como semente. Portanto, reexecutá-la no mesmo dia repetia as mesmas dez perguntas e poderia fazer execuções repetidas parecerem evidência independente.

A correção implementada nesta série:

1. identifica e registra cada amostra da bateria;
2. seleciona perguntas sem repetição dentro da amostra;
3. grava somente IDs públicos, placar, rota agregada e horário em `qualidade-historico.json` — nunca respostas integrais, e-mails, destinos ou segredos;
4. substitui uma amostra repetida em vez de somá-la;
5. só deixa a qualidade rastreável substituir a curva legada quando houver ao menos três amostras recentes distintas, trinta respostas e vinte questões diferentes;
6. reduz a nota imediatamente se uma amostra recente rastreável piorar.

## Achado da primeira amostra real

A primeira amostra rastreável respondeu corretamente 9 de 10 perguntas segundo o avaliador original. A resposta restante foi “página não encontrada” para HTTP 404: correta, mas rejeitada porque o gabarito aceitava apenas “não encontrado”. O gabarito foi ampliado com formulações equivalentes públicas e recebeu teste unitário; não houve alteração de rota, modelo, canal ou resposta do Chat.

Na repetição controlada, houve uma resposta muda para uma pergunta pública simples após as três rotas que a bateria conhecia. A auditoria confirmou que o canal real também dispõe da rota `llm7`, mas ela estava ausente da bateria. A bateria passou a tentar as quatro rotas reais (`frota`, `reserva`, `llm7`, `omni`) antes de classificar indisponibilidade. Isso torna a medição representativa do sistema que atende o dono, sem incluir segredo, rota privada ou nova dependência.

A mesma pergunta geográfica também revelou um erro no próprio gabarito: Bahia é o estado com oito divisas; Minas Gerais tem sete e não pode ser aceito como alternativa correta. O gabarito foi corrigido e ganhou regressão explícita. A resposta “Tocantins” da rota rápida permaneceu contabilizada como erro real — não foi escondida, removida nem convertida em acerto. As próximas amostras usam conjuntos distintos previamente identificados para medir a qualidade agregada, não para apagar essa falha.

## Limites preservados

- O placar continua sendo indicador operacional, não QI, consciência, SLA ou promessa de disponibilidade.
- Serviços gratuitos e rotas públicas podem oscilar; o resultado só será chamado de 100/100 após a evidência ampla realmente atingir o critério.
- Não foram adicionados serviços pagos, dependências de produção, segredos, permissões, canais ou publicações externas.
- O próximo passo é executar amostras reais distintas, observar o placar resultante e só então iniciar melhorias de uso real com teste e rollback.
