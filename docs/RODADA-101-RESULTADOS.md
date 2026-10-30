# Rodada 101 — recuperação de texto aberto e medição retomável

Data: 29/10/2026. Todos os horários das medições abaixo estão em UTC. Este documento distingue estrutura, conteúdo, disponibilidade e publicação: uma nota de palavras-chave não verifica a verdade.

## Veredito

- ✅ **Mecanismos corrigidos:** a geração tenta resposta completa, aproveita blocos ou itens já fechados e mantém partes úteis com aviso, sem cacheá-las como completas. O prazo é compartilhado; o retorno de uma rota após o cooldown pode ser aproveitado sem antecipar `Retry-After`. O medidor grava checkpoints integrais, auditáveis e retomáveis.
- ✅ **Medições completas:** na mesma régua original de 24, o registro anterior foi **21/24** e o código final desta rodada fez **22/24**. No mesmo holdout público de seis, foi de **5/6** para **6/6**. A versão intermediária, que também foi integralmente medida, fez **15/24** e **5/6**; ela não foi omitida. Os números são uma execução por versão e por janela, não demonstram causalidade, significância estatística ou disponibilidade futura.
- ⚠️ **#16 e #104 passaram na forma, mas o conteúdo não está resolvido:** a resposta final de #16 usa o termo “floração” como etapa de tratamento; a de #104 afirma como regra que um livro emprestado fica bloqueado para novas reservas. O [SAAE de Macaúbas](https://www.saaemacaubas.ba.gov.br/agua-e-esgoto/fases-e-etapas-do-tratamento-de-agua/) descreve floculação e fluoretação, não essa etapa; a [biblioteca da UFMG](https://www.bu.ufmg.br/bcentral/reserva-de-emprestimos/) permite reserva de obras emprestadas. Políticas de biblioteca podem variar. Não há verificador factual automático nesta mudança; as saídas continuam `nao_verificada`.
- ⚠️ **Falhas remanescentes:** na régua original final, #3 ficou curto e em um parágrafo em vez de três; #22 foi reprovado por uma exigência lexical mesmo descrevendo células agrupadas em módulos. A rubrica suplementar auditada analisa a equivalência de #22, sem substituir o placar original nem refazer a resposta.
- ⚠️ Provedores gratuitos têm cotas, falhas e política variável. Os testes não provam qualidade literária, visão em todos os casos, uso real, potabilidade de água ou funcionamento 24 horas. Não houve nova chave paga, conta ou provedor adicionado ao roteador.

## Antes, intermediário e final: mesma régua

Os bancos `bench/banco-aberto-antes-100.json` e `bench/banco-aberto-holdout-100.json` e a rubrica `bench/avaliar-aberto.js` são os mesmos em todas as linhas. `CONC=1`; as perguntas são públicas, e o holdout já foi inspecionado, portanto não é uma prova cega independente. A mediana aqui é a média dos dois valores centrais quando há número par de itens, recalculada sobre cada tempo individual.

| Versão e janela | Régua original | Mediana de parede | Holdout público | Mediana de parede |
|---|---:|---:|---:|---:|
| 100, antes dos avisos | 21/24 | 26,2815 s | 5/6 | 62,2375 s |
| 101 intermediária | 15/24 | 18,111 s | 5/6 | 18,657 s |
| 101 final | 22/24 | 9,6705 s | 6/6 | 9,780 s |

A versão 100 medida tinha SHA-256 `eccc2a2dc0f8206c42a3e2e09dd4f45db00fdab4768330948a4f3a08a9c0bf4d`, anterior aos avisos. A versão intermediária tinha `af87248a8c9875855c9c91af6d423c1b06b488bfaf31d36142d88d693fc53f2c`; a final tem `5ff3587204e2b1394bcbb7f64b4705cc605a83bdf59c4b159e419192f4f48e27`. `bench/diff-101-intermediario.patch` recompõe a versão intermediária a partir da final. `bench/diff-avisos-100.patch` permite reconstituir o código anterior aos avisos. Todos os hashes são de `roteador-ia.js`.

A régua de 100 rodou de 06:46:18 a 07:04:37; seu holdout, de 07:05:12 a 07:13:52. A 101 intermediária rodou de 10:38:42 a 10:56:09, e seu holdout de 10:56:09 a 10:59:36. A 101 final rodou de 11:06:58 a 11:13:31, e o holdout de 11:13:31 a 11:15:33. Os tempos exatos, respostas e rastros estão nos JSONs `bench/resultado-aberto-{100-original,holdout-100,101-intermediario-original,101-intermediario-holdout,101-original,101-holdout}.json` e nos logs correspondentes. A execução interrompida da rodada 100, com somente 4/24, continua preservada como **parcial**, não como placar.

Na medição intermediária houve 76 chamadas de transporte na régua original e 17 no holdout; na final, 32 e 10, respectivamente. A original final registrou 26 respostas de transporte com texto, 2 respostas de cota, 2 timeouts, 1 degenerada e 1 erro de servidor; o holdout final registrou 8 textos, 1 cota e 1 erro de servidor. Os totais são chamadas, não itens aprovados. A rodada 100 não registrou essa trilha, portanto não se atribui uma diferença causal de chamadas a ela.

**Retificação estatística:** o medidor anterior chamava de mediana o valor central superior em amostras pares. Por exemplo, registrou 27,580 s e 68,488 s para a 100, mas as medianas convencionais são 26,2815 s e 62,2375 s. Os JSONs antigos não foram reescritos. A rotina foi corrigida com testes para listas pares, ímpares e vazias; `bench/diff-medidor-101-intermediario.patch` permite reconstruir o medidor intermediário. Isso só muda o resumo, não os textos, a rubrica ou as notas das execuções já feitas.

## Falhas item a item

**Rodada 100, original:** #6 não encontrou o termo ambiental exigido; #16 não nomeou a fonte/armazenamento previsto; #22 não encontrou a grafia exigida para painel. No holdout, #104 tinha 69 palavras e um parágrafo, após 235,523 s.

**101 intermediária, original:**

| Item | Resultado registrado e limite |
|---|---|
| #1 | Vazio; 110,002 s. |
| #3 | A régua não aceitou “Grã-Bretanha” e “1760” como localização/época; o texto tinha três parágrafos. A [Britannica](https://www.britannica.com/event/Industrial-Revolution) situa o início na Grã-Bretanha no século XVIII. |
| #4 | Vazio; 90,003 s. |
| #5 | 58 palavras; só dois dos três passos. O produto avisou a falta do item, mas o gabarito original só reprovou por tamanho. |
| #10 | Três de cinco itens; resposta parcial com aviso. |
| #16 | Vazio; 110,002 s, em meio a cota, falhas e timeouts. |
| #18 | 28 palavras e um de quatro argumentos; aviso de formato. |
| #22 | Ausência do termo de painel exigido. |
| #23 | Um dos dois parágrafos; aviso de formato. |

No holdout intermediário, **#101** teve um dos dois parágrafos; #104 passou lexicalmente em 7,862 s. Este resultado intermediário é mantido mesmo após a alteração de código e nova medição completa.

**101 final:**

- **#3:** 89 palavras, um parágrafo em vez de três e falta de correspondência literal para a terceira expressão do gabarito; 110,002 s e aviso de formato. O texto descreve deslocamento de mão de obra rural para centros urbanos, mas a expressão regular não reconheceu essa formulação. Mesmo com a leitura semântica, permanece reprovado por tamanho e estrutura. O [IBGE](https://educa.ibge.gov.br/jovens/conheca-o-brasil/populacao/18313) descreve o deslocamento campo–cidade como êxodo rural; isso não valida o restante do texto.
- **#22:** 142 palavras e dois parágrafos; o texto diz que células solares são agrupadas em módulos, mas não usa literalmente “painel” nem “módulos solares” adjacentes. A descrição contextual é equivalente ao componente exigido: [material técnico do CEPEL](https://cresesb.cepel.br/index.php?cid=331&lang=pt&section=com_content) descreve células agrupadas formando módulo; a [norma dos Bombeiros de Goiás](https://www.bombeiros.go.gov.br/wp-content/uploads/2025/02/NT-44-2025_-_Seguranca_em_sistemas_fotovoltaicos.pdf) define painel solar como módulo fotovoltaico. O texto ainda contém erros de escrita; equivalência de um termo não o transforma em texto inteiramente correto.
- **Holdout final:** nenhum item foi reprovado pela rubrica automática. A falha factual de #104 descrita acima passou despercebida por ela.

Na 101 final, **#16** recebeu 154 palavras, dois parágrafos e uma chamada em 9,586 s; **#104**, 229 palavras, dois parágrafos e uma chamada em 7,553 s. Esses são resultados de uma execução, não garantia de repetição ou veracidade. Uma repetição pontual anterior com o código final da 100 também passou nos dois itens (18,519 s e 14,131 s), mas misturou percursos no #16; `bench/diagnostico-101-antes.json` preserva os textos. Isso mostra variabilidade mesmo antes da correção.

## Reavaliação suplementar, sem mudar a régua principal

`bench/banco-aberto-auditado-101.json` deriva do banco já corrigido da rodada 100. Acrescenta somente duas alternativas restritas: início na Grã-Bretanha no #3 e células agrupadas em módulos dentro de contexto fotovoltaico no #22. Enunciados, limites e demais critérios são preservados. `tools/testes/avaliacao-aberto.js` verifica que só os dois padrões mudaram e inclui positivos e negativos para negação, local irrelevante, módulo genérico e ausência de contexto. A análise contextual foi feita **depois** de observar os textos; regex e testes não são um verificador semântico ou factual completo.

