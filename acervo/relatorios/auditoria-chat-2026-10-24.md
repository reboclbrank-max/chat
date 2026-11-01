# Auditoria completa do Chat — 2026-10-24

Repositório auditado: `reboclbrank-max/chat` (público) · branch `main` = `38ece5a646f4c79c5b1a8cd8ba3d44a9a18a1d79` (2026-10-22T16:59:23Z)
Base de memória consultada: `reboclbrank-max/base@main` · Data da auditoria: 2026-10-24
Escopo: leitura, medição e execução local de testes. **Nenhuma alteração foi feita no repositório `chat`.**

---

## 1. Resumo executivo

O Chat está tecnicamente sólido no que já foi endurecido (privacidade local, guardas da Central, barreira de testes, política de Actions), mas hoje tem **um bloqueio de processo que trava a própria evolução**: `main` está protegida exigindo *1 aprovação humana de PR* com `enforce_admins`, sem bypass, e não existe um segundo humano nem PR aberto em toda a história do repositório. O GitHub não permite que o autor aprove o próprio PR. Ou seja: **a única via documentada de mudança (PR revisado) e a via declarada de rollback ("reverter exige PR humano revisado pela própria proteção") não são executáveis hoje por uma pessoa sozinha.**

A prova disso está no próprio repo: existe uma **cadeia de 8 commits de melhorias de 22/10 parada em 6 ramos `melhorias/*`**, verde em 87/87 testes locais, sem destino — e todas as automações passaram a escrever somente em `estado/operacional`.

Fora isso, os problemas são de manutenção e de robustez, não de segurança grave:

| # | Achado | Severidade | Esforço |
|---|---|---|---|
| A1 | `main` sem caminho executável de mudança (autoaprovação impossível, sem bypass, 0 colaboradores) | **Crítica (processo)** | Baixo |
| A2 | Cadeia de melhorias verde (87/87) parada fora de `main` há 2 dias | **Alta** | Baixo |
| A3 | Sem `package.json`/lockfile/Dependabot — dependências transitivas livres rodam com segredos de e-mail | **Alta** | Baixo |
| A4 | Mega-arquivo de 550 KB × 4 cópias divergentes (297 comandos, 225 funções, linha de 12.465 caracteres) | **Alta** | Alto |
| A5 | CSP mínima (só `base-uri`/`object-src`/`form-action`) com 42 pontos de `innerHTML` | Média | Médio |
| A6 | 163 `catch` vazios + 308 `fetch` → falhas de motor invisíveis ao usuário | Média | Médio |
| A7 | 58 dos 81 testes são só `grep` estático; nenhuma medição de cobertura | Média | Médio |
| A8 | Turno de e-mail de ~346 min × 4/dia, com reinstalação de ~40 pacotes Python por turno | Média | Médio |
| A9 | Documentação defasada (`base` registra casca v87; código em v88) e `pendencias.md` contradiz o registro de 22/10 | Baixa | Baixo |
| A10 | `reboclbrank@gmail.com` aparece 15× em repositório público | Baixa | Baixo |
| A11 | Nenhuma métrica de produto sanitizada (só provas técnicas) | Baixa | Médio |

---

## 2. Como a auditoria foi feita

1. Leitura da memória oficial (`CONTEXTO-FIXO.md`, `README.md`, `guia-do-proximo-chat.md`, `pendencias.md`, última entrada de `registro-de-decisoes.md`).
2. Metadados via API do GitHub: repositório, branches, PRs, proteção de `main`, política de Actions, segredos (apenas nomes), Pages, alertas de vulnerabilidade, 300 execuções de workflow.
3. Cópia de trabalho rasa (`--depth 1`, depois `--depth 50`) para leitura de código, workflows e testes.
4. Execução local da barreira completa (`tools/testes/roda-testes.js`) em `main` e no ramo de melhorias, com dependências instaladas fora do repositório (`imapflow@2.4.3`, `nodemailer@10.1.1` em `/tmp`), sem tocar em caixa de e-mail, produção, segredo ou `main`.
5. Medições de código (tamanho, compressão, funções, comandos, `fetch`, `catch`, `innerHTML`) por script local.
6. Leitura de log de execução real (`actions/runs/39771147946/logs`) para confirmar a causa da única falha da barreira no período.

