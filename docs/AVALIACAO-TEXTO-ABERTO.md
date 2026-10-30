# Avaliação de texto: conteúdo, forma e qualidade não são a mesma coisa

Atualização: 29/10/2026. A régua automática `bench/medir-aberto.js` mede requisitos de forma e presença de termos. Ela **não verifica fatos, não lê coerência e não atribui qualidade literária**. O medidor `bench/estilo.js` v2 fornece contagens descritivas, sem classificar texto como bom, ruim ou “doente”.

## 1. Rubrica qualitativa, aplicável a pedidos expositivos e criativos

Cada eixo vale de 0 a 2, com justificativa e trechos. O escore não substitui a conferência factual. Marque **não aplicável** se o gênero ou o pedido dispensar o eixo; não preencha com zero.

| Eixo | 0 | 1 | 2 |
|---|---|---|---|
| Adequação ao pedido | Ignora tema, público ou restrição central. | Atende parcialmente, mas omite um requisito importante. | Atende tema, público, gênero e restrições verificáveis. |
| Clareza e domínio da linguagem | Difícil de compreender ou com erros que atrapalham. | Entendível, com impropriedades ou trechos desnecessariamente difíceis. | Claro e apropriado ao público, com linguagem consistente. |
| Coesão e progressão | Ideias incompatíveis ou saltos impedem a compreensão. | Ideias compreensíveis, mas com repetições, conexões frágeis ou progressão pobre. | Ideias avançam com relações lógicas e retomadas compreensíveis. |
| Efeito de linguagem/narrativa, quando pertinente | Nenhum efeito ou recurso solicitado é perceptível. | Há tentativa, mas ritmo, voz, imagens ou desfecho são inconsistentes. | Ritmo, voz e recursos servem ao propósito e ao gênero solicitado. |

**Veracidade é um registro separado:** `verificada` (com fontes para as afirmações verificadas), `contraditada` (com fonte e trecho) ou `não verificada`. Uma redação coerente pode estar errada. Uma afirmação sem fonte não é automaticamente falsa. A avaliação de ficção não exige que fatos fictícios sejam comprovados; exige que a ficção não seja apresentada como notícia real.

## 2. Processo de avaliação

