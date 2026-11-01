# Mapa do workspace — 31/10/2026 (pós-limpeza)

**Antes:** 446 MB · 7 554 arquivos (o snapshot estava estourando).
**Agora:** **52 MB · 107 arquivos**, e nada foi perdido: o que saiu era clone ou mídia reproduzível.

---

## O que está publicado (é a fonte da verdade)

| item | valor |
|---|---|
| repositório do produto | `reboclbrank-max/chat` |
| `main` | **`5cb5f62`** — *base lexical própria — o vocabulário deixa de depender de modelo (rodada 139)* |
| site | https://reboclbrank-max.github.io/chat/ — **HTTP 200** |
| casca do service worker | **`rebocl-chat-v106`** |
| base lexical | `/lexico-pt.js` — **148 930 B**, 1 502 palavras (Wikcionário pt, CC BY-SA 4.0) |
| guarda | **131/133 provas por código (0 erradas)** · armadilhas 47/47 · fio 131/131 · cobertura 43/43 · barreira 121/121 |
| relatório da última rodada | `rodada-139-soberania.md` (nesta pasta) |

Para voltar a trabalhar, **um comando**: `bash tools/clonar.sh` (clona/atualiza em `./chat`, instala `imapflow`, mostra HEAD e versão da casca).

## O que ficou no workspace (tudo pequeno e textual)

| caminho | o que é |
|---|---|
| `rodada-132…139*.md` | relatórios de fechamento de cada rodada, com os números medidos |
| `auditoria-chat-2026-10-24.md`, `auditoria-chat-qi-2026-10-31.html` | auditorias do produto |
| `proposta-corte-agente-2026-10-24.md`, `guia-cookie-itch.md` | decisões e procedimentos |
| `qi/` | medidores do QI (`medir-qi.js` → 29/29, `medir-dificil.js` → 18/18, medidores históricos) |
| `qi-bruto.json`, `qi-dificil.json` | resultado bruto das últimas medições de QI |
| `pesquisas/` | dossiês: roteador, teto dos grátis, texto aberto, visão, comparações |
| `tools/` | `clonar.sh`, `estado-repos.py`, `.token-github`, scripts de apoio |
| `arquivo/rodada-101-102/` | restos das rodadas 101–102 (sondas, patches, logs) — histórico, não se usa |
| `arquivo/logs/` | saídas de barreira antigas |
| `uploads/` | 31 imagens enviadas pelo dono (51 MB) — **dado do usuário, não se apaga** |

## O que saiu — e como voltar a ter

1. **Clones de trabalho** (`chat-work`, `site-work`, `base-work`, `motor-work`, `agente-work` — 188 MB).
   Antes de apagar, o que estava **não commitado** foi salvo como branch de resgate em cada repositório:
   `resgate/workspace-2026-10-31` em `chat` (f852deb), `site` (248e518), `base` (e920414), `motor` (ff2b2fb) — conferido por API, **HTTP 200** nos quatro.
   `agente-work` estava limpo e apenas 3 088 commits atrás: nada havia para salvar.
   Voltar: `bash tools/clonar.sh` (chat) e `python3 tools/estado-repos.py` para os demais.

2. **Cópias antigas versionadas** (`chat-101…105`, `chat-pr`, `chat-main`, `chat-v2`, `site-110…119`, `base-101…109`, `runtime101/104`, `candidato-101`, `verificacao-diff-101` — ~120 MB).
   Eram instantâneos de versões publicadas, **sem `.git`**. Conferi nome a nome contra o repositório atual: o único arquivo fora dele era `cache-fontes-vivas.json` (cache de execução, descartável).
   Voltar: qualquer versão antiga está no histórico do repositório (`git log`, tags, PRs) ou no Pages.

3. **Mídia antiga** (`antes900.mp4`, `depois900b.mp4`, `ceifalume-gameplay-*.mp4`, `prancheta-*.mp4`, ~30 PNGs de quadro/frames/grade — ~70 MB).
   Vídeos já publicados no itch/YouTube e capturas de tela de evidência de rodadas passadas.
   Voltar: `ceifalume-gameplay-publicado-28out.mp4` etc. estão nos anexos das rodadas anteriores; as telas se refazem rodando o jogo.

4. **`.npm`** (4 MB) — cache de pacote, recriado por `npm install`.

## Regra para não voltar a encher

- **Clone não é acervo.** Trabalhe em `./chat` (ou `/tmp/cl`) e clone sob demanda com `tools/clonar.sh`; não mantenha cópias por rodada.
- **Mídia não fica no workspace.** Vídeo e captura vão para o itch/YouTube/anexo da mensagem; o workspace guarda o link.
- **Relatório sim, log não.** Cada rodada deixa **um** `.md` com os números; log e sonda vão para `arquivo/`.
- **`uploads/` é do dono** e não se apaga sem ordem explícita.

## Estado honesto desta limpeza

- Nada foi empurrado em `main`: os commits de resgate vivem em branches `resgate/*`, que não alteram o produto publicado.
- O que estava publicado continua publicado e conferido hoje: `main` `5cb5f62`, Pages 200, casca `v106`.
- Não há clone do repositório dentro do workspace agora, de propósito. Se a próxima sessão chegar sem memória, ela começa por `bash tools/clonar.sh`.
