# Rodada 100 — auditoria do gabarito, avaliação textual e visão

Data: 29/10/2026. Este registro separa os resultados medidos das hipóteses e preserva as falhas.

## Resumo da auditoria

- A rubrica antiga rejeitou **“espalhamento de Rayleigh”** (#11) e **“painéis”** (#22). Também foram acrescentadas alternativas verificáveis e restritas para **preservar ecossistemas** (#6) e **cisterna** (#16). Os demais 20 itens não foram alterados. Os negativos e as alternativas originais são testados em `tools/testes/avaliacao-aberto.js`.
- O banco antigo está preservado em `bench/banco-aberto-antes-100.json`. Reavaliar um texto com um gabarito corrigido **não é uma nova geração** e não demonstra melhoria do modelo.
- A ferramenta de estilo antiga tinha erros de contagem: não normalizava acentos da lista, perdia conectivos seguidos por pontuação e confundia ocorrência com variedade. Seus rótulos de “texto doente” eram inválidos. A nova ferramenta produz indicadores descritivos sem uma nota arbitrária.
- Um texto anteriormente aprovado mencionou IPCA-15 de **10,06% em 12 meses até outubro de 2022**; o [IBGE informa 6,85%](https://biblioteca.ibge.gov.br/visualizacao/periodicos/2376/ipca_15_2022_out.pdf). A régua de termos não verificava isso. A instrução passou a desencorajar estatísticas e fontes inventadas, mas isso **não garante veracidade**.
- A resposta aberta agora informa `nao_verificada` em vez de atribuir confiança factual alta por formato; quando não entrega o número de parágrafos ou itens explicitamente pedido, as quatro interfaces exibem aviso separado, sem alterar o texto bruto da API.

## Números disponíveis

| Medida | Resultado | Ressalva |
|---|---|---|
| 99-A, rubrica original | 22/24, mediana 24,0 s | Dados históricos; código `5e6d626` |
| 99-B, rubrica original | 20/24, mediana 82,9 s | Mesmo código; janela diferente |
| 100, rubrica original | 21/24, mediana 27,6 s | Código `eccc2a2d…`, antes da adição dos avisos; uma execução |
| 100, mesmos textos com gabarito corrigido | 23/24 | Correção de #6 e #22; **não é uma nova execução** |
| Holdout aberto | 5/6 | Uma execução, seis questões públicas; #104 veio com um parágrafo e 69 palavras após 235,5 s |
| Visão, remedição anterior | 11/11, zero sem-resposta | 11 imagens sintéticas simples; 2,6 s é a última chamada, execução total 260 s |

As medições finais, com o código dos avisos e o cronômetro completo de visão, são registradas em arquivo próprio assim que concluídas; não se projeta o resultado antecipadamente. As quatro execuções da rodada 98 foram feitas com **códigos diferentes**, ao contrário do que foi dito antes; não sustentam uma conclusão de equivalência estatística ou causa única.

## Avaliação qualitativa

O assistente aplicou uma rubrica identificada a quatro respostas expositivas históricas e a uma pequena amostra gerada de **microconto, poema e convite**. É uma avaliação exploratória de um único avaliador, não cega e não humana; não certifica qualidade literária em geral nem prova melhoria antes/depois. Os textos, justificativas, fontes e limites estão em `docs/AVALIACAO-TEXTO-ABERTO.md` e `bench/resultado-estilo-amostra-100.json`.

## Evidências e execução

```sh
node tools/testes/avaliacao-aberto.js
node tools/testes/roteador-resiliencia.js
node tools/testes/estado-aberto.js
node bench/reavaliar-aberto.js bench/resultado-aberto-99-a.json bench/resultado-aberto-99-b.json bench/resultado-aberto-100-original.json
node bench/estilo.js bench/resultado-aberto-99-a.json
```

A barreira local passou **101/101**, com três cenários ignorados por pré-requisitos ausentes; a continuidade, **22/22**. A medição e o roteador usam provedores gratuitos, sujeitos a disponibilidade e cota.

## O que permanece aberto

1. A pontuação por padrões não prova correção factual e pode rejeitar respostas válidas. O item #16 continua sendo um desses casos a examinar: a resposta descreveu telhado e canaletas, sem rio, represa, reservatório, açude ou cisterna; para água de consumo, tratamento e controle de potabilidade são necessários.
2. Respostas incompletas e cauda longa de latência ainda aparecem quando as rotas gratuitas falham. O aviso de formato não aumenta a disponibilidade.
3. Nenhum avaliador humano independente validou a rubrica literária. A amostra de três gêneros é pequena e não mostra evolução longitudinal.