---

## 3. Estado verificado (fatos)

### 3.1 Repositório e governança
- Público, 4,4 MB, 262 entradas na árvore, **15 workflows**, **82 arquivos de teste**.
- `main` protegida (API `branches/main/protection`): check obrigatório `testes` com `strict: true`; **1 aprovação de PR obrigatória**; `dismiss_stale_reviews`; `required_conversation_resolution`; **`enforce_admins: true`**; force-push e deleção bloqueados; histórico linear **não** exigido; `rulesets` vazio; **sem allowance de bypass**.
- **0 pull requests em toda a história** (`pulls?state=all` → 0). **0 colaboradores.**
- Branches: `main`; `estado/operacional` (42 commits à frente, escrita dos bots); 6 ramos `melhorias/*-20261022` (1 a 8 commits à frente).
- Actions: `allowed_actions: selected`, `sha_pinning_required: true`, token padrão `read`. 5 segredos (nomes): `CHAT_DONO`, `GMAIL_CHAT_ADDR`, `GMAIL_CHAT_PASS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PAREAR`.
- Pages: build `legacy` em `main:/`, HTTPS forçado. Alertas de vulnerabilidade: **404 (desativado)**.

### 3.2 Execuções (janela 2026-10-21T04:33 → 2026-10-24T06:15, 300 runs)
| Workflow | Runs | Conclusão | Duração |
|---|---|---|---|
| Vigia da casa | 155 | 152 ok, 2 falhas | mediana 1,0 min |
| Chat por email | 44 | 30 ok, 13 cancelados, 1 em curso | mediana 22,3 min; turnos longos 345,6–346,7 min |
| Pages build | 66 | 65 ok, 1 cancelado | mediana 0,45 min |
| Testes rápidos (barreira) | 32 | 31 ok, 1 falha | mediana 3,6 min |
| Evolução | 3 | 3 ok | 0,8 min |

- A única falha da barreira (run `39771147946`, 22/10 11:30, SHA `36896b3e`) foi real: `reforco-dossie-controlado.js` 12/13 — "arquivo substituído depois da leitura bloqueia antes do relatório — Missing expected exception". Corrigida em `eb7b328` (12:09). **Esse commit vermelho entrou em `main` porque o push direto não era barrado; a proteção só vale para PR.**
- 13 turnos de e-mail cancelados = efeito colateral do desenho de sucessão/reserva entre turnos, não erro de produto.

### 3.3 Testes — resultado real desta auditoria
| Estado | Resultado | Observação |
|---|---|---|
| `main` sem dependências | 80/85 | 5 falhas **ambientais** (`Cannot find module 'imapflow'`), não defeitos |
| `main` com `imapflow`+`nodemailer` | **84/84** + 2 SKIPs | SKIPs por ausência local de `pdftotext`/`tesseract` |
| Ramo `melhorias/automacao-capacidade-marketing-maximo-20261022` | **87/87** + 2 SKIPs | +3 suítes novas em relação a `main` |

Conclusão: **a barreira é confiável e o ramo pendente está verde.** O rótulo "85/86" ou "80/85" que aparece em registros antigos é efeito de ambiente, não regressão — vale corrigir a redação na memória para não gerar alarme falso.

### 3.4 Código e interface
- `index.html`: **549.979 B** (140.758 B gzip), 4.176 linhas, **225 funções**, maior linha **12.465 caracteres**, **308 `fetch`**, **297 comandos `!`** únicos (540 ocorrências), **163 `catch` vazios** (118 no formato `catch (e) {}`), 42 `innerHTML`, 7 `insertAdjacentHTML`, 0 `eval`, 0 `document.write`.
- Quatro páginas quase idênticas: `index.html`, `direto.html`, `ligar.html`, `limpar.html` (549,9 kB / 547,3 kB / 548,2 kB / 550,6 kB). Diferença entre `index` e cada uma: **37 a 60 linhas**.
- PWA: `sw.js` versão **`rebocl-chat-v88`**, casca de 16 arquivos, sem ativação silenciosa; `manifest.json` com ícones 192/512. A `base` ainda registra `rebocl-chat-v87` (**defasagem**).
- CSP em meta: `base-uri 'self'; object-src 'none'; form-action 'self'` — **sem `default-src`, `script-src` ou `connect-src`**.
- Higiene de saída já correta: `escapar()` antes de qualquer substituição de Markdown, imagem remota só por clique, `rel="noopener noreferrer"` + `referrerpolicy="no-referrer"`, limite de 60.000 caracteres por mensagem.
- Token: `localStorage`/`sessionStorage` (`assistente_rebocl_token`), conforme autorização registrada; `?t=` e `!token` bloqueados.

