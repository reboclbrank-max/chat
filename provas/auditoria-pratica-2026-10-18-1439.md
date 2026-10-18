# Auditoria prática conduzida por agente — 18/10/2026 14:39 (Fortaleza)

> **Classificação:** auditoria técnica/prática feita por agente, com entradas públicas ou sintéticas. Não é relato humano, não mede sentimentos e não encerra o piloto humano N=1.

## Escopo e privacidade

Foram usados somente a página pública, uma conversa sintética privada e já encerrada, fixtures públicas e diagnósticos de leitura. Não foram copiados, publicados ou registrados aqui: token, endereço, conteúdo de conversa do dono, anexo privado, identificador de chat, número de Issue privada ou texto bruto de resposta.

A credencial existente foi usada apenas em memória de um perfil temporário de navegador para exercer o mesmo fluxo autenticado da interface; o perfil foi apagado ao fim. Não houve mudança de segredo, permissão, conta, cobrança, modelo pago, canal ou postagem pública.

## Evidência observada

| Área | Evidência | Resultado e limite |
|---|---|---|
| Página pública | `https://reboclbrank-max.github.io/chat/` retornou HTTP 200, título esperado e compositor; `robots.txt`, `manifest.json` e `sw.js` também retornaram 200. | Confirma publicação/acessibilidade HTTP naquele instante, não experiência de pessoa nem disponibilidade contínua. |
| Navegador público isolado | Run `39149002935`, checkout `02c67f5`, terminou `success`; o estado sanitizado registrou a página do Chat aberta por Chrome, com título `Chat — Assistente Rebocl`. | Confirma somente leitura de conteúdo público, sem login ou dados de canal. |
| Interface real | Navegador headless temporário carregou a interface, encontrou compositor/botão, configurou o token apenas no perfil temporário e a guarda rejeitou uma cadeia sintética com formato de token antes de enviá-la. | O teste não expôs uma credencial e não equivale a uso humano. |
| Worker da interface (`agente`) | Três execuções acionadas pela conversa sintética (`issues` e `issue_comment`) falharam antes de qualquer etapa. A anotação da plataforma informou que o job não iniciou porque pagamentos recentes falharam ou o limite de gasto precisa aumentar. | Falha operacional real: o trabalhador privado não está disponível nesse caminho enquanto a restrição externa persistir. Não é corrigível por código sem contrariar o limite de custo R$ 0. |
| Recuperação no navegador | A correção desta série faz correlação temporal de tipo de evento/run e, após duas sondas, antecipa a rota de emergência somente se o run recente terminou `failure`. Na rodada controlada local, o aviso apareceu em aproximadamente **7,6 s**, em vez de aguardar a queda geral de ~30 s. | É comportamento controlado da interface contra a falha observada; depende do navegador aberto, PAT autorizado e de uma rota local/keyless disponível. A API de runs não fornece o número da Issue: uma associação a outro evento simultâneo do mesmo tipo é improvável na janela curta, mas não é impossível. |
| Contexto e deduplicação da recuperação | A rota passou a incluir o corpo inicial da Issue (que não existe em `/comments`) e marca a resposta do navegador com `<!-- rebocl-emergencia -->`. Na conversa sintética encerrada, a resposta marcada foi persistida uma vez e o teste local exibiu o resultado do comando não sensível da mensagem inicial. | A marca é removida antes de renderizar. Só é reconhecida como resposta se vier da conta esperada do dono; o trabalhador também a ignora nesse mesmo caso, evitando que uma resposta de emergência vire nova pergunta quando voltar a operar. |
| Canal por e-mail | Diagnóstico somente leitura `39149665314` terminou `success`; não havia e-mails de teste recentes pendentes no recorte mostrado pelo diagnóstico. | Não enviou e-mail e não prova resposta a pessoa, latência futura ou visão universal. |
| Telegram | Diagnóstico `39149666440` terminou `success`, com dono pareado e alcance da conversa confirmado; a opção de envio permaneceu `nao`. | Não leu `getUpdates`, não enviou notificação e não testa uma mensagem de pessoa. |
| Regressões locais | Suíte rápida completa: **35/35**; inclui a nova regressão da recuperação rápida (16/16), segurança da interface (44/44), OCR (4/4), avaliação profunda (12/12) e todos os cenários simulados. | Testes locais/simulados não substituem o comportamento natural de uma pessoa. |

## Correções introduzidas nesta rodada

1. A interface passa o instante e o tipo do evento (`issues` ou `issue_comment`) ao polling. Ela consulta no máximo uma vez os últimos runs do workflow do trabalhador e só antecipa a emergência quando encontra **o mesmo tipo de evento**, recente, concluído e com `failure`. A associação é temporal, pois a API não expõe o número da Issue no run; fila, execução pendente, sucesso, evento diferente ou erro da própria consulta continuam no fluxo normal.
2. `emergenciaResponder()` passa a obter o corpo da Issue junto dos comentários. Assim a primeira pergunta não se perde quando o worker falha antes de comentar.
3. A resposta do navegador recebe um marcador invisível sanitizado para ser renderizada como assistente, parar o polling e não gerar cadeia de respostas. O marcador só vale quando publicado pela conta esperada do dono, para que uma mensagem de outro autor não possa suprimir pergunta. `agente/responder.py` passa a ignorá-lo nesse caso em evento normal e reprocessamento.

## Limites que permanecem explícitos

- A restrição de cobrança/limite do GitHub Actions no repositório privado do trabalhador continua aberta. Não foi habilitado pagamento, nem aumentada franquia, porque o requisito vigente é custo R$ 0.
- A recuperação no navegador é contingência, não substituto comprovado do trabalhador, não garantia de que todo provedor gratuito responderá e não SLA.
- E-mail, Telegram, OCR, visão, anexos, pesquisa e navegador possuem as evidências técnicas próprias já preservadas; esta rodada não repete todos os estímulos nem transforma diagnósticos em satisfação.
- Ainda não existe relato, nota, adoção ou conclusão de satisfação humana. O protocolo `AVALIACAO-HUMANA-PILOTO.md` permanece aguardando participação voluntária do dono.
