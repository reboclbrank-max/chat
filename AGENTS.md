# Instruções permanentes para quem continuar o Chat

Este repositório tem automações ativas, uma interface pública e integrações que usam segredos fora do código. Trabalhe somente mediante uma tarefa explícita do dono.

## Leitura obrigatória antes de mudar algo

1. Leia [`CONTINUIDADE.md`](CONTINUIDADE.md) inteiro.
2. Confira `main` remoto, o estado da cópia e as instruções/estado atuais em `reboclbrank-max/base`.
3. Leia apenas os arquivos técnicos necessários à tarefa. Não rode pendências, marketing, posts, medições ou publicações por iniciativa própria.

## Regra de salvamento obrigatório

Se uma alteração autorizada mudar comportamento, segurança, canal, workflow, dependência, teste, arquivo-chave ou capacidade do Chat, atualize **`CONTINUIDADE.md` no mesmo conjunto de commits**. Diga o que mudou, arquivos/canais afetados, validação e limite pendente.

A barreira `tools/testes/continuidade.js` verifica a estrutura do documento e, em push de código ou workflow, exige que ele tenha sido alterado. Não a enfraqueça, não a remova e não contorne a regra com atualização vaga.

Mudanças relevantes de decisão/estado também exigem registro sincronizado na `base` (`ia-propria/ESTADO-DO-CHAT.md`, registro de decisões e, se aplicável, pendências), seguido de commit + push confirmado.

## Segurança e escopo

- Nunca exponha, versione, registre em URL/log/Issue ou repita valores de PAT, segredo, token de bot, e-mail privado, código de pareamento ou conteúdo privado.
- O PAT **da interface web** foi autorizado a persistir somente no navegador do dono, pelo campo **⚙️ Configurar acesso**. `?t=` e `!token` permanecem proibidos.
- Não revogue, rotacione, apague ou desative PAT, enxame, workflows, segredos da automação independente ou APIs de marketing sem ordem explícita.
- Preserve a proteção contra adoção automática pelo enxame, cache inseguro, OCR externo sem consentimento, EXIF e DOM inseguro.
- Ao alterar a interface, confira `index.html`, `direto.html`, `ligar.html`, `limpar.html`, `console.html` e `sw.js` conforme a área afetada.

## Fechamento de uma tarefa autorizada

1. Rode testes proporcionais ao risco, sintaxe, `git diff --check` e scanner de segredos do diff.
2. Reveja o diff e atualize a continuidade.
3. Faça commit de assunto único, push e confirme o hash remoto.
4. Registre na `base` quando houve mudança de decisão/estado e confirme também esse push.
