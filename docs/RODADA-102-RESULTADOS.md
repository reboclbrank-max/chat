# Rodada 102 — fontes públicas, rota pendente e comparação pareada

Data: 29/10/2026. Horários em UTC. Este relatório separa **forma medida**, **conteúdo verificado por amostragem** e **reputação de fornecedor**. Nenhum dos três vira o outro.

## Veredito

- ❌ **A camada de fontes ligada por padrão NÃO superou a versão anterior na régua.** No mesmo banco de 24 itens, o controle fez **21/24** e o candidato fez **17/24**; no holdout conhecido, **6/6 contra 5/6**; no conjunto novo de 6, **5/6 contra 6/6**; nas repetições dos itens problemáticos, **5/8 contra 6/8**. Somando as 44 respostas de cada lado: **37/44 contra 34/44**. Por isso **o envio não liga a camada por padrão**.
- ✅ **O conteúdo de #16 e #104 melhorou no caminho com fontes, verificado por leitura e por fonte externa à base local.** #16 deixou de tratar “floração” como etapa e descreveu coagulação, floculação, decantação, filtração, desinfecção e fluoretação, com a ressalva de que etapas variam; #104 deixou de afirmar que obra emprestada fica bloqueada para reservas e explicitou que as regras diferem entre bibliotecas. Isso é auditoria de dois casos, não verificação factual automática nem garantia para o resto do texto.
- ✅ **#3 (Revolução Industrial) foi o ganho mais consistente:** 3/3 respostas com fonte contra 0/3 do controle, incluindo origem na Inglaterra e o deslocamento campo→cidade. O item continua dependendo de o pedido de três parágrafos ser cumprido; duas das três respostas do candidato ficaram com 2 ou 1 bloco em outras ocasiões medidas no mesmo par.
- ⚠️ **#22 continua falhando no critério original** (0/3 para o candidato, 1/3 para o controle): o texto fala de células agrupadas em módulos, mas a rubrica original pede “painel|placa”. Isso é divergência de vocabulário, não prova de erro factual.
- ✅ **Rota pendente encerrada:** as chamadas diretas ao LLM7 saíram do chat, das quatro células e do `dna.json`; o texto aberto de e-mail/Telegram passou a usar uma rota OVH gratuita já existente. Não há prova de autorização escrita para integrar o provedor, e a decisão não depende de ele responder bem.
- ⚠️ **O caminho padrão do candidato não foi medido de forma isolada.** A comparação acima mede o candidato **com fontes ligadas** (SHA `e7cbc598…`). O código publicado difere dessa versão medida em três pontos: fontes passam a exigir opt-in, pedidos com fonte e 2+ parágrafos vão direto ao bloco 1, e a instrução pede para manter os termos concretos do pedido. Não há placar para esse conjunto final, e não se declara melhora nem piora no caminho padrão.

## O que mudou

1. **Base local de trechos públicos** (`fontes-publicas.json`, 82 entradas): extratos curtos com URL, licença, data do retrato e escopo; 78 da Wikipédia em português com `oldid` fixo e 4 de páginas públicas oficiais ou institucionais (CAESB, BNDES, Secretaria de Educação de Goiânia e Biblioteca Municipal de Itajaí). Atualização é manual (`tools/gerar-fontes-educativas.js`), não é workflow agendado e não recebe pergunta de usuário.
2. **Recuperação local antes de gerar, sob demanda**: casamento aproximado por tokens com cobertura mínima, limite de dois trechos, recusa de fonte sem relação e de host fora de `pt.wikipedia.org`/`*.gov.br`. A pergunta **não é enviada** a buscador, provedor novo ou à URL citada. Sem cobertura, a resposta sai sem citação decorativa.
3. **Tratamento de fonte como dado não confiável**: delimitador, instrução para não seguir ordens do trecho, filtro conservador de texto aparentemente imperativo e aviso de que a fonte não verifica cada afirmação. `verificacaoFactual` continua `nao_verificada`.
4. **Apresentação**: `!melhor fontes: <pergunta>` e a API `responder({pergunta, tipo:'aberto', fontes:true})` mostram ligação, data do retrato, crédito CC BY-SA quando aplicável e o aviso. As quatro páginas usam o mesmo módulo; a casca subiu para `rebocl-chat-v101` e precacheia o arquivo de fontes.
5. **Orçamento por bloco**: uma chamada lenta não consome o tempo reservado aos parágrafos restantes (`limiteChamada`), e o teto por bloco caiu de 35 s para no máximo 30 s. Essa mudança também afeta o caminho padrão e **não foi medida isoladamente**.
6. **Fim da rota pendente**: `llm7` removido de `index/direto/ligar/limpar`, da allowlist de frota, do vigia de catálogos, do `dna.json` (versão 6, 34 motores) e das rotas de e-mail/Telegram, substituído por `ovhoss20`; as quatro células bloqueiam o host direto, inclusive para entradas antigas no navegador e no comando `!plantar`.

