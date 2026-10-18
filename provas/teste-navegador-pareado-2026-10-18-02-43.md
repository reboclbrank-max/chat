# 🌐 Teste controlado do navegador pareado por e-mail — 2026-10-18T02:43 UTC

- veredito: **FALHOU**
- escopo: alias interno + URL pública sintética `https://example.com/`; não houve pessoa usuária, login, conteúdo privado ou URL com segredo.
- correlação exigida: cada resposta do Chat precisa ter `In-Reply-To` da mensagem sintética de origem; assunto sozinho não conta.
- privacidade: este relatório omite endereços, Message-IDs, referências opacas, cabeçalhos e corpos das mensagens.

## Caminho verificado

- e-mail sintético autorizado → validação/filamento do Chat: não
- navegador público isolado → estado sanitizado → devolução na mesma conversa: não
- resumo retornado reconheceu a página pública esperada (`Example Domain`): não
- respostas correlacionadas à thread exata: não
- latência total observada: indisponível (não houve retorno final verificável na janela).

## Limite honesto

Esta é evidência controlada de ponta a ponta do canal e do pareamento assíncrono. Não mede satisfação humana, uso espontâneo, disponibilidade contínua nem SLA.

---
_Gerado por `tools/teste-navegador-pareado.js` via `teste-email.yml`._