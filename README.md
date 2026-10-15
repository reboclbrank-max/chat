# 💬 Chat — Assistente Rebocl

Página de conversa com a **IA gratuita da Rebocl Brank**.

- **Endereço:** <https://reboclbrank-max.github.io/chat/>
- Abre no celular ou no computador. Para entrar, a página pede **um token de acesso do GitHub** (criado por você, guardado só no seu navegador — veja as instruções na própria página).
- **Não contém nenhum dado**: as conversas ficam salvas no repositório **privado** `reboclbrank-max/agente`.
- Feita em um único arquivo `index.html` (sem dependências externas), hospedada de graça no GitHub Pages.

## O que ela faz

- Lista as conversas abertas (issues do repositório privado) e **busca pelo título**.
- Cria conversa nova e envia mensagens.
- Mostra as respostas do assistente automaticamente (~1–2 min por resposta) e avisa por notificação.
- Mostra **qual motor respondeu** (tag ao lado de "Assistente") e avisa quando a internet cai.
- **Exporta e importa conversas**: tudo em JSON, tudo em texto (.md), ou só uma conversa — para guardar fora do navegador ou levar para outro aparelho.
- Por conversa: **renomear**, **fechar**, **reenviar** a última mensagem e **copiar** qualquer mensagem.
- Dica: escreva `anotar: <texto>` para guardar algo na memória permanente.

## Manutenção

Para mudar o visual ou o texto, edite `index.html` e faça commit. O GitHub Pages publica sozinho em ~1 minuto.

## v1.3 — a máquina (console + cérebro local turbinado)

- **Console da IA** (`console.html`): um painel único que mostra **tudo junto** — motores e placar, cérebro próprio, piloto automático, fila de publicação, métricas ao vivo, avisos — e manda ordens para o agente (medir, postar, ligar/desligar o piloto, `pensar:`).
- **Cérebro local com 3 modelos** para escolher: ⚡ rápido (0.5B), ⚖️ equilibrado (1.5B, padrão), 💪 pesado (3B).
- **Fallback automático:** se a internet cair, o chat liga o cérebro local sozinho.

## v1.4 — mais perto de "nunca ficar na mão"

- **Cache offline:** conversas e a lista ficam salvas no navegador (IndexedDB) — sem internet você **lê tudo** (modo offline com faixa 📦)
- **Sugestões após cada resposta:** 👎 ficou ruim (a IA aprende com seu feedback!), 💡 explique simples, 📝 resuma
- **Atalhos:** Ctrl+Enter envia · `/` foca a caixa · Esc fecha as configurações
- **Voz 100% offline:** o botão 🔊 usa a voz do próprio aparelho (Web Speech) — funciona sem internet

## v1.5 —polimento final

- **Tema claro/escuro** (☀️/🌙 nas configurações, fica salvo)
- **Arraste um arquivo** .txt/.md/.csv/.json/.html/.js/.py para a caixa de texto
- **Ctrl+N** cria conversa nova · **contador de caracteres** · **🖨️ imprimir / salvar como PDF** a conversa
- **Console v3:** mostra a **saúde dos 6 canais** (🟢/🔴) medida pelo piloto 1× por dia

## v1.6 — leitura cada vez melhor

- **Toque nas imagens** das respostas para ver em tela cheia (lightbox)
- **Auto-scroll inteligente:** se você estava lendo uma parte de cima, a página não te arrasta para baixo
- A lista mostra **quantas conversas** você tem


## v1.10 — o canal por e-mail (15/10/2026)