## Comparação pareada (mesma régua, mesma janela)

Plano e limites em `bench/PROTOCOLO-PAREADO-102.md`. Controle `A` = `bench/controle-101-roteador.js` (SHA `5ff3587204e2b1394bcbb7f64b4705cc605a83bdf59c4b159e419192f4f48e27`, extraído de `main@96b093c`). Candidato `B` = camada de fontes ligada por padrão, SHA `e7cbc598a4423d688987dba9c1a96521fd437db7709b8cb44a11f8a5ebf64ead`. 88 respostas, uma por vez, cache desligado, A/B contrabalanceado por grupo e semente fixa; janela de **14:13:17 a 14:51:44**, 38 min 27 s. Resultado completo em `bench/resultado-pareado-102.json` e log em `bench/historico-pareado-102.log`.

| Grupo | A (controle 101) | B (fontes ligadas) | Mediana A | Mediana B |
|---|---:|---:|---:|---:|
| Original (24) | **21/24 (87,5%)** | 17/24 (70,8%) | 9,4 s | 12,7 s |
| Holdout conhecido (6) | **6/6** | 5/6 | 13,8 s | 13,6 s |
| Conjunto novo (6) | 5/6 | **6/6** | 43,0 s | 12,0 s |
| Repetições de 3/16/22/104 (8) | 5/8 | **6/8** | 14,1 s | 8,1 s |
| Total das 44 respostas por lado | **37/44** | 34/44 | — | — |

A pior resposta de cada lado durou cerca de 110 s; o candidato chegou a 0 palavra em cinco itens fora da régua quando a cota gratuita se esgotou depois desta janela (ver “Limites”). As treze respostas discordantes: #16 (A ok/B falha lexical), #106 (A ok/B 1 parágrafo), #9 (A falha/B ok), #13 (A ok/B sem “antígeno”), #6 (A ok/B sem “resíduo/ambiental”), #206 (A 1 parágrafo/B ok), #14 (A ok/B sem “parâmetro”), #18 (A ok/B 33 palavras e 2 itens em 110 s), #3 (A falha/B ok), #17 (A ok/B sem “isolamento”), #3 repetições r1 e r2 (A falha/B ok), #22 repetição r2 (A ok/B falha lexical). Ou seja: o ganho veio de #3 e de um item novo; a perda veio de cobertura de termos, de um item de lista incompleto e de vocabulário (#16, #22).

## Auditoria de conteúdo nos casos pedidos

| Item | Controle A (esta janela) | Candidato B | Observação |
|---|---|---|---|
| #16 caminho da água | descreve infiltração, cisterna e depois “filtros de última etapa” e “reguladores de temperatura” na torneira | captação em telhados/cisternas ou corpos d'água, tratamento convencional com coagulação, floculação, decantação, filtração, desinfecção e fluoretação, ressalva de variação | B não repete “floração”; A também não usou o termo nesta execução, mas misturou percurso de cisterna com abastecimento público e inventou detalhe na torneira. A rubrica original reprova B por não citar “rio/represa/reservatório/açude”; o banco contextual da rodada 101 aceita “cisterna”, que B cita |
| #104 biblioteca | classificação, catálogo, empréstimo, devolução, multa, renovação | mesmos elementos, mais reserva de obra emprestada e a ressalva de que as regras variam entre bibliotecas | B corrige a generalização apontada na rodada 101; A desta janela também não repetiu o erro |
| #3 Revolução Industrial | falhou 3/3 na rubrica (faltou “século XVIII/Inglaterra”) | 3/3 com fonte: Inglaterra, século XVIII, campo→cidade | ganho lexical e factual condizente com as fontes; completude dos 3 parágrafos não é garantida |
| #22 solar | 1/3 | 0/3 | ambos descrevem células/módulos; a rubrica original exige “painel/placa”. O banco contextual aceita a formulação |