### 3.5 Cadeia de melhorias parada (o que está pronto e não está em `main`)
`melhorias/operacao-segura-20261022` → `portabilidade-verificavel` → `pwa-fallback-preciso` → `foco-automacao-capacidade` → `p2` → `automacao-capacidade-marketing-maximo`
36 arquivos, **+823 / −108**. Conteúdo:
- `.github/PULL_REQUEST_TEMPLATE.md` (preparação do fluxo de PR);
- `POLITICA-RETENCAO-OPERACIONAL.md`, `OPERACAO-INCIDENTES.md`, `PORTABILIDADE-ESTATICA.md`;
- `tools/inventario-estado-operacional.js` + 3 suítes novas (`portabilidade-estatica.js`, `inventario-estado-operacional.js`, `operacao-incidentes.js`);
- correção do fallback offline da casca PWA, `sw.js`, `chat-comandos-locais.js`, `tools/email-chat.js`, `tools/vigia-casa.js`, `tools/indice-capacidade.js` e ajustes de testes/continuidade.

---

## 4. Achados detalhados

### A1 — `main` sem caminho executável de mudança · CRÍTICA (processo)
**Evidência:** proteção exige `required_approving_review_count: 1` + `enforce_admins: true` + ausência de `bypass_pull_request_allowances`; 0 colaboradores; 0 PRs na história; o próprio registro de 22/10 afirma "reverter código exige PR humano revisado pela própria proteção". O GitHub **não permite que o autor aprove o próprio PR** e `enforce_admins` impede push administrativo. Resultado: nem avanço nem rollback de código por caminho documentado.
**Por que importa:** a cadeia verde de 22/10 e qualquer correção futura ficam sem destino; o rollback declarado é inexecutável; a tendência é acumular ramos e contornar a proteção no futuro — exatamente o que a decisão queria evitar.
**Correção recomendada (escolher uma, com registro):**
- **(b) preferida:** `required_approving_review_count = 0`, mantendo `strict` no check `testes`, `dismiss_stale_reviews`, `required_conversation_resolution`, force-push e deleção bloqueados. O gate automático (barreira verde + tudo atualizado) continua valendo; o gate humano passa a ser disciplina declarada, não impossibilidade técnica.
- **(a) alternativa:** manter 1 aprovação e habilitar bypass **nominal e reversível** só para a conta do dono (`bypass_pull_request_allowances`), documentando no repo que o bypass é individual e auditável.
- **(c) terceira via:** registrar uma segunda conta/identidade de revisão (mais peças para manter; não recomendo no R$ 0 e solo).
**Validação:** abrir um PR trivial de teste (ex.: comentário em doc), confirmar que ele consegue ser mesclado, e registrar o resultado. **Reversão:** reaplicar a configuração anterior em uma chamada de API.
**Não executei nada disso:** é mudança de configuração de segurança e exige sua ordem explícita.

### A2 — Cadeia de melhorias verde, parada fora de `main` · ALTA
**Evidência:** os 6 ramos existem desde 22/10; `melhorias/automacao-...` roda **87/87** localmente (contra 84/84 de `main`); não há PR aberto.
**Risco:** trabalho apodrecendo sobre `main` que avança (o turno de e-mail mexe em `tools/email-chat.js`), perda de contexto e retrabalho de merge.
**Correção:** depois de destravar A1, abrir **um** PR com a cadeia inteira (ou 2 PRs: docs/testes e correção PWA), revisar o diff, rodar a barreira e mesclar. Se algo não for para frente, apagar o ramo **com registro** do motivo.
**Validação:** `testes` verde no PR + `git log main..ramo` vazio depois do merge. **Reversão:** revert do merge commit (preservando `estado/operacional`).

