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
