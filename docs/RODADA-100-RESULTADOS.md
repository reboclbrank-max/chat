# Rodada 100 — auditoria do gabarito, avaliação textual e visão

Data: 29/10/2026. Este registro separa os resultados medidos das hipóteses e preserva as falhas.

> **Retificação da rodada 101:** os valores de tempo abaixo, publicados pelo medidor antigo como “mediana”, eram o valor central **superior** nas amostras pares. A mediana convencional, recalculada sobre os mesmos tempos completos, é **23,4375 s** (99-A), **76,1385 s** (99-B), **26,2815 s** (100 original) e **62,2375 s** (holdout 100). Os JSONs históricos permanecem intactos; isso não altera os acertos nem é uma nova execução. A rotina foi corrigida e ganhou testes para tamanhos pares e ímpares.

## Resumo da auditoria

- A rubrica antiga rejeitou **“espalhamento de Rayleigh”** (#11) e **“painéis”** (#22). Também foram acrescentadas alternativas verificáveis e restritas para **reciclagem de material e preservar ecossistemas** (#6) e **cisterna** (#16). Os demais 20 itens não foram alterados. Os negativos e as alternativas originais são testados em `tools/testes/avaliacao-aberto.js`.
- O banco antigo está preservado em `bench/banco-aberto-antes-100.json`. Reavaliar um texto com um gabarito corrigido **não é uma nova geração** e não demonstra melhoria do modelo. As respostas 99-A/B vão de 22/20 para 24/22 após correção, mas até o texto A com 24/24 contém um dado de inflação comprovadamente errado: não confundir pontuação de termos com veracidade.
- A ferramenta de estilo antiga tinha erros de contagem: não normalizava acentos da lista, perdia conectivos seguidos por pontuação e confundia ocorrência com variedade. Seus rótulos de “texto doente” eram inválidos. A nova ferramenta produz indicadores descritivos sem uma nota arbitrária.
- Um texto anteriormente aprovado mencionou IPCA-15 de **10,06% em 12 meses até outubro de 2022**; o [IBGE informa 6,85%](https://biblioteca.ibge.gov.br/visualizacao/periodicos/2376/ipca_15_2022_out.pdf). A régua de termos não verificava isso. A instrução passou a desencorajar estatísticas e fontes inventadas, mas isso **não garante veracidade**.
- A resposta aberta agora informa `nao_verificada` em vez de atribuir confiança factual alta por formato; quando não entrega o número de parágrafos ou itens explicitamente pedido, as quatro interfaces exibem aviso separado, sem alterar o texto bruto da API.

## Números disponíveis

| Medida | Resultado | Ressalva |
|---|---|---|
| 99-A, rubrica original | 22/24, central superior 24,0 s | Dados históricos; código `5e6d626`; mediana convencional corrigida acima |
| 99-B, rubrica original | 20/24, central superior 82,9 s | Mesmo código; janela diferente; mediana convencional corrigida acima |
| 100, rubrica original | 21/24, central superior 27,6 s | Código `eccc2a2d…`, antes da adição dos avisos; mediana convencional corrigida acima |
| 100, mesmos textos com gabarito corrigido | 23/24 | Correção de #6 e #22; **não é uma nova execução** |
| Holdout aberto | 5/6 | Uma execução, seis questões públicas; #104 veio com um parágrafo e 69 palavras após 235,5 s |
| Visão, código final | 11/11, zero sem-resposta | 11 imagens sintéticas simples; mediana de **9,49 s de parede**, 3,79 s da última chamada, total 260 s |

A repetição da régua após acrescentar os avisos foi interrompida em **4/24**, sem placar: o item #3 demorou 307 s e a cota estava pressionada. Não há três execuções completas da versão final. A medição de 21/24 e o holdout 5/6 usaram a versão imediatamente anterior, com SHA-256 registrado; `bench/diff-avisos-100.patch` aplicado em reverso recompõe esse hash e permite conferir que a diferença são os metadados de aviso. Os testes verificam que o texto bruto não muda. A amostra de seis perguntas é pública e não foi medida antes: **não prova melhoria no holdout**.

As quatro execuções da rodada 98 foram feitas com **códigos diferentes**, ao contrário do que foi dito antes; não sustentam uma conclusão de equivalência estatística ou causa única.

## Avaliação qualitativa

O assistente aplicou uma rubrica identificada a quatro respostas expositivas históricas e a uma pequena amostra gerada de **microconto, poema e convite**. É uma avaliação exploratória de um único avaliador, não cega e não humana; não certifica qualidade literária em geral nem prova melhoria antes/depois. Os textos, justificativas, fontes e limites estão em `docs/AVALIACAO-TEXTO-ABERTO.md` e `bench/resultado-estilo-amostra-100.json`.

## Evidências e execução

```sh
node tools/testes/avaliacao-aberto.js
node tools/testes/roteador-resiliencia.js
node tools/testes/estado-aberto.js
node bench/reavaliar-aberto.js bench/resultado-aberto-99-a.json bench/resultado-aberto-99-b.json bench/resultado-aberto-100-original.json
node bench/estilo.js bench/resultado-aberto-99-a.json
# Conferir a diferença entre a versão textual medida e a versão com aviso:
cp roteador-ia.js /tmp/roteador-comparar.js
patch --reverse /tmp/roteador-comparar.js < bench/diff-avisos-100.patch
sha256sum /tmp/roteador-comparar.js
```

A visão final está em `bench/resultado-visao-100.json`. Quatro pedidos precisaram de três tentativas e demoraram cerca de 48–57 s; a mediana esconde essa cauda. A barreira local passou **101/101**, com três cenários ignorados por pré-requisitos ausentes; a continuidade, **22/22**. A medição e o roteador usam provedores gratuitos, sujeitos a disponibilidade e cota.

## O que permanece aberto

1. A pontuação por padrões não prova correção factual e pode rejeitar respostas válidas. O item #16 continua sendo um desses casos a examinar: a resposta descreveu telhado e canaletas, sem rio, represa, reservatório, açude ou cisterna; para água de consumo, tratamento e controle de potabilidade são necessários.
2. Respostas incompletas e cauda longa de latência ainda aparecem quando as rotas gratuitas falham. O aviso de formato não aumenta a disponibilidade.
3. Nenhum avaliador humano independente validou a rubrica literária. A amostra de três gêneros é pequena e não mostra evolução longitudinal.
