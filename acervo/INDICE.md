# Acervo do projeto — o que estava só no workspace agora está aqui

**Criado em 31/10/2026**, a pedido do dono: *"limpe o workspace e deixe tudo salvo nos repositórios"*.

O workspace era uma área de rascunho que ocupava **446 MB / 7 554 arquivos**. Depois da limpeza ficou com
**56 MB**, e o que tinha valor foi versionado **aqui**, no próprio repositório do produto — não em pasta
temporária, não em conversa, não na memória de ninguém.

## O que tem em cada pasta

| pasta | conteúdo | por que vale guardar |
|---|---|---|
| `relatorios/` | fechamento das rodadas **132 a 139**, auditorias do chat, proposta de corte do agente, guia do cookie do itch | os números medidos de cada rodada, com método — é o histórico verificável do produto |
| `pesquisas/` | dossiês de roteador, teto dos grátis, texto aberto, visão e latência, comparações | o porquê das decisões técnicas (por que 19 rotas, por que disjuntor, por que base lexical) |
| `qi/` | medidores `medir-qi.js` (29/29), `medir-dificil.js` (18/18) e resultados brutos | a régua que mede "grau de QI humano" — sem ela os números viram promessa |
| `arquivo/logs/` | saídas de barreira das rodadas 101–102 | evidência de execução antiga, só para consulta |
| `arquivo/rodada-101-102/` | sondas, patches e JSONs daquelas rodadas | histórico; não é usado pelo produto |
| `MAPA-WORKSPACE.md` | mapa da limpeza: o que saiu, o que foi resgatado, como restaurar | para o próximo que abrir o workspace vazio não achar que perdeu algo |

## Ferramentas que vieram junto

- `tools/clonar.sh` — clona (ou atualiza) este repositório do zero, instala o `imapflow` que a barreira exige e imprime o HEAD e a versão da casca. É o único passo manual que sobrou para voltar a trabalhar.
- `tools/estado-repos.py` — diz, repositório por repositório, se o clone local está atrás, à frente ou igual ao remoto (foi o defeito que já custou dois pushes recusados).

## O que **não** está aqui, de propósito

- **Imagens enviadas pelo dono** (31 arquivos, 51 MB) — dado do usuário; ficam no repositório privado `acervo`, não no repositório do produto.
- **Clones de trabalho** e **cópias antigas de versões publicadas** — reconstruíveis por `tools/clonar.sh`. O que havia de não commitado neles foi resgatado nas branches `resgate/workspace-2026-10-31` de `chat`, `site`, `base` e `motor`.
- **Vídeos e capturas de evidência** — já publicados no itch/YouTube; o dado que importa (números) está em `relatorios/`.

## Estado do produto quando este acervo foi criado

`main` = **`5cb5f62`** · Pages **200** · casca **`rebocl-chat-v106`** · guarda **131/133 provas por código (0 erradas)**,
armadilhas 47/47, cobertura 43/43, barreira 121/121, QI 29/29, difícil 18/18.
