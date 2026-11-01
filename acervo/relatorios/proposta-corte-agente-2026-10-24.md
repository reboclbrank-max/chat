# Corte aplicado no repositório `agente` — 2026-10-24

> **STATUS: APLICADO.** `agente@dee07f1e5ae1a73cd21b20394bd275ba2aa91063` (push confirmado) + 8 workflows
> manuais desativados. Registro na memória oficial: Decisão 453 (`base/main` = `75de6fcbaa60fdaae0ae69cc2e6ae4b522cd9b9b`).
> O que **não** foi e não pode ser feito por mim: Billing & plans — sem isso o `agente` continua parado.

> Leitura apenas. **Nada foi alterado no `agente`**: 32 workflows lidos, frequências extraídas do
> próprio YAML e consumo estimado a partir dos runs de outubro. Nenhum segredo, conversa ou
> conteúdo privado foi copiado para cá — só nomes de workflow, cron e minutos.

## 1. O diagnóstico

O cérebro do Chat (`reboclbrank-max/agente`, privado) **não roda desde 12/10/2026**. O último
sucesso de qualquer rotina foi em **11/10 às 22:48 UTC**; o primeiro run de 12/10 (00:36) já
falhou sem executar um único passo.

A mensagem que o próprio GitHub registra em cada run é esta, literal:

> "The job was not started because recent account payments have failed or your spending limit
> needs to be increased. Please check the 'Billing & plans' section in your settings"

Consequências medidas:

| Fato | Número |
|---|---|
| Workflows ativos | 32 (15 com `schedule`) |
| Dias bloqueados | **13** (de 12/10 a 24/10) |
| Runs bloqueados no período | centenas, todos com **0 passos** |
| O que continua vivo | o turno de e-mail e o vigia do `chat` (público, minutos grátis) |

Não é bug de código, não é workflow quebrado, não é a política de Actions endurecida em 22/10:
as únicas ações usadas nos 32 workflows são `actions/checkout` e `actions/setup-python`, ambas
GitHub-owned e permitidas.

## 2. Por que o limite estourou (estimativa)

Repositório privado consome minutos do plano (o público `chat` não consome). Somando a duração
média de sucesso de cada rotina agendada:

**≈ 42,9 min/dia ≈ 1.290 min/mês** só de cron. Em outubro, até o bloqueio, os runs registraram
**≈ 1.330 min** — coerente com o teto gratuito de **2.000 min/mês** para conta pessoal, ainda mais
somando os workflows disparados por `push` e por `workflow_dispatch`.

Os cinco maiores consumidores do mês (medido, antes do bloqueio):

| Workflow | Runs em out/2026 | Minutos | Observação |
|---|---|---|---|
| `estudo` | 30 | **538** | ~18 min por execução, manual |
| `testes` | 250 | **316** | roda em `push`; 135 falharam |
| `melhoria-continua` | 85 | 96 | cron 6×/dia |
| `piloto automatico` | 88 | 78 | cron **8×/dia** |
| `confirmar-contas` | 41 | 77 | manual |

## 3. Proposta — três níveis, do mais seguro ao mais agressivo

### Nível 1 — reduzir frequência (não tira nenhuma função)

| Workflow | Hoje | Proposto | Economia |
|---|---|---|---|
| `piloto automatico` | 8×/dia (`0 */3`) | 4×/dia (`0 */6`) | −11,2 min/dia |
| `checkup` | 6×/dia (`45 */4`) | 2×/dia (`45 */12`) | −2,4 min/dia |
| `melhoria-continua` | 6×/dia (`7 */4`) | 2×/dia (`7 */12`) | −2,0 min/dia |
| `batente` | 4×/dia (`9 */6`) | 2×/dia (`9 */12`) | −0,4 min/dia |

**Economia: ≈ 16 min/dia ≈ 480 min/mês (−37%).** Nada deixa de existir: tudo continua rodando,
só com menos repetição. O `piloto` sozinho é mais da metade do consumo diário.

