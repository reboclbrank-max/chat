# 💬 Chat — Assistente Rebocl

Página de conversa com a **IA gratuita da Rebocl Brank**.

- **Endereço:** <https://reboclbrank-max.github.io/chat/>
- Abre no celular ou no computador. Para entrar, a página pede **um token de acesso do GitHub** (criado por você, guardado só no seu navegador — veja as instruções na própria página).
- **Não contém nenhum dado**: as conversas ficam salvas no repositório **privado** `reboclbrank-max/agente`.
- Feita em um único arquivo `index.html` (sem dependências externas), hospedada de graça no GitHub Pages.

## O que ela faz

- Lista as conversas abertas (issues do repositório privado) e **busca pelo título**.
- Cria conversa nova e envia mensagens.
- Mostra as respostas do assistente automaticamente (~1–2 min por resposta) e avisa por notificação.
- Mostra **qual motor respondeu** (tag ao lado de "Assistente") e avisa quando a internet cai.
- **Exporta e importa conversas**: tudo em JSON, tudo em texto (.md), ou só uma conversa — para guardar fora do navegador ou levar para outro aparelho.
- Por conversa: **renomear**, **fechar**, **reenviar** a última mensagem e **copiar** qualquer mensagem.
- Dica: escreva `anotar: <texto>` para guardar algo na memória permanente.

## Manutenção

Para mudar o visual ou o texto, edite `index.html` e faça commit. O GitHub Pages publica sozinho em ~1 minuto.

## v1.3 — a máquina (console + cérebro local turbinado)

- **Console da IA** (`console.html`): um painel único que mostra **tudo junto** — motores e placar, cérebro próprio, piloto automático, fila de publicação, métricas ao vivo, avisos — e manda ordens para o agente (medir, postar, ligar/desligar o piloto, `pensar:`).
- **Cérebro local com 3 modelos** para escolher: ⚡ rápido (0.5B), ⚖️ equilibrado (1.5B, padrão), 💪 pesado (3B).
- **Fallback automático:** se a internet cair, o chat liga o cérebro local sozinho.

## v1.4 — mais perto de "nunca ficar na mão"

- **Cache offline:** conversas e a lista ficam salvas no navegador (IndexedDB) — sem internet você **lê tudo** (modo offline com faixa 📦)
- **Sugestões após cada resposta:** 👎 ficou ruim (a IA aprende com seu feedback!), 💡 explique simples, 📝 resuma
- **Atalhos:** Ctrl+Enter envia · `/` foca a caixa · Esc fecha as configurações
- **Voz 100% offline:** o botão 🔊 usa a voz do próprio aparelho (Web Speech) — funciona sem internet

## v1.5 —polimento final

- **Tema claro/escuro** (☀️/🌙 nas configurações, fica salvo)
- **Arraste um arquivo** .txt/.md/.csv/.json/.html/.js/.py para a caixa de texto
- **Ctrl+N** cria conversa nova · **contador de caracteres** · **🖨️ imprimir / salvar como PDF** a conversa
- **Console v3:** mostra a **saúde dos 6 canais** (🟢/🔴) medida pelo piloto 1× por dia
