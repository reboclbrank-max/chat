# Registro de defeitos — o que já quebrou, e como foi descoberto

Uma lista curta de defeitos reais deste projeto, com a coluna que importa: **como foi
descoberto**. Quase todos apareceram por medição — ler a API, rodar a execução, olhar o
log — e não por raciocínio sobre o código. É a razão de a regra "toda conclusão vem de
leitura real" existir.

| # | defeito | como foi descoberto | conserto |
|---|---|---|---|
| 1 | a régua da barreira aprovava por envelhecimento: execução antiga contava como se fosse recente | leitura das execuções na API, comparando data e resultado uma por uma | janela medida por execução, não por data de commit |
| 2 | execução **cancelada** pelo grupo de concorrência contava como evidência | comparação entre a contagem do termômetro e a lista real de execuções | só `success`/`failure` contam (`#102`) |
| 3 | a regra de concentração olhava o histórico inteiro e acusava falhas de outubro, já corrigidas | o termômetro reprovava o presente por causa do passado | inspeção de passo só na janela recente (`#103`) |
| 4 | o portão 2 olhava o campo errado, e o sombra gravava antes do merge existir | o número do painel não batia com a lista de PRs da API | merge resolvido na hora de ler, não de gravar |
| 5 | o mapa de risco adivinhava por prefixo (`tools/email`) e zerava o sombra | o sombra passou a recusar PR que deveria passar | lista explícita; o desconhecido é essencial |
| 6 | a reversão morria com `HTTP 403 — not permitted to create or approve pull requests` | log da execução vermelha em produção | caminho alternativo por merge do ramo, com contrato próprio |
| 7 | um contrato espelhava a produção (dependia de a lista real estar pendente) e quebrou no minuto em que ela foi corrigida | o teste ficou vermelho sem ninguém mexer nele | o teste passou a usar dado explícito |
| 8 | **os portões 3 e 4 eram mutuamente exclusivos**: o 3 exigia faixa de até 2 arquivos, o 4 exigia no mínimo 3, e o 4 pedia o 3 aberto | promover um arquivo fechou o portão 3 no painel | tamanho da lista pertence só ao portão 4; contrato de regressão exige 4 de 4 |
| 9 | **merge feito pelo robô não acorda a barreira na main**: evento gerado pelo `GITHUB_TOKEN` não abre execução | o merge `[mesclador]` 6cec24c20d não tinha execução de push nenhuma, e os merges vizinhos tinham | o mesclador pede a barreira por dispatch depois de mesclar (`#109`) |
| 10 | o pedido de barreira levou `HTTP 403 — Resource not accessible by integration` | log do próprio job, na primeira execução do conserto | `actions: write` no workflow, e o orçamento do teste de auditoria atualizado (`#111`) |
| 11 | o vigia mostrava `sonda-indisponivel` em vez da causa real de falha de autonomia | o estado publicado não dizia *qual* era o problema | causas novas entraram na lista fechada |
| 12 | um teste lia o tamanho da faixa escrito à mão ("1 arquivo(s)") | reprovou na barreira no dia em que a faixa cresceu | o número esperado vem do mapa de risco |

## O que essa lista ensina

- **Três dos doze** (8, 9, 10) só apareceram quando algo foi **executado de verdade**: um
  painel medido, um merge do robô, um dispatch recusado. Nenhum teste de unidade os pegaria.
- **Dois** (4, 7) eram testes que mediam a si mesmos em vez de medirem o mundo.
- **Um** (6) é o defeito mais caro que existe aqui: a rede de segurança estava quebrada, e o
  sistema parecia protegido.

`docs/PORTOES-DO-DEGRAU-4.md` mostra quais portões estão abertos e com que número.