- **Responde os e-mails do dono** em turnos de escuta de até ~6 h que se revezam sozinhos (uma sessão por vez; o turno novo assume quando o anterior termina e já atende ~30 s depois de começar; código novo entra no ar sozinho em até ~10 min) e com um **vigia** que acorda o turno se algo ficar sem resposta.
- **Entende anexos:** foto (motores de visão + olho local), PDF/Word/TXT/CSV/JSON, PDF digitalizado (a página vira imagem), foto e documento na mesma mensagem, e áudio (transcrição local). Responde **falando** quando pedido (`voz: <texto>`).
- **Leitor de texto local (v12):** o tesseract roda no próprio runner e lê bilhete, placa, rótulo e documento fotografado **sem mandar a foto para terceiros**. A confiança vai junto para o motor de visão; quando divergir do que ele vê, vale a imagem.
- **Resposta cega barrada (v12.2):** se o motor de visão engasga e um modelo só de texto tenta "descrever" a foto sem vê-la, a resposta é descartada; aí vem o fallback honesto (texto lido + olho local).
- **Visão local (v12.6–v12.10):** se os motores de visão da internet caem, um modelo de visão (**Qwen3-VL-4B**, escolhido no exame comparativo: formas 5/5 e horta 4/4, contra 3/5 e 3/4 do 2B) roda na CPU do próprio GitHub e olha a foto; um motor de texto escreve a resposta. Ela começa junto com a 1ª tentativa na internet: em pane real, uma foto sai em **~1–1,5 min** (antes, 4–5 min). Com foto + documento, o arquivo é respondido mesmo se nada conseguir ver a foto. O aviso de origem ("descrição feita pela visão local…", "a foto não pôde ser vista agora…") é acrescentado pelo próprio código, curto e fixo — não depende do modelo.
- **Foto de celular (v12.9):** foto grande ou gravada "deitada" (a marca EXIF que o celular usa) é preparada uma vez antes de tudo: em pé, até 2048 px, JPEG. A internet recebe um arquivo pequeno e a visão local, o leitor de texto e o olho veem a foto em pé. Antes, uma foto de 12 MP estourava os 5 min da visão local.
- **Ordem de chegada (v12.5):** os e-mails são atendidos na ordem em que chegaram; um e-mail problemático fica para o turno seguinte sem travar os outros.
- **Nenhum e-mail perdido (v12.13):** a cada 5 min o chat confere se algum e-mail das últimas 6 h ficou marcado como lido sem resposta na pasta de enviados e o devolve à fila (uma vez por e-mail). Na estreia, recuperou e respondeu 7 e-mails de teste que tinham sumido da fila horas antes.
- **Resposta automática responsável (v12.13):** não responde robôs — avisos de entrega, no-reply, listas, mensagens marcadas como automáticas (RFC 3834) — e marca as próprias respostas como automáticas, para nunca entrar em laço com outro robô.
- **Olho local (v5):** sem internet, mede rostos, cena em faixas (céu/água/vegetação/areia), blocos de cor, linha de horizonte, "parece ter texto" e nitidez. Para o motor de visão só vai a contagem de rostos, quando a pergunta é sobre pessoas (pista rica no prompt piorava as respostas); o resto garante uma resposta mínima e honesta quando os motores caem.
- **Privacidade:** o `email-log.md` e o log de execução do Actions (ambos públicos) levam o endereço mascarado e só o assunto de e-mails de teste; transcrição de áudio e nome de arquivo do dono não aparecem (v12.12). A memória da conversa é guardada por remetente + assunto (outra pessoa com o mesmo assunto não vê a sua conversa).
- **Provas:** robô de teste com 20 casos (`teste-email.yml`) e **exame das ferramentas** de 1 clique (`ferramentas.yml`, que também compara modelos de visão local); os relatórios ficam em `provas/`. Última rodada (22): **20/20 PASS**, média de 3,6 min por resposta, inclusive e-mail perdido (chega como lido), e-mail automático (não responder), foto + PDF, bilhete, foto complexa, foto de celular de 12 MP e o modo "sem visão"; falha em modo de pane (motores da internet fora) aparece separada no relatório como "PANE".

## 🚀 ATUALIZAÇÃO 13/10 — A CASA NA SUA FORMA MÁXIMA
- **~165 comandos** em 15+ famílias — o comando `!ferramentas` lista TUDO
- **47 motores de IA** — incluindo GIGANTES de 550B e 397B parâmetros (rota dupla) e um especialista em código
- **38 comandos LOCAIS** que funcionam SEM INTERNET: caderno de notas, lista de tarefas, pomodoro, tabuada, regra de três, senha, hash, conversor, morse…
- Saúde (IMC, água, respiração guiada com anel visual) · Cozinha (!cozinho frango) · Música (!piano) · Radares (aviões, asteroides, cheias de rio, ondas) · Brasil completo (CEP, CNPJ, loteria, IBGE, SELIC, tabela do Brasileirão) · Gutenberg · Xadrez · Tarô · D&D · Estúdio Ghibli
- **Auto-melhora distribuída:** os aparelhos se falam (canal ntfy), adotam motores provados entre si (!plantar) e a casa SEMEA o resumo do próprio diário todos os dias (!semear)
- **R$ 0,00 · sem conta · sem chave · offline quando precisa** → [abrir o chat](https://reboclbrank-max.github.io/chat/)
