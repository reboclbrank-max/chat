# Política de retenção operacional — decisão humana informada

> Estado: política conservadora ativa. Não há expurgo, arquivamento externo ou exclusão automática.

## 1. Finalidade

O ramo `estado/operacional` separa estado público sanitizado de `main`. Essa separação não autoriza perda silenciosa: logs, fotografias, indicadores e provas autorizadas permanecem até uma decisão humana específica de retenção ou remoção.

## 2. Classes fechadas

| Classe | Exemplos permitidos | Regra atual |
|---|---|---|
| Log sanitizado | `email-log.md` | Apenas append-only; não truncar nem reescrever. |
| Fotografia sanitizada | `vigia-estado.json` | Atualização pelo publicador fechado; não apagar automaticamente. |
| Indicador operacional | capacidade e histórico sanitizados | Atualização pelo perfil literal; não usar como dado pessoal ou prova de SLA. |
| Prova autorizada | relatórios Markdown e dois MP3 literais aceitos pelo publicador | Preservar até revisão humana de retenção; não aceitar caminho genérico. |
| Fora da allowlist | qualquer outro caminho/tipo adicionado no delta | Não publicar; inventário somente marca a contagem, sem listar conteúdo. |
| Remoção detectada | item que existia em `main` e falta no ramo operacional local | Não apagar como correção; investigar e decidir por revisão humana. |

## 3. Inventário sem conteúdo

Antes de uma decisão humana, execute localmente:

```text
node tools/inventario-estado-operacional.js
```

A ferramenta não aceita argumento, não acessa rede, não faz `fetch`, não escreve no Git e não lê conteúdo de arquivos. Ela compara somente metadados Git locais de `estado/operacional` com a cópia local de `main`, para contar apenas o delta operacional em vez de classificar todo o produto copiado. Devolve somente contagem e bytes por categoria, sem caminhos. Se qualquer um dos dois ramos não estiver disponível localmente, falha fechada em vez de consultar rede.

## 4. Decisões que ainda precisam de uma pessoa responsável

Não foram inventados prazo, revisor, destino externo ou regra de apagamento. Antes de qualquer arquivamento/remoção, a pessoa responsável precisa definir, por classe:

1. finalidade e retenção mínima;
2. responsável pela revisão;
3. destino aprovado, se houver cópia externa já existente;
4. quem aprova a remoção;
5. rollback verificável;
6. confirmação de que não há conteúdo privado, segredo ou evidência necessária em risco.

A decisão deve entrar em PR humana e no registro da Base. Sem esses dados, a regra segura é **preservar e não apagar**.

## 5. Limites

Esta política não cria armazenamento pago, LFS, backup em nuvem, conta, integração externa, coleta de conteúdo ou rotina de exclusão. Ela não resolve sozinha crescimento futuro do histórico Git; torna esse crescimento mensurável sem sacrificar auditabilidade, privacidade ou reversibilidade.