### A3 — Sem lockfile, sem alerta de dependência · ALTA
**Evidência:** não existe `package.json`/`package-lock.json`; 8 workflows fazem `npm install --no-save imapflow@2.4.3 nodemailer@10.1.1`; `vulnerability-alerts` responde 404.
**Risco:** a versão direta está fixada, mas **as transitivas não** (imapflow puxa `libmime`, `iconv-lite`, `@zone-eu/mailsplit`…). Essas dependências rodam dentro do turno que tem `GMAIL_CHAT_PASS` e acesso IMAP/SMTP — comprometimento de uma transitiva = acesso à caixa.
**Correção:** criar `package.json` + `package-lock.json` (lock v3), trocar `npm install --no-save` por `npm ci --omit=dev` nos 8 workflows, ativar Dependabot (alertas + PRs semanais para `imapflow`/`nodemailer`) e rodar `npm audit` na barreira.
**Validação:** `npm ci` reproduz o mesmo lock nos 8 workflows; barreira verde; `npm audit --omit=dev` sem altas/críticas (ou com exceção registrada). **Reversão:** manter `npm install --no-save` como plano B por um ciclo.

### A4 — Mega-arquivo × 4 cópias · ALTA (manutenção)
**Evidência:** 550 kB, 4.176 linhas, 225 funções, 297 comandos, maior linha 12.465 caracteres; 4 páginas com diff de 37–60 linhas entre si.
**Risco:** toda mudança de UI/comando tem de ser feita 4 vezes; a divergência já é visível (tamanhos diferentes); revisão de linha de 12 mil caracteres é inviável — foi exatamente aí que nasceu o defeito de 22/10 (reforço do dossiê).
**Correção faseada (não fazer tudo de uma vez):**
1. Extrair `chat-nucleo.js` (estado, storage, rede, utilidades), `chat-comandos.js` (catálogo + execução), `chat-motores.js` (lista de provedores), `chat-render.js` (markdown/bolha) — as quatro páginas passam a ser HTML fino + `<script src>`.
2. `sw.js` já cacheia por caminho; adicionar os novos arquivos à casca **com incremento de versão**.
3. Teste de contrato comparando as 4 páginas (mesmo conjunto de `<script>` e mesmas âncoras de layout), para impedir divergência silenciosa.
4. Só então quebrar as linhas gigantes (formatador + teste de tamanho máximo de linha, ex.: 400 caracteres, com lista de exceções).
**Validação:** as 4 rotas com o mesmo comportamento; barreira 87/87; smoke visual no harness Chromium já existente. **Reversão:** manter `main` intacta por PR pequeno e reversível por PR.

### A5 — CSP mínima · MÉDIA (defesa em profundidade)
**Evidência:** meta CSP só com `base-uri`, `object-src`, `form-action`; 42 `innerHTML` + 7 `insertAdjacentHTML`; conteúdo de Issue externa é renderizado.
**Correção:** CSP com `default-src 'none'`, `script-src 'self' 'unsafe-inline'` (necessário por ora, dado o arquivo único), `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`, `connect-src` limitado aos ~20 domínios realmente usados (pollinations, nvidia.g4f.dev, ovh, llm7, kilo, glama, wikipedia/wikidata/wikivoyage, open-meteo, hn/algolia, coingecko, themealdb, translate.googleapis, thesportsdb, github api…), `frame-ancestors 'none'`, `base-uri 'none'`. Fazer em modo `Content-Security-Policy-Report-Only`-equivalente primeiro (teste local com o harness que já bloqueia rede) e depois efetivar.
**Validação:** teste estático que verifica a presença de cada diretiva + execução no Chromium controlado sem erro de console de violação de CSP nas 4 rotas. **Reversão:** voltar à meta anterior (uma linha).

