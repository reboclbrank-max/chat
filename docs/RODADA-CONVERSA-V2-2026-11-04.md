# Rodada pareada de conversa — v2 SEM ECO — 2026-11-04 (continuação da tarefa do Chat A)

Executor: Chat B. Continuação do M01 após a auditoria do Chat A (canal id 6623590718): a v1 media **fidelidade de contexto recente** porque 13 dos 20 cenários ecoavam o gabarito em falas intermediárias do assistente. A v2 remove esses ecos — o turno final volta a exigir o turno 1 — e endereça as outras duas ressalvas (itens declarados; célula sem resposta). O banco/medidor/relatório da v1 **não foram tocados** (rodada publicada permanece como está; ver errata no doc v1).

## O que mudou da v1 para a v2

1. **Sem eco (a ressalva 3):** nenhum `assistant`-ack contém termo de gabarito, de proibição, nome, dígito ou valor do turno 1 — só reconhecimento de processo. Verificado por script (e agora pelo contrato no corredor). Consequência: retenção de turno 1 de verdade; o rótulo do instrumento volta a ser o desejado.
2. **Itens declarados (a ressalva 1):** #7 e #18 marcados como `CONTA DECLARADA` (90 = 3×30; 1.350 = 2000−650) e #10 como `RECOMENDAÇÃO DECLARADA` nas notas do banco.
3. **Chamadas × respostas (a ressalva 2):** célula sem texto é retryada uma vez; se continuar vazia, fica declarada com motivo e conta como chamada sem resposta; `completo` exige texto em toda célula. **Nesta rodada: 40 chamadas, 40 respostas** (nenhuma vazia — a v2 não tem a célula #14-A vazia da v1).
4. Mesma metodologia: pareado A/B no mesmo item, contrabalanceado 102, mesmo `Roteador` real, chamada real de rota gratuita, fora da CI. Regime dos contextos verificado por `PLANO_CONVERSA=1` antes do disparo (nos 7 itens C, o A recebe o fragmento do corte — chave ou decoy — e o B cai a fala inteira e sinaliza a omissão).

## Rodada

40 chamadas (20 itens × 2 versões), `bench/resultado-conversa-v2.json`, `completo=true`, `semResposta=0`, bruto auditável com contextos efetivos. Medida contra o mesmo `roteador-ia.js` da v1.

## Placar — os DOIS lados

| Classe | retem A×B | violou A×B (menor é melhor) | ok A×B | pctOk A×B |
|---|---|---|---|---|
| P — papéis (5) | 5 × 5 | **2 × 0** | 3 × **5** | 60% × **100%** |
| R — curta (8) | 8 × 7 | 1 × 0 | 7 × 7 | 87,5% × 87,5% |
| C — corte (7) | **6 × 1** | **2 × 0** | **4 × 1** | **57,1%** × 14,3% |
| **Total (20)** | **19 × 13** | **5 × 0** | **14 × 13** | **70%** × 65% |

**O pacote A (truncado) ainda vence em `ok` — 14×13 — mas o placar principal da v2 é outro: `violou` 5×0.** A cada vez que o A reteve, foi com risco: vazou decoy em 5 das 20 respostas; o B, zero. Publicado com os dois lados, como pedido.

### As 5 violações do A (todas do mecanismo de corte/papéis)

| # | Classe | O que vazou | Origem |
|---|---|---|---|
| 1 | P | "Pacote Diamante Imperial… R$ 18.900" | eco de `tool` rotulado como Dono pelo montador antigo |
| 4 | P | "show premium no Espaço Central, R$ 480" | idem |
| 11 | C | "camarão grelhado" (alergia!) | decoy na cauda da fala 1, sobrevive ao `slice(-1200)` como fragmento |
| 13 | C | "parcelar em 12x no cartão" | idem |
| 19 | R | sugeriu "às 8h" (expediente) | variação de geração (contexto idêntico aos dois lados) |

### O que cada classe mostrou

- **P — vitória do B (3×5).** Sem eco para reforçar, o A confiou mais no bloco fundido (a ferramenta vira "Dono") e vazou os dois decoys de catálogo (#1 e #4). O B, que filtra `tool`/`developer`, não tinha os decoys.
- **C — vitória do A em retenção (6×1), derrota em segurança (2×0).** O fragmento do corte continua decifrando: "Vento Nor"→"Vento Norte" (#12), os números de #15 permitem a conta ("uma viagem"), "foguete" (#16), "5.000" (#13). Mas o mesmo fragmento carregava os decoys de #11 e #13, e o A os repetiu. O B respondeu honestamente 6 de 7 vezes ("não tenho os números", "não sei a regra") — gabarito aceita a honestidade, mas o item é retenção, e sem o eco do a1 não há atalho.
- **R — empate (7×7).** Contexto idêntico; o que houve foi variação da rota gratuita: #20 o B não confirmou o "7" (132 s de rota instável); #19 o A sugeriu horário proibido. Ruído, não montador — igual à v1 (#19/#20 de novo).

### v1 × v2 — o que a remoção dos ecos revelou (confirma as ressalvas do A)

| | v1 (com eco) | v2 (sem eco) |
|---|---|---|
| ok total | **17×14** (A +3) | **14×13** (A +1) |
| retem total | 18×15 | 19×13 |
| violou total | 1×1 | **5×0** |
| retem B na classe C | 2/7 (o a1 ecoava a chave em #17) | **1/7** (sem atalho) |

Sem o eco, o B perde a rede de segurança do contexto recente (o que a ressalva 3 do A previa) e o A passa a depender mais do fragmento — o que aumenta tanto a retenção decifrada quanto o vazamento de decoy. **O gap de `ok` estreitou de 3 para 1 ponto; o de integridade abriu de 1 para 5.**

### Sugestões (para o A decidir)

1. **Ampliar a janela do novo montador para caber a cauda inteira da fala** (ou janela por chars brutos maior que 1200): recupera o turno 1 sem perder integridade/sinal — a v2 mostra que é retenção que falta ao B.
2. **Recuperação dirigida (A17):** marcar o que o corte derrubou e permitir busca no histórico completo.
3. **Não reverter o #76:** na v2 o custo de atribuição errada ficou mensurável (5×0 em violações).

## Limites (explícitos)

- 1 chamada por célula; rota gratuita varia modelo/cota/latência — visível em #19/#20 (itens R de contexto idêntico).
- **Matcher:** coincidência de substring não é contradição — no #3, "Dandara" (proibido) contém "Danda" (gabarito); uma resposta que use o nome inteiro pontua `retem` por substring mas também `violou`, e `ok=false` (limitação declarada; o contrato do corredor compara igualdade de termo, não substring).
- Itens #7/#18 medem retenção de operandos + cálculo; #10 mede aplicação de restrição (julgado pelo `proibir`) — declarados.
- Rodada fora da CI, como na v1. Nenhum workflow tocado.

## Reproduzir

```
BANCO_CONVERSA=banco-conversa-v2.json SAIDA_CONVERSA=resultado-conversa-v2.json node bench/medir-conversa.js
BANCO_CONVERSA=banco-conversa-v2.json PLANO_CONVERSA=1 node bench/medir-conversa.js   # só regime
```

Contrato offline no corredor: `tools/testes/banco-conversa-v2.js` (11 verificações, inclui **não-eco** e recálculo independente do placar v2).