Fontes usadas na auditoria e **não** entregues ao candidato nesses itens: [SAAE Macaúbas](https://www.saaemacaubas.ba.gov.br/agua-e-esgoto/fases-e-etapas-do-tratamento-de-agua/) (mostra floculação/fluoretação, não “floração”), [UFAM](https://biblioteca.ufam.edu.br/politicas-de-emprestimo.html) e [UFVJM](https://portal.ufvjm.edu.br/servicos/Sisbi/reservar-materiais-do-acervo) (reserva de obra emprestada é permitida), [Britannica](https://www.britannica.com/event/Industrial-Revolution) e [IBGE](https://educa.ibge.gov.br/jovens/conheca-o-brasil/populacao/18313), [Portaria interministerial](https://antigo.mctic.gov.br/mctic/opencms/legislacao/portarias_interministeriais/Portaria_Interministerial_SEPEC_ME_SEXEC_MCTI_n_3807_de_31032021.html), [NT 44 Bombeiros GO](https://www.bombeiros.go.gov.br/wp-content/uploads/2025/02/NT-44-2025_-_Seguranca_em_sistemas_fotovoltaicos.pdf). Para o conjunto novo: [NASA](https://science.nasa.gov/moon/top-moon-questions/), [CDC](https://www.cdc.gov/clean-hands/data-research/facts-stats/index.html), [USGS](https://usgs.gov/natural-hazards/geomagnetism/science/introduction-geomagnetism), [Banco Central](https://www.bcb.gov.br/pre/pef/port/caderno_cidadania_financeira.pdf), [MMA](https://www.gov.br/mma/pt-br/assuntos/noticias/governo-federal-lanca-programa-nacional-para-conservacao-e-uso-sustentavel-de-manguezais). A revisão é feita pelo mesmo agente executor: **não é auditoria humana cega nem independência estatística**.

## Limites desta rodada

- **A base local é pequena, datada e escrita pelo mesmo agente que fez a solução.** O holdout antigo deixou de ser cego porque os trechos foram escolhidos depois de ver suas falhas; o conjunto novo também foi escrito por quem implementou. Nada disso é amostra representativa.
- **A cota gratuita acabou durante a janela e depois dela.** Uma sonda focada de 11 itens, executada logo após a comparação, devolveu 0 palavra em 5 itens (110 s cada) e só 6 respostas utilizáveis; ela **não é placar** e não foi salva como JSON porque o processo foi interrompido. Registro textual: #16 ok 204p/13,2 s; #106 vazio; #13 vazio; #6 ok 113p; #14 vazio; #17 vazio; #18 ok 78p/107 s. Ler isso como “regressão de código” seria errado.
- **Ordem pareada não elimina variação de provedor.** O mesmo item muda de conteúdo entre tentativas; 13 discordâncias em 44 pares é compatível com variação alta, mas também com efeito real das fontes. Não se calcula significância com essa amostra.
- **Fonte fornecida não é fonte seguida.** O modelo pode ignorar, distorcer ou contradizer o trecho; o filtro de injeção é conservador; link vivo não prova conteúdo; o conjunto não cobre notícia, lei atualizada, números recentes ou tema fora da lista.
- **`#16`/`#104` não estão universalmente resolvidos.** Duas respostas boas num caminho opcional não corrigem o gerador; o caminho padrão segue com `verificacaoFactual: nao_verificada`.
- **A rota LLM7 foi retirada por política, não por desempenho.** Não há avaliação de qualidade dela aqui, e a pausa não prova que o produto ficou pior ou melhor.

## Testes e reprodução

- Barreira local final do Chat, Node 22 (`/home/user/barreira-102-final.log`): **105/105 testes rápidos executados passaram, 3 ignorados** por pré-requisito local (Chromium para o contrato de CSP, duas verificações do OCR e `pdftotext` no cenário de PDF). Placar por tipo: comportamento 22/22, misto 34/34, estática 49/49. Continuidade `22/22`. Contratos novos: `tools/testes/fontes-e-provedor.js` (12) e `tools/testes/medicao-pareada.js` (1).
- Reproduzir a comparação: `node bench/medir-pareado-102.js` (retomada com `RETOMAR_PAREADO=1`; recusa hashes diferentes). Reproduzir a base: `node tools/gerar-fontes-educativas.js`.
- O medidor grava `meta.hashes` de todos os arquivos medidos; `bench/resultado-pareado-102.json` tem `invalido:false` e `completo:true`.