### Nível 2 — parar o `testes` de rodar em todo push

Hoje: **250 runs em 24 dias (~10/dia), 316 min, e 135 delas falharam**. Rodar em `pull_request`
e `workflow_dispatch`, mantendo `push` apenas em `main`.

**Economia: ≈ 260–300 min/mês.** Com o Nível 1, o consumo cairia de ~1.290 para ~550 min/mês —
folga confortável dentro dos 2.000 min gratuitos.

### Nível 3 — pausar a exploração até haver orçamento

Estes já são **manuais** (`workflow_dispatch`): não gastam por cron, mas cada uso custa caro.
Deixá-los **desativados** (estado `disabled_manually`, reversível com um clique) até o mês virar:

- `estudo` (18 min por disparo)
- `caca-motores`, `caca-motores (varredura keyless)`, `prova-de-fogo`
- `testa-gh`, `testa chaves groq`, `testa-llm7`, `testa-models-github`, `testa-ferramentas`
- `sonda-bsky`, `confirmar-contas`, `eco-devlog`

Nada é apagado: reativar é imediato e não muda código.

## 4. O que NÃO deve ser cortado

`Assistente Rebocl (vigia)` (4×/dia), `Rotinas do Assistente` (2×/dia), `bom-dia`, `diario`,
`sonho`, `espelho da memoria`, `Manutenção da memória`, `Banco de dados`, `relatorio-semanal`.
É o que mantém a casa acordada e a memória íntegra — cortar isso economiza pouco e custa função.

## 5. O que foi aplicado (24/10, 18:27 UTC)

- **Nível 1 (cron):** `piloto` 8→4×/dia · `checkup` 6→2×/dia · `melhoria-continua` 6→2×/dia · `batente` 4→2×/dia.
- **Nível 2 (gatilho):** `testes` ignora push que só mexe em `MEMORIA/**` ou `provas/**`.
- **Nível 3 (estado):** 8 workflows manuais de diagnóstico desativados (`caca-motores`, `prova-de-fogo`, `sonda-bsky`, `testa-ferramentas`, `testa-gh`, `testa chaves groq`, `testa-llm7`, `testa-models-github`). Reativar: `PUT /repos/reboclbrank-max/agente/actions/workflows/<id>/enable`.
- **Mantidos ativos de propósito:** `estudo`, `confirmar-contas`, `eco-devlog` (produzem conteúdo/estado; só custam quando chamados).
- **Verificação:** `teste-workflow-seguranca.py` PASSOU; 32 YAML válidos; o push disparou `testes`, que falhou de novo com a mesma anotação de cobrança e 0 passos — prova de que o corte não destrava nada.

## 6. Limites desta proposta

- **Nada disso desbloqueia o `agente` hoje.** O bloqueio é de cobrança: só sai em
  **Billing & plans** (pagamento pendente ou limite de gastos). Reduzir frequência evita que o
  limite estoure de novo — não substitui o destrave.
- O consumo é **estimativa** a partir de duração de runs de sucesso; não é fatura.
- Mudar workflow no `agente` **não pode ser validado por execução** enquanto as Actions estiverem
  bloqueadas. Por isso a proposta usa apenas **cron, gatilho e estado** — nenhuma linha de lógica,
  nenhum segredo, nenhum caminho de arquivo.
- A `base` não recomenda mexer no `agente` por reflexo de tarefa do `chat`; qualquer alteração ali
  exige a sua palavra explícita.

## 7. O que depende de você

1. **Billing & plans** no GitHub: resolver pagamento pendente ou ajustar o limite de gastos.
   Isso é gasto — decisão sua, fora do meu alcance.
2. **Autorização explícita** para eu editar `.github/workflows/*` do `agente` (só frequência,
   gatilho e estado; com o que reversível significa aqui documentado antes do commit).
