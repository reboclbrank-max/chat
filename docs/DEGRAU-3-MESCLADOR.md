# Degrau 3 — o mesclador estreito

A partir de 05/11/2026 a casa pode **mesclar sozinha**, mas só dentro de uma faixa
estreita e com volta. Este documento descreve a faixa, as travas e o que continua
proibido.

## As três travas pedidas pelo dono

1. **Só texto.** A faixa é `docs/**` e `posts/**`, com arquivos `.md` e `.json`.
   Qualquer arquivo fora dela reprova a PR inteira — não existe mesclar metade.
2. **Reversão automática.** Se a `main` ficar vermelha depois de um merge do mesclador,
   ele abre uma PR de reversão. Ela passa pela mesma barreira: nunca há push direto.
3. **Nunca toca no essencial.** `tools/`, `.github/`, `package*.json`, `index.html`,
   qualquer `.js`, `.py`, `.sh`, `.yml` e os `.md` da raiz estão fora da faixa por
   construção. O turno de e-mail, os segredos e o postador são inalcançáveis.

## Como decidir se uma PR entra sozinha

| condição | resultado |
|---|---|
| todos os arquivos em `docs/` ou `posts/` | pode mesclar |
| um único arquivo fora da faixa | recusa a PR inteira |
| PR de fork, rascunho, fechada, ou com mais de 20 arquivos | recusa |
| barreira de testes não passou | o mesclador nem é acionado |

## O que continua sendo trabalho com gente no comando

Código, workflow, dependência, configuração e qualquer coisa que possa parar o
atendimento de e-mail. O mesclador não escreve código: ele só decide se o que já
foi escrito e aprovado pela barreira pode entrar.
