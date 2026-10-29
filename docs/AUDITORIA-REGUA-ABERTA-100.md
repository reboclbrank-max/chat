# Auditoria da régua aberta — correções reproduzíveis

Data: 29/10/2026. `bench/banco-aberto-antes-100.json` conserva o banco original de 24 itens; `bench/banco-aberto.json` conserva as mesmas perguntas e exigências e corrige apenas os padrões dos itens 6, 11, 16 e 22. `tools/testes/avaliacao-aberto.js` assegura que os outros 20 itens permaneçam idênticos e testa exemplos positivos e negativos.

## Quatro correções, com evidência

1. **#11 — céu azul.** A resposta preservada em `bench/resultado-aberto-99-a.json` explica o *espalhamento de Rayleigh*, mas a expressão regular antiga só aceitava `dispers`. A [UFMG explica o espalhamento Rayleigh como causa do céu azul](https://demonstracoes.fisica.ufmg.br/artigos/ver/107/18.-Espalhamento-da-luz). A alternativa `espalh` passa a ser aceita; os requisitos de luz e azul continuam. Isso reconhece uma descrição correta do mecanismo, mas não valida cada frase ou número do texto.
2. **#22 — solar fotovoltaica.** A resposta em `bench/resultado-aberto-99-b.json` usa “painéis”, plural que não contém `painel`. Acrescentamos a flexão e expressões específicas como “módulo fotovoltaico”; um “módulo” genérico **não** satisfaz a alternativa nova. A [Portaria Interministerial 3.807/2021](https://antigo.mctic.gov.br/mctic/opencms/legislacao/portarias_interministeriais/Portaria_Interministerial_SEPEC_ME_SEXEC_MCTI_n_3807_de_31032021.html) emprega “módulo ou painel fotovoltaico”. Luz e eletricidade/corrente continuam obrigatórios.

3. **#6 — reciclagem.** A resposta da execução de 100 explica os resíduos e termina em “preservando ecossistemas”; isso expressa uma consequência ambiental sem a palavra “ambiental”. A [Câmara Municipal de Vitória](https://www.cmv.es.gov.br/opiniao/ler/2679/dia-do-meio-ambiente-e-a-importancia-da-reciclagem-contribuindo-para-um-futuro-sustentavel) relaciona reciclagem, proteção dos ecossistemas e preservação ambiental. A alternativa nova exige a **expressão de preservação dos ecossistemas**, não apenas a palavra genérica “ecossistema”; testes também verificam um caso com negação simples.
4. **#16 — caminho da chuva.** Além de rios e represas, uma cisterna pode armazenar água captada do telhado. O [Programa Cisternas do MDS](https://www.gov.br/mds/pt-br/acoes-e-programas/acesso-a-alimentos-e-a-agua/programa-cisternas/manuais-e-outras-publicacoes/documentos-de-referencia/cartilhas/sesan_cartilha_cisternas_2026_v-03_digital-02.pdf) descreve esse caminho. Acrescentar a palavra não substitui tratamento e controle de potabilidade, nem transforma qualquer cisterna em água potável. A resposta da execução de 100 não menciona cisterna e continua falhando no gabarito.

## Reavaliação dos mesmos textos, sem geração nova

Reproduzir com:

```sh
node bench/reavaliar-aberto.js bench/resultado-aberto-99-a.json bench/resultado-aberto-99-b.json bench/resultado-aberto-100-original.json
node tools/testes/avaliacao-aberto.js
```

| Execução preservada | Rubrica original | Rubrica com as correções | O que mudou |
|---|---:|---:|---|
| A | 22/24 | 23/24 | #11: espalhamento |
| B | 20/24 | 21/24 | #22: painéis |
| 100 | 21/24 | 23/24 | #6: preservação de ecossistemas; #22: painéis |

A reavaliação desses arquivos **não é uma nova execução** e não demonstra melhora do gerador. #6 permanece fora do gabarito nas duas: não disse literalmente “resíduo” nem “lixo”. A resposta trata de alumínio reciclado, mas contém estatísticas sem fonte; deve ser lida, e não ser automaticamente declarada correta ou falsa.

## Limites que a régua ainda não resolve

- `contem` busca padrões de palavras: não avalia relações, negações, verdade, boa argumentação ou qualidade literária.
- Alguns termos no gabarito não são literalmente solicitados pelo usuário; uma resposta válida pode ser rejeitada. Não acrescente sinônimos só para melhorar placar: documente equivalência, negativos e teste permanente.
- Na execução B, #8 e #14 falharam por respostas curtas e com um parágrafo em vez de dois. Uma correção de gabarito não resolve disponibilidade de provedores nem prazo.
- A rubrica antiga aprovou a resposta A #8 apesar de um número do IPCA-15 contradito pelo IBGE; ver `docs/AVALIACAO-TEXTO-ABERTO.md` para o trecho e a fonte. Portanto, “aprovado” não significa “verificado”.
