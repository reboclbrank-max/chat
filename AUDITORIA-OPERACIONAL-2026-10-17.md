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

A mesma pergunta geográfica também revelou um erro no próprio gabarito: Bahia é o estado com oito divisas; Minas Gerais tem sete e não pode ser aceito como alternativa correta. O gabarito foi corrigido e ganhou regressão explícita. A resposta “Tocantins” da rota rápida permaneceu contabilizada como erro real — não foi escondida, removida nem convertida em acerto.

A segunda amostra encontrou outro falso negativo de formato: “R$ 1.300” para 1300 era correto, mas o comparador removia o ponto e deixava um espaço entre grupos de milhar. A normalização agora junta somente grupos de três dígitos, sem transformar decimais como 1,7 em 17; testes cobrem ambos os casos. A amostra permanece registrada até ser repetida com o comparador corrigido, substituindo em vez de somar sua evidência.

Para tratar a falha factual real de divisas — sem convertê-la artificialmente em acerto de modelo — foi criada a ferramenta local `geografia-brasil.js`. Ela contém o mapa completo de divisas terrestres entre unidades federativas, valida a simetria do mapa em teste e atende e-mail/Telegram antes de qualquer motor quando o pedido é inequivocamente geográfico. Assim, `divisas: Bahia` e a pergunta sobre o maior número de divisas retornam Bahia e seus oito vizinhos sem rede, modelo, dado privado ou custo. A bateria passa a exercitar essa mesma capacidade local; respostas fora desse domínio continuam sendo medidas pelos motores. As próximas amostras usam conjuntos distintos previamente identificados para medir a qualidade agregada, não para apagar falhas reais.

## Achado de observabilidade do vigia

O vigia continuava executando saudável, mas seu arquivo público só era gravado quando algum item mudava. Depois de mais de 90 minutos sem mudança, o placar podia marcar a confiabilidade como desatualizada apesar de haver vigias vivos. `vigia-estado.js` corrige isso: mudança é gravada imediatamente e uma checagem verde igual gera somente um pulso por hora. Há teste para mudança, silêncio curto, pulso de uma hora, estado ausente e relógio futuro.

## Evidência consolidada e resultado

A repetição substitutiva da amostra 8 (`39006497660`) concluiu com 10/10 e nenhuma rota muda. A amostra distinta 9 (`39006581289`) também concluiu com 10/10 e incluiu a questão pública 119, completando 20 questões distintas. Com a amostra 1 preservada em 9/10, há quatro amostras rastreáveis, 40 respostas auditadas, média de 97,5% e nenhuma resposta muda.

A barreira oficial do pulso do vigia (`39006900382`) passou. A checagem operacional sem envio de teste e sem encadear outra rodada (`39007488850`) passou e publicou o estado verde de 8/8 itens em `2026-10-17T05:46:37.227Z`. O cálculo reproduzível posterior sobre esse estado produziu **100/100**: qualidade 20/20, confiabilidade 20/20, resiliência 15/15, ferramentas 15/15, autonomia 15/15 e pesquisa/criatividade 15/15. O resultado decorre de comportamento e execuções observados, não de mudança de pesos, relaxamento de gabarito ou duplicação de evidência.

## Limites preservados

- O placar continua sendo indicador operacional, não QI, consciência, SLA ou promessa de disponibilidade.
- Serviços gratuitos e rotas públicas podem oscilar; o resultado só será chamado de 100/100 após a evidência ampla realmente atingir o critério.
- Não foram adicionados serviços pagos, dependências de produção, segredos, permissões, canais ou publicações externas.
- O próximo passo é executar amostras reais distintas, observar o placar resultante e só então iniciar melhorias de uso real com teste e rollback.
