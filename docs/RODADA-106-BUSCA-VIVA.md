# Rodada 106 — busca viva: portão de casamento, auditoria e ligação no produto

Continuação direta da rodada 105, onde a busca viva foi medida e **recusada**: dos 22 artigos
aceitos, 5 estavam errados (super Mario para fases da Lua, Cakewalk para receita de bolo).
Esta rodada ataca a causa — o portão de casamento — e não a fonte.

## 1. Por que a versão anterior errava

A regra aceitava qualquer resultado da busca que cobrisse **2 termos em título + resumo**. O
resumo casa por acidente: a página do jogo cita "fases", a do episódio cita "água". E o título
tinha palavras que o pedido não pediu ("Ciclo da água **subterrânea**", "Fases de **Vênus**",
"**Alimento geneticamente modificado**").

## 2. O que mudou (tudo medido, nada no escuro)

1. **Termos de busca próprios** (`termosDeBusca`): o corte de 5 letras de `termosDoPedido` servia
   de instrução ao modelo e descartava justamente as palavras que pesam numa consulta em
   português (água, rio, luz). Agora são 4 termos de conteúdo, com lista de comando de formato
   fora (três, parágrafos, escreva, lista).
2. **Plural normalizado** (`normalizarPalavra`): sociais→social, animais→animal, papéis→papel.
   Sem isso "redes sociais" não casava com o título "Rede social".
3. **Tema no título** (não no resumo): ao menos um termo do pedido precisa estar no título.
4. **Termo relacional não é tema**: "caminho", "processo", "importância" no título não contam
   como assunto — foi assim que "caminho da água" virou o artigo "Caminho" na rodada 102.
5. **Regra estrita de título**: **todas** as palavras do título precisam aparecer no pedido.
   É o que separa "Fotossíntese" (aceita) de "Ciclo da água subterrânea" e "Fases de Vênus"
   (recusadas). Custo aceito: perde artigo bom com título mais específico que o pedido.
6. **Exceção documentada para sigla** (LGPD): pergunta de termo único, sigla presente no resumo,
   artigo titulado por extenso.

## 3. Resultado na mesma lista de 36 itens

Medição de **fonte**, não de resposta (`bench/medir-fontes-vivas.js`, coleta separada em
`bench/coletar-fontes-vivas.js`):

| coluna | itens com fonte | fatos cobertos | itens completos |
|---|---|---|---|
| sem fonte (padrão do produto até aqui) | 0/36 | 0/105 | 0/36 |
| opt-in `fontes:true` (base estática) | 36/36 | 31/105 | 7/36 |
| **busca viva com portão (o que esta rodada liga)** | **15/36** | **33/105** | **9/36** |
| opt-in + viva (não é o padrão; mede o que se ganharia) | 36/36 | 49/105 | 15/36 |

**Precisão do portão: 15 artigos aceitos, 0 errados na auditoria manual — 100%.**
Auditoria item a item, com motivo e nível (exato/parcial), em
`bench/auditoria-fontes-vivas-105.json`. Os 3 "parciais" (Bactéria para "vírus x bactéria",
Água para "ciclo da água", Sabão para "como o sabão limpa as mãos") são artigos **sobre** um termo
central do pedido — não são tangenciais.

O que a versão anterior aceitava e agora é recusado antes de entrar no prompt:

| pedido | artigo antes | agora |
|---|---|---|
| por que a Lua apresenta fases | Super Mario Bros. 35 | recusado |
| três passos para um bolo simples | Cakewalk | recusado |
| efeitos da impermeabilização do solo | Educação na cidade de São Paulo | recusado |
| o que é inteligência artificial | Língua artificial | recusado |
| argumentos contra o desperdício de alimentos | Alimento geneticamente modificado | recusado |
| ciclo da água | Ciclo da água subterrânea | recusado |
| como uma bússola indica direções | Relógio de sol | Bússola ✅ |

## 4. O que foi ligado no produto

- **Ligada no navegador por padrão** para perguntas abertas explicativas; desligada em `npm test`
  e em qualquer execução offline (teste de rede não é teste). Em Node, liga com
  `CHAT_FONTE_VIVA=1` ou com `fontes:'vivo'` no pedido.
- **Respeita os dois desligamentos existentes**: `ferramentas:false` e o modo somente-local da
  página (que bloqueia o próprio `fetch`).
- **Só os termos do pedido vão para a rede**, nunca a pergunta inteira; teto de 1800 caracteres
  de trecho, 6 s por consulta, dentro do prazo do pedido.
- O trecho entra no prompt rotulado como *dado, não instrução*, com licença CC BY-SA e link; a
  resposta anota a fonte como contexto, não como verificação.

## 5. O que NÃO foi resolvido (e não estou chamando de resolvido)

As **5 falhas de fato** da régua não foram consertadas por esta rodada:

| item | falha | fonte viva agora |
|---|---|---|
| #16 água da chuva até a torneira | rio/tratamento | recusado (título "Água pluvial" tem palavra fora do pedido) |
| #13 vacina | antígeno | Vacina, cobre 1 de 2 fatos |
| #14 função em programação | parâmetro | recusado |
| #17 impactos das redes sociais | isolamento | recusado |
| #22 energia solar | painel/isolamento | Energia solar fotovoltaica, 2 de 3 |

Ter a fonte certa no contexto é **condição necessária, não suficiente**: falta o modelo usá-la, e
isso exige rodada pareada com chave. O ganho desta rodada é de pipeline — sair de **zero fontes por
padrão** para **15 itens com fonte pertinente, nenhuma errada** —, não de nota na régua.

## 6. Barreira

`npm test`: **110/110** executados (3 ignorados por pré-requisito local) — comportamento 26/26 ·
misto 34/34 · estática 50/50. Contratos novos: 12 em `fonte-viva-casamento.js` (regra de
casamento, plural, sigla, artigo tangencial) e 18 ponta a ponta em
`rota-com-chave-ponta-a-ponta.js` (inclusive: trecho chega ao provedor rotulado, resposta não vira
cópia, ferramentas desligadas vencem o pedido explícito).

## 7. Arquivos desta rodada

- `bench/coletar-fontes-vivas.js` (rede, com cache fora do versionamento)
- `bench/medir-fontes-vivas.js` (offline, quatro colunas + itens reprovados por fato)
- `bench/auditoria-fontes-vivas-105.json` (auditoria manual dos 15 aceitos)
- `bench/fontes-vivas-105.json` (resultado da medição, versionado para conferência)
- `tools/testes/fonte-viva-casamento.js` (12 contratos)
- `roteador-ia.js`: `termosDeBusca`, `normalizarPalavra`, `escolherFonte` v3,
  `fonteExternaPermitida`, `fonteVivaLigada`, `buscarFonteViva(pergunta, prazo)`