### A6 — Falhas silenciosas · MÉDIA
**Evidência:** 163 blocos `catch` vazios (118 `catch (e) {}`) e 308 `fetch`; diversos comandos usam `AbortSignal.timeout(800)` — 0,8 s é curto para endpoints gratuitos e o usuário só vê "asas mudas".
**Correção:** (1) contador local, sanitizado, de falhas por motor (`rebocl_diag`), exibido em `!status` — nome do motor, código, tempo, sem conteúdo de conversa; (2) mensagem de erro curta e acionável ("motor X fora, tente Y"); (3) teste que proíbe `catch` vazio novo em blocos de rede; (4) revisar timeouts de 800 ms para 3–5 s, com fallback imediato.
**Validação:** teste de contrato do contador + execução com motores falsos (`simula-caixa.js`). **Reversão:** recurso local, sem migração.

### A7 — Cobertura de teste enganosa · MÉDIA
**Evidência:** 58 de 81 suítes leem o fonte e fazem `assert` de texto (`grep` estático); 4 mistas; 19 exercitam módulo de fato; **nenhuma medição de cobertura**.
**Risco:** números altos ("54/54 acessibilidade", "22/22") dão sensação de cobertura comportamental que não existe; o defeito de 22/10 apareceu justamente numa área de teste de comportamento.
**Correção:** (1) etiquetar cada suíte como `estatica` ou `comportamental` no `roda-testes.js` e publicar o placar separado; (2) converter as 10 suítes mais críticas (`central-operacional`, `reforco-dossie-controlado`, `estado-operacional-controlado`, `workspace-*`, `pwa-atualizacao-segura`) para comportamento com dublês; (3) medir cobertura de `chat-comandos-locais.js`, `chat-organizacao-local.js`, `chat-colecoes-local.js` com `c8` (sem meta arbitrária — só publicar o número).
**Validação:** nova saída do `roda-testes.js` mostrando as duas colunas. **Reversão:** trivial.

### A8 — Turno de e-mail longo e caro em tempo · MÉDIA
**Evidência:** job `turno` com `timeout-minutes: 350`; duração real 345,6–346,7 min; 4 turnos por dia (cron `7 */6` + reserva `17,47`); cada turno reinstala ~40 pacotes Python (`numpy`, `opencv`, `vosk`, `pywhispercpp`…) e restaura o cache do modelo de visão.
**Risco:** o "24h vivo" depende de encadear turnos de 5h45; qualquer atraso de fila abre janela sem leitor; 13 cancelamentos em 3 dias mostram a fricção; cada turno paga cold-start de dependências.
**Correção:** (1) cachear `pip` em venv versionado por hash do bloco de instalação (ganho estimado de vários minutos por turno); (2) cachear o modelo de visão com a mesma chave de hoje + `restore-keys`; (3) reduzir `timeout-minutes` para ~240 e fazer a reserva reagendar cedo, reduzindo a cauda de 6 h; (4) publicar a duração do cold-start no `email-log` sanitizado para medir o ganho.
**Validação:** medir antes/depois pelo tempo do job nos metadados (sem ler conteúdo). **Reversão:** reverter o workflow.

### A9 — Memória defasada · BAIXA
- `base/guia-do-proximo-chat.md` diz casca `rebocl-chat-v87`; `sw.js` está em **v88**.
- `base/pendencias.md` mantém aberto "Proteção de `chat/main` e deploy … a aplicação foi corretamente parada", mas o registro de 22/10 diz que **a proteção foi aplicada**. Hoje a proteção existe e as automações escrevem em `estado/operacional`.
- Rótulos antigos "85/86" / "corredor não verde" descrevem **ambiente**, não regressão (hoje 84/84 com dependências).
**Correção:** uma entrada de sincronização documental. **Não corrigi** porque a instrução foi auditar, não alterar a memória.

### A10 — E-mail pessoal em repositório público · BAIXA
`reboclbrank@gmail.com` aparece 15 vezes no repo público (o log `email-log.md`, por outro lado, já mascara: `bog***+alias@gmail.com` — padrão correto). **Correção:** aplicar o mesmo mascaramento onde o endereço completo aparece em docs e testes públicos.

### A11 — Sem métrica de produto · BAIXA
Há provas técnicas excelentes, mas nenhum agregado sanitizado de uso: respostas/dia, falhas por motivo, latência mediana por motor, anexos processados. **Correção:** `estado/operacional/metricas.json` gravado pelo turno com **somente agregados** (contadores, tempos, nomes de motor) — nunca conteúdo, remetente ou assunto. Alimenta `status:` e permite dizer "melhorou" com número.