1. Preserve pedido, resposta completa, data, versão e amostra; não escolha apenas os melhores casos.
2. Leia o texto integral e anote evidência por eixo. Não use contagem de conectivos como nota. A [cartilha do Inep](https://download.inep.gov.br/publicacoes/institucionais/avaliacoes_e_exames_da_educacao_basica/a_redacao_no_enem_2024_cartilha_do_participante.pdf) distingue coerência de coesão e alerta que um bom texto não depende de quantidade de conectivos. Ela trata especificamente da redação do Enem; aqui seus princípios são adaptados, não sua nota oficial.
3. Confira dados específicos em fontes adequadas ao tema, data e recorte. Se não foi possível conferir, registre **não verificado**, não “verdadeiro”.
4. Para uma conclusão geral, use amostra representativa, avaliadores humanos independentes, protocolo de desempate e informe concordância. Sem isso, declare que a leitura foi exploratória, por quem foi feita e quantos itens cobriu.

## 3. Leitura exploratória feita pelo assistente, sem avaliador humano independente

Estas observações são uma auditoria limitada de respostas já salvas; não são um teste cego nem uma nota geral para todos os textos. Os arquivos completos ficam em `bench/resultado-aberto-99-a.json` e `bench/resultado-aberto-99-b.json`.

| Amostra | Adequação | Clareza | Coesão/progressão | Fatos e evidência |
|---|---:|---:|---:|---|
| A #6, reciclagem | 2/2 | 2/2 | 2/2 | **Não verificados:** cifras de CO₂, carros, água e energia sem fonte; não é possível concluir que estejam corretas apenas por conterem números. A rubrica antiga falha por não encontrar “resíduo”/“lixo”. |
| A #8, inflação | 2/2 | 1/2 | 1/2 | **Contraditada:** afirma IPCA-15 de 10,06% em 12 meses até outubro de 2022; o [IBGE informa 6,85%](https://biblioteca.ibge.gov.br/visualizacao/periodicos/2376/ipca_15_2022_out.pdf). “créditito” é erro de escrita. O teste automático antigo aprovou o texto. |
| B #8, inflação | 1/2 | 2/2 | 2/2 | **Não verificados de forma independente:** explica a ideia central, mas entrega um parágrafo quando o pedido exigia dois. |
| B #22, energia solar | 2/2 | 1/2 | 1/2 | **Contraditada:** associa microinversor à conversão individual de cada célula; a [norma técnica do Corpo de Bombeiros de Goiás](https://www.bombeiros.go.gov.br/wp-content/uploads/2025/02/NT-44-2025_-_Seguranca_em_sistemas_fotovoltaicos.pdf) descreve ligação a um ou mais painéis, não a cada célula. O exemplo de produção de uma casa também carece de fonte e contexto. |

O eixo narrativo está **não aplicável** nessas quatro respostas expositivas. Essa amostra não sustenta uma conclusão sobre qualidade de poesia ou ficção. Uma rubrica mais abrangente precisa de amostra própria por gênero e avaliação independente.

## 4. Indicadores automáticos: como usar e o que não inferir

`node bench/estilo.js caminho-do-resultado.json` relata mediana de extensão de frases, percentual de frases acima de 35 palavras, repetição lexical simples e frequência de conectivos de uma lista explícita. A versão 2 normaliza tanto a lista quanto o texto e reconhece pontuação e ocorrências repetidas. Os arquivos `*-v2.json` preservam resultados por texto.

Os antigos `bench/estilo-antes.txt` e `bench/estilo-depois.txt` são mantidos para auditoria, **mas seus placares são inválidos**: além de não medir subordinação, a versão 1 deixava de reconhecer conectivos acentuados ou seguidos de vírgula e confundia tipos diferentes com ocorrências. Por isso os valores “0,5 → 0,4” e “19/24 → 21/24 doentes” não devem ser interpretados como avaliação de qualidade nem comparados à v2.

Repetição pode ser necessária ao tema; frases curtas podem ser deliberadas; conectivos podem ser usados incorretamente. Nenhum desses números prova coerência, originalidade, correção ou qualidade literária.


## 5. Amostra criativa real: três gêneros, leitura exploratória

`bench/coletar-amostra-estilo.js` coletou as três respostas integrais de
`bench/resultado-estilo-amostra-100.json`, com código e banco identificados por SHA-256.
O assistente fez a leitura abaixo: **um único avaliador, não humano, não cego, três pedidos**.
Os números ilustram a rubrica; não são um índice representativo nem uma comparação antes/depois.

| Gênero | Adequação | Clareza | Coesão/progressão | Efeito de linguagem | Evidência |
|---|---:|---:|---:|---:|---|
| Microconto | 2/2 | 1/2 | 1/2 | 1/2 | Apresenta irmãos, chuva, ônibus perdido e decisão, sem moral explícita. Uma única frase longa com vários pontos e vírgulas prejudica o ritmo; a bicicleta surge apenas no desfecho. |
| Poema | 2/2 | 2/2 | 2/2 | 1/2 | Há quatro linhas e retorno para casa, com progressão até a chegada; imagens como “abraço silencioso” são convencionais e os versos são longos. Isso é julgamento qualitativo, não erro objetivo. |
| Convite | 2/2 | 2/2 | 2/2 | 1/2 | Tom acolhedor e chamada “inscreva-se hoje”; não fornece data, horário ou local. A chamada é genérica e não informa um canal de inscrição. |

Para ficção e poema, o eixo factual é **não aplicável à história inventada**; o convite não
apresenta dados concretos de lugar ou horário para conferir. Os tempos foram 52,8 s, 79,8 s e
76,1 s respectivamente. A amostra não demonstra melhoria de estilo em relação a uma versão anterior.
