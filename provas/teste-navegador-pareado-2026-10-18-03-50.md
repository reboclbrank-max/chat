# 🌐 Teste controlado do navegador pareado por e-mail — 2026-10-18T03:50 UTC

- veredito: **PASS**
- escopo: alias interno + URL pública sintética `https://example.com/`; não houve pessoa usuária, login, conteúdo privado ou URL com segredo.
- correlação exigida: cada resposta do Chat precisa ter `In-Reply-To` da mensagem sintética de origem; assunto sozinho não conta.
- privacidade: este relatório omite endereços, Message-IDs, referências opacas, cabeçalhos e corpos das mensagens.

## Caminho verificado

- e-mail sintético autorizado → validação/fila do Chat: sim
- navegador público isolado → estado sanitizado → devolução na mesma conversa: sim
- resumo retornado reconheceu a página pública esperada (`Example Domain`): sim
- respostas correlacionadas à thread exata: sim
- latência total observada: 3.5 min.

## Limite honesto

Esta é evidência controlada de ponta a ponta do canal e do pareamento assíncrono. Não mede satisfação humana, uso espontâneo, disponibilidade contínua nem SLA.

---
_Gerado por `tools/teste-navegador-pareado.js` via `teste-email.yml`._