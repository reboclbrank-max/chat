# Avaliação humana piloto do Chat

> **Protocolo de experiência humana, voluntário e separado da avaliação técnica.**
>
> Ele mede o relato de uma pessoa participante sobre uso real; não transforma a IA em pessoa, não presume sentimentos e não permite inferir satisfação de outras pessoas.

## 1. Finalidade e estado

Esta é uma avaliação piloto com o próprio dono como participante inicial, autorizada em 2026-10-18. O objetivo é observar, em tarefas reais e não sensíveis, como a pessoa percebe:

- utilidade para concluir uma tarefa;
- clareza e esforço necessário para chegar a uma resposta aproveitável;
- confiança e transparência sobre limites;
- recuperação após dúvida, ambiguidade ou correção;
- intenção de reutilizar o canal.

**Estado atual:** protocolo pronto; ainda não há resposta humana registrada. Não declarar satisfação humana antes do relato voluntário da pessoa participante.

## 2. Consentimento, privacidade e desistência

- A participação é voluntária. A pessoa pode pular qualquer tarefa, não responder uma pergunta ou encerrar a sessão sem justificativa.
- Não enviar segredo, token, endereço, telefone, dado financeiro, conversa privada, foto pessoal, documento pessoal ou anexo privado.
- O repositório público não recebe mensagens cruas, anexos, e-mails, identificadores ou comentários identificáveis. Se a pessoa autorizar registro, publica-se apenas um resumo sanitizado de notas e observações técnicas.
- A recusa ou uma nota baixa não tem consequência sobre acesso, canal ou funcionalidades.
- O relato pertence à pessoa participante. O assistente pode organizar e resumir, mas não pode completar, melhorar ou atribuir uma opinião que não foi dada.

## 3. Sessão piloto: cinco jornadas curtas

Faça as tarefas pelo canal que você realmente usaria, em uma sessão normal. Prefira necessidade real sem conteúdo sensível; não é necessário copiar as respostas ao repositório.

| Jornada | Ação da pessoa participante | O que observar |
|---|---|---|
| H1 — utilidade | Peça ajuda para uma tarefa real simples, sem informação privada (por exemplo, organizar uma ideia ou explicar algo). | A resposta ajudou a concluir ou avançar na tarefa? |
| H2 — clareza | Peça uma explicação ou reescrita para uma situação concreta. | A linguagem ficou compreensível, direta e adequada? |
| H3 — recuperação | Faça uma pergunta ambígua ou corrija uma resposta anterior. | O Chat reconheceu a correção e se recuperou sem exigir esforço excessivo? |
| H4 — confiança | Pergunte sobre um limite ou sobre como o canal trata um tipo de dado, sem enviar o dado. | A resposta foi transparente, prudente e não inventou garantia? |
| H5 — recurso opcional | Use, se desejar, um recurso relevante com conteúdo público/não identificável (por exemplo, pesquisa, lembrete ou imagem pública). Se não houver caso seguro, marque como não avaliado. | O recurso foi fácil de iniciar e o limite foi explicado quando necessário? |

Não há resposta certa para a pessoa. Uma jornada sem utilidade, confusa, lenta ou desconfortável é resultado válido e deve ser registrada como tal.

## 4. Registro de percepção

Depois da sessão, a pessoa participante responde no canal de acompanhamento com estas informações, sem copiar conteúdo privado:

```text
Consentimento para publicar apenas um resumo sanitizado: SIM / NÃO
H1: satisfação 1–5 | clareza 1–5 | esforço 1–5 | reutilizaria: sim/não/talvez | comentário sanitizado opcional
H2: satisfação 1–5 | clareza 1–5 | esforço 1–5 | reutilizaria: sim/não/talvez | comentário sanitizado opcional
H3: satisfação 1–5 | clareza 1–5 | esforço 1–5 | reutilizaria: sim/não/talvez | comentário sanitizado opcional
H4: satisfação 1–5 | clareza 1–5 | esforço 1–5 | reutilizaria: sim/não/talvez | comentário sanitizado opcional
H5: satisfação 1–5 | clareza 1–5 | esforço 1–5 | reutilizaria: sim/não/talvez | comentário sanitizado opcional, ou NÃO AVALIADO
O que mais ajudou: comentário sanitizado opcional
O que mais atrapalhou: comentário sanitizado opcional
```

Escala de percepção: **1** muito ruim/insatisfatório; **2** abaixo do esperado; **3** adequado com ressalvas; **4** bom; **5** muito bom. “Esforço” significa facilidade de resolver a necessidade: 1 = exigiu muito esforço; 5 = exigiu pouco esforço.

Não se calcula um placar global que esconda divergências. O relatório mostra cada jornada, itens não avaliados, comentários sanitizados e a frase literal de consentimento ou recusa.

## 5. Como interpretar um único relato

Um relato do dono é evidência humana direta, porém **N=1**:

- mostra a percepção dessa pessoa, nesse contexto e nessa versão do canal;
- não representa todo público, faixa etária, necessidade, dispositivo ou acesso à internet;
- não prova adoção contínua, satisfação futura, ausência de erro, disponibilidade, SLA ou qualidade universal;
- deve ficar separado dos testes R3/QP, do placar operacional e de qualquer decisão automática.

O assistente pode fazer uma revisão heurística de clareza, privacidade e recuperação como análise técnica; isso não substitui a experiência relatada pela pessoa.

## 6. Registro e melhoria responsável

Após receber o relato, o assistente deve:

1. verificar se há consentimento para publicar um resumo sanitizado;
2. registrar apenas os dados autorizados, sem mensagem bruta nem identificadores;
3. distinguir fato observado, percepção da pessoa e hipótese técnica;
4. tratar falha relatada como achado, sem reclassificá-la por média ou pontuação;
5. propor correção pequena, reversível e testável somente se houver causa técnica verificável;
6. documentar no Chat e na Base o tamanho da amostra, limites e quaisquer mudanças feitas.

Nenhuma ação pública, recrutamento de terceiros ou uso de feedback de outra pessoa pode ocorrer por este protocolo sem consentimento específico e novo.
