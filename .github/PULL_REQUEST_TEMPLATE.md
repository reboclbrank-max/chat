# Revisão humana do Chat

> Este modelo não aprova, mescla nem substitui a proteção de `main`.

## Escopo

- [ ] O objetivo é pequeno, verificável e não aceita entrada/tarefa livre.
- [ ] Não há segredo, dado privado, conta, custo, dependência nova, infraestrutura ou publicação externa sem decisão própria.
- [ ] Se toca estado operacional, os caminhos/perfis continuam na allowlist e não escrevem em `main`.

## Validação

- [ ] Sintaxe, testes proporcionais, `git diff --check` e scanner de segredo foram executados.
- [ ] `CONTINUIDADE.md` explica mudança, validação, rollback e limite pendente.
- [ ] O check obrigatório `testes` está verde para a ponta atual da PR.

## Revisão e reversão

- [ ] Um revisor humano real leu o diff; não inventar `CODEOWNERS` ou identidades.
- [ ] Não há auto-merge, bypass, force-push, promoção cega ou exceção para automação.
- [ ] O rollback é um revert revisado ou outra ação humana estreita e documentada.

## Retenção e operação

- [ ] Se altera logs/provas/estado, a decisão de retenção continua preservação por padrão ou traz aprovação humana explícita.
- [ ] Se altera recuperação/fila, não introduz cancelamento, retry ou dispatch cego.
