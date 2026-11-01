# MAPA-WORKSPACE — fim da limpeza (31/10/2026)

**O workspace deixou de ser acervo.** Ele agora é só uma **área de pouso**: o mapa e as ferramentas
de retorno. Todo o conteúdo está em repositório do GitHub, versionado, com URL.

| momento | tamanho | arquivos |
|---|---|---|
| antes de limpar | 446 MB | 7 554 |
| meio da limpeza | 56 MB | 301 |
| **agora** | **< 100 KB** | **6** (este mapa + 5 em `tools/`) |

---

## Onde cada coisa mora

### 1. `reboclbrank-max/chat` → pasta `acervo/` (branch `main`, commit **`08d2586`**)
74 arquivos, 852 KB, tudo textual e verificável:

| caminho | conteúdo |
|---|---|
| `acervo/INDICE.md` | índice do acervo e o que ficou de fora, com motivo |
| `acervo/relatorios/` | fechamento das rodadas **132 a 139**, auditorias, proposta de corte do agente, guia do cookie do itch |
| `acervo/pesquisas/` | dossiês: roteador, teto dos grátis, texto aberto, visão e latência, comparações |
| `acervo/qi/` | medidores (`medir-qi.js` 29/29, `medir-dificil.js` 18/18) e resultados brutos |
| `acervo/arquivo/` | logs de barreira e restos das rodadas 101–102 (consulta, não uso) |

Conferido arquivo por arquivo com **hash de blob do git**: os 72 arquivos de conteúdo do workspace
são **byte a byte iguais** aos commitados — nada foi apagado antes de estar salvo.

### 2. `reboclbrank-max/acervo` — repositório **privado**, criado hoje
As **31 imagens (51 MB)** enviadas pelo dono (capturas de tela do chat no celular e fotos de uso real).
São dado do dono: ficam em repositório privado, não no repositório público do produto.

### 3. Branches de resgate (trabalho não commitado dos clones antigos)
`resgate/workspace-2026-10-31` → `chat` `f852deb` · `site` `248e518` · `base` `e920414` · `motor` `ff2b2fb`.
Nada foi empurrado em `main` por elas: o produto publicado não mudou.

### 4. O que foi descartado, e como voltar
- **Clones de trabalho** (188 MB) → `bash tools/clonar.sh` reconstrói.
- **Cópias antigas de versões publicadas** (`chat-101…105`, `site-110…119`, `base-101…109`, 120 MB) →
  estavam sem `.git`; confira nome a nome: o único arquivo fora do repositório era um cache descartável.
  Qualquer versão antiga está no histórico do git ou no Pages.
- **Mídia** (mp4/png de evidência, ~70 MB) → já publicada no itch/YouTube; os números estão em `acervo/relatorios/`.
- **`.npm`** (4 MB) → volta com `npm install`.

## Estado do produto (não mudou nesta limpeza)

| item | valor |
|---|---|
| `main` | **`08d2586`** (o commit anterior de produto foi `5cb5f62`, rodada 139) |
| site | https://reboclbrank-max.github.io/chat/ — **200** |
| casca | **`rebocl-chat-v106`** |
| guarda | 131/133 provas por código (0 erradas) · armadilhas 47/47 · cobertura 43/43 · barreira 121/121 · QI 29/29 · difícil 18/18 |

## Como voltar a trabalhar (sem memória nenhuma)

```bash
bash tools/clonar.sh            # clona o chat em ./chat, instala imapflow, mostra HEAD e casca
cd chat && node tools/testes/razao-local.js && node tools/testes/lexico-local.js
node tools/auto-melhoria.js --fio=400      # guarda
```
O acervo inteiro está em `chat/acervo/` — comece por `acervo/INDICE.md`.

## Regra para não encher de novo

Clone não é acervo · mídia não fica aqui · relatório vai para `acervo/relatorios/` **no repositório** ·
imagem do dono vai para o repositório privado `acervo` · `uploads/` só existe durante a rodada.