| Mesmos textos já salvos | Régua original | Correções de 100 | Banco contextual 101 |
|---|---:|---:|---:|
| 100 original | 21/24 | 23/24 | 23/24 |
| 101 intermediária | 15/24 | 15/24 | 16/24 (#3) |
| 101 final | 22/24 | 22/24 | 23/24 (#22) |

Os resultados e hashes estão em `bench/reavaliacao-101.json`; `node bench/reavaliar-aberto.js ...` os reproduz sobre **as mesmas respostas**. Não houve geração nova, e na comparação suplementar o resultado da 100 e da 101 final é **23/24 em ambas**. Nenhum placar prova verdade ou qualidade de prosa.

## O que mudou no código

1. Para parágrafos, listas e texto curto, uma tentativa completa pode economizar chamadas. Se vierem blocos ou itens numerados fechados em sequência, somente o restante é solicitado, com contexto das partes anteriores. A normalização de listas não apaga linhas de continuação. Não se divide uma frase só para simular parágrafos.
2. A recuperação longa mantém no conjunto rotas temporariamente em cooldown e verifica novamente a disponibilidade antes da chamada. Uma rota que volta dentro do prazo não é esquecida; a espera não encurta `Retry-After`. O segundo parágrafo não é solicitado enquanto o primeiro não existir. Uma tentativa completa que falha não acrescenta uma chamada de plano redundante.
3. O plano opcional continua disponível, com etapas em fatias contíguas; é sugestão, não verificação externa. A rota já existente `ovhoss20` recebeu prioridade conservadora de reserva depois de uma única sonda exploratória de texto útil em 5,495 s. Essa observação não é previsão de latência; outras sondas OVH deram timeout ou erro (`bench/piloto-ovh-101.json`).
4. O prazo padrão de 110 s é compartilhado na geração aberta, e o timeout também cobre a leitura do corpo HTTP. Isso não é SLA nem prazo absoluto: consultas anteriores, agendamento e terceiros podem excedê-lo. `Retry-After` aceita segundos ou data HTTP; o estado de cota é por instância, não coordena outros clientes no mesmo IP. [Kilo](https://kilo.ai/docs/gateway/usage-and-billing) descreve a cota anônima por IP e [OVH](https://help.ovhcloud.com/csm/en-public-cloud-ai-endpoints-getting-started?id=kb_article_view&sysparm_article=KB0065403) por IP e modelo.
5. O checkpoint grava resposta inteira, hashes, tempos e trilha de transporte por item, atomicamente. Não registra prompts internos adicionais. Retomada não refaz itens e exige os mesmos hashes do código, banco, rubrica e medidor, além de modo e concorrência. Um prefixo tem `completo:false` e `pct:null`.
6. Resposta incompleta recebe aviso de formato e não entra no cache; respostas factuais geradas continuam explicitamente não verificadas. O service worker usa `rebocl-chat-v100` sob a ativação explícita já existente. Rollback é reverter o commit da rodada, sem apagar dados locais.

**Pesquisa de provedores não é autorização de uso.** A sonda exploratória sem chave de LLM7 respondeu HTTP 200 com CORS (`bench/piloto-llm7-101.json`), mas seus [termos](https://github.com/chigwell/llm7.io/blob/main/TERMS.md) exigem autorização prévia por escrito para integrar o serviço a produtos de terceiros e o descrevem como voltado a educação e pesquisa. Por isso não foi adicionado ao roteador. A página já tinha referências a LLM7 antes desta rodada; autorização para esse uso preexistente **não foi comprovada** e precisa de revisão separada. A documentação pública e a política de privacidade também divergem sobre a exigência de token anônimo; não se presumiu uma política permanente. BlockRun tampouco foi integrado: o preflight observado não autorizou o navegador e a [política](https://blockrun.ai/privacy) do gateway principal admite retenção sem prazo fixo.

## Testes e reprodução

A barreira local final executou **103/103 testes rápidos**, com **3 ignorados** por pré-requisito: Chromium para CSP, verificações locais de OCR e `pdftotext` para cenário PDF. Separação: 22/22 de comportamento, 32/32 mistos, 49/49 estáticos. Continuidade: 22/22. Testes simulados cobrem retomada após 429, preservação de blocos e lista, ausência de repetição antes de `Retry-After`, aviso e cache, ordenação de etapas, timeout no corpo, checkpoint e mediana; não provam fatos ou disponibilidade real.

```sh
node tools/testes/aberto-recuperacao.js
node tools/testes/medicao-aberto-checkpoint.js
node tools/testes/avaliacao-aberto.js
node tools/testes/estado-aberto.js
node tools/testes/texto-longo-offline.js
node tools/testes/roteador-resiliencia.js
node tools/montar-paginas.js --verificar
npm test
# Escolha novos nomes de saída: o medidor recusa sobrescrever uma execução completa.
CONC=1 BANCO_ABERTO=banco-aberto-antes-100.json SAIDA_ABERTO=outra-original.json node bench/medir-aberto.js
CONC=1 BANCO_ABERTO=banco-aberto-holdout-100.json SAIDA_ABERTO=outro-holdout.json node bench/medir-aberto.js
```

Para um checkpoint realmente incompleto, `RETOMAR_ABERTO=1` permite continuar somente com hashes e condições iguais; a nova janela fica explícita. Não se deve refazer somente as falhas para produzir um placar favorável. A [pesquisa sobre autocorreção sem feedback externo](https://openreview.net/forum?id=IkmD3fKBPQ) reforça que pedir ao próprio modelo uma revisão não equivale a verificar fatos.