---

## 5. Plano recomendado (ordem de execução)

| Fase | O que | Depende de | Risco | Tempo estimado |
|---|---|---|---|---|
| **1** | Destravar A1 (decidir e aplicar a configuração de revisão) | sua decisão explícita | baixo | 15 min |
| **2** | Promover a cadeia `melhorias/*` por PR (A2) | fase 1 | baixo | 1 h |
| **3** | `package-lock` + `npm ci` + Dependabot + `npm audit` (A3) | fase 2 | baixo | 1–2 h |
| **4** | Sync documental: v88, pendencias, rótulos de teste (A9) + mascarar e-mail (A10) | fase 2 | nulo | 30 min |
| **5** | Diagnóstico de motor + fim dos `catch` vazios + timeouts (A6) | fase 2 | médio | 3–4 h |
| **6** | CSP endurecida (A5) | fase 5 | médio | 2–3 h |
| **7** | Caches do turno de e-mail + timeout 240 min (A8) | fase 5 | médio | 2 h |
| **8** | Placar estático × comportamental + cobertura `c8` (A7) | fase 2 | baixo | 3 h |
| **9** | Extração do núcleo em módulos + fim das 4 cópias (A4) | fases 5–8 | **alto** | 1–2 semanas em cortes |
| **10** | `metricas.json` sanitizado (A11) | fase 5 | baixo | 2 h |

Regra para todas as fases: **um PR, um assunto**, barreira verde, documentação no mesmo PR (o `continuidade.js` já exige), rollback declarado antes de mesclar.

---

## 6. O que eu recomendo NÃO fazer agora
- Não ampliar a Central (executor genérico, shell, PR automático, promoção para `main`) para compensar o bloqueio de A1 — resolveria o sintoma criando o risco que a decisão de 22/10 queria evitar.
- Não remover a proteção de `main` "para andar mais rápido" — a fase 1 já devolve o caminho com o gate automático preservado.
- Não refatorar as 4 páginas antes de A3/A5/A6 (a refatoração sem rede de segurança comportamental é a maior chance de regressão do projeto).
- Não aumentar a quantidade de comandos `!` (297) antes de haver catálogo canônico e teste de contrato — hoje já não há verificação de "todo comando existe e está documentado".

---

## 7. Limites desta auditoria
- Não li `CONTINUIDADE.md` (419 kB) integralmente nem todo o `email-chat.js` linha a linha; a leitura foi dirigida pelos sintomas medidos.
- Não abri caixa de e-mail, não enviei mensagem, não disparei workflow, não criei ramo, PR, segredo, conta ou custo.
- Não testei em aparelho real, nem em Chromium (não há navegador neste ambiente); acessibilidade foi verificada apenas pelos contratos existentes.
- 2 SKIPs da barreira (PDF e OCR) são ausência de `pdftotext`/`tesseract` **neste ambiente**, não defeito.
- Números de duração e falha vêm dos metadados do GitHub; ausência de falha observada não é prova de disponibilidade ou SLA.

---

## 8. Anexo — comandos de verificação (reproduzir)

```bash
# proteção de main
curl -s -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/reboclbrank-max/chat/branches/main/protection

# há algum PR na história?
curl -s -H "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/repos/reboclbrank-max/chat/pulls?state=all&per_page=100"

# barreira local (com dependências fora do repo)
mkdir -p /tmp/deps && (cd /tmp/deps && npm i --no-save imapflow@2.4.3 nodemailer@10.1.1)
git clone --depth 1 https://github.com/reboclbrank-max/chat.git /tmp/chat && cd /tmp/chat
NODE_PATH=/tmp/deps/node_modules node tools/testes/roda-testes.js

# comparar com o ramo de melhorias
git fetch --depth 50 origin melhorias/automacao-capacidade-marketing-maximo-20261022
git checkout origin/melhorias/automacao-capacidade-marketing-maximo-20261022
NODE_PATH=/tmp/deps/node_modules node tools/testes/roda-testes.js
```

---

*Auditoria somente-leitura. Nenhum arquivo do `chat` foi alterado; nenhuma pendência da memória foi executada.*
