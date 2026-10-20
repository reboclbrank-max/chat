# 💬 Chat — Assistente Rebocl

Página de conversa com a **IA gratuita da Rebocl Brank**.

- **Endereço:** <https://reboclbrank-max.github.io/chat/>
- Abre no celular ou no computador. Para entrar, a página pede **um token de acesso do GitHub** (criado por você, guardado só no seu navegador — veja as instruções na própria página).
- **Não contém nenhum dado**: as conversas ficam salvas no repositório **privado** `reboclbrank-max/agente`.
- Feita em páginas estáticas locais, sem framework nem dependências externas, hospedada de graça no GitHub Pages.

## O que ela faz

- Lista as conversas abertas (issues do repositório privado) e **busca pelo título**.
- Cria conversa nova e envia mensagens.
- Mostra as respostas do assistente automaticamente quando o trabalhador privado está disponível e avisa por notificação. Se o navegador confirmar que o run correspondente falhou antes de iniciar, tenta uma recuperação local de contingência; isso requer o navegador aberto e não é SLA.
- Mostra **qual motor respondeu** (tag ao lado de "Assistente") e avisa quando a internet cai.
- **Exporta e importa conversas**: tudo em JSON, tudo em texto (.md), ou só uma conversa — para guardar fora do navegador ou levar para outro aparelho.
- **🗂️ Workspace local:** crie projetos e arquivos de texto dentro do Chat, pesquise, salve, recupere versões locais e faça backup/importação JSON. Eles ficam neste navegador; nada é enviado automaticamente. Para revisar um trecho na conversa, selecione-o e use **Levar seleção ao Chat** — isso só preenche o compositor, nunca envia.
- Por conversa: **renomear**, **fechar**, **reenviar** a última mensagem e **copiar** qualquer mensagem.
- Dica: escreva `anotar: <texto>` para guardar algo na memória permanente.
- Escreva `trabalho:` ou `prioridades:` no e-mail, Telegram ou nesta interface para o roteiro local e sanitizado das rotinas da casa, próximo passo seguro e o que — se houver — depende do dono. Nesta interface, o chip `🧭 trabalho` é o atalho local correspondente; ele não cria conversa nem chama a rede. A fotografia técnica dinâmica `status:` continua nos canais de e-mail/Telegram.
- **Procurar comando:** o próprio campo informa **nome ou comando** e filtra os atalhos já existentes, inclusive sem acento (`caca` encontra `caça`) ou pelo texto que o chip vai preencher (`cambio` encontra o atalho `💱 dólar`). O chip `🧭 trabalho` também aparece ao procurar `prioridades`, seu outro nome local fechado. Cada chip expõe sua sintaxe somente na dica local e ao leitor de tela; ao navegar por teclado, o atalho focado é trazido à visão. Digitar, limpar com Esc ou usar os atalhos globais dentro desse campo não envia mensagem, não salva rascunho e não cria conversa; só clicar em um chip preserva a ação que ele já tinha.
- **Tela compacta:** as ações do cabeçalho da conversa se organizam em linhas quando a largura não comporta todas, em vez de ficarem cortadas fora da tela; voltar à lista também preserva alvo mínimo de 24 px.
- **Ações da mensagem:** o controle de copiar aparece ao passar o mouse, ao chegar nele pelo teclado e em telas de toque. Ele preserva espaço no balão e, junto do controle de ouvir respostas, tem alvo mínimo de 24 px; as duas ações continuam locais do navegador.

## Manutenção e continuidade

Antes de qualquer alteração, leia [`CONTINUIDADE.md`](CONTINUIDADE.md), [`AGENTS.md`](AGENTS.md), [`AUTONOMIA.md`](AUTONOMIA.md) e [`GOVERNANCA-CHAT-PRIMEIRO.md`](GOVERNANCA-CHAT-PRIMEIRO.md). Eles registram o mapa técnico, as proteções, a validação, os limites de autonomia, a ordem fixa de trabalho e o procedimento obrigatório para quem assumir o trabalho.

Toda atualização autorizada que mude comportamento, segurança, workflow, teste ou capacidade do Chat deve atualizar também `CONTINUIDADE.md` no mesmo conjunto de commits; a barreira rápida verifica essa regra em pushes de código. Depois, registre a decisão/estado pertinente na memória privada `base`, faça commit, push e confirme os hashes remotos.

Para mudar o visual ou o texto, confira também as variantes `direto.html`, `ligar.html` e `limpar.html` quando a mudança afetar a interface. O GitHub Pages publica sozinho em ~1 minuto.

A auditoria operacional de 17/10 está em [`AUDITORIA-COMPLETA-2026-10-17.md`](AUDITORIA-COMPLETA-2026-10-17.md): ela documenta evidências, rotas, workflows, segurança, gargalos e limites. A [auditoria prática de 18/10](provas/auditoria-pratica-2026-10-18-1439.md) registrou uma página acessível, mas também que o trabalhador privado falhou antes de iniciar por restrição externa de pagamentos/limite de gasto; por isso foi adicionada uma recuperação no navegador, sem ativar cobrança. É uma contingência técnica controlada, não prova de disponibilidade ou satisfação humana. O protocolo [`AVALIACAO-PROFUNDA.md`](AVALIACAO-PROFUNDA.md) adiciona evidência controlada por dimensão, sem confundir teste técnico com satisfação humana. O piloto [`AVALIACAO-HUMANA-PILOTO.md`](AVALIACAO-HUMANA-PILOTO.md) coleta relato voluntário de uma pessoa, com consentimento e sem dados privados; ele não converte uma amostra em satisfação universal. O placar em [`CAPACIDADE.md`](CAPACIDADE.md) é operacional, não QI ou SLA.

## Segurança e privacidade

- **Token:** informe-o apenas em **⚙️ Configurar acesso**. Por escolha explícita do dono, ele permanece salvo neste navegador para manter as ações autorizadas automáticas após reiniciar; links com `?t=` e comandos `!token` não ativam nem enviam credenciais.
- **Aviso de acesso:** na rota protegida `ligar`, o lembrete visível é anunciado e não bloqueia os controles do cabeçalho enquanto aparece.
- **Limpeza protegida:** a rota `limpar` anuncia a limpeza local antes do redirecionamento deliberado; ela continua sem aceitar token por link.
- **Imagens nas respostas:** a ampliação já existente também pode ser aberta por Enter ou Espaço; o diálogo mantém o foco até Esc ou toque para fechar.
- **Configuração:** o controle **Voltar ao Chat** preserva alvo mínimo de toque sem mudar a navegação nem o token local.
- **Rascunhos locais:** a opção de salvar rascunhos neste aparelho preserva alvo nativo mínimo sem alterar a preferência, seus dados ou o token.
- **Workspace:** usa IndexedDB separado de token, rascunhos e cópias de conversa; tem limites locais e não é cofre de senhas, sincronização, armazenamento de binários ou backup garantido. Apagar cópias offline de conversas não o apaga; limpar dados do site pode apagar arquivos locais.
- **Console:** o campo de tema para “pensar bem” preserva um nome acessível depois de a dica visual ser preenchida, e o botão de atualizar anuncia sua ação explicitamente; enviar continua sendo uma escolha pelo botão explícito.
- **Enxame:** o canal público só pode sugerir motores. Veja candidatos com `!candidatos` e aprove cada um conscientemente com `!plantar <base> | <modelo> | <nome>`; bases e modelos passam por validação antes de entrar na frota.
- **Dados do dono:** pings automáticos não levam memória/persona e resumos internos não são publicados no canal do enxame.
- **Fotos por e-mail:** toda foto é regravada sem EXIF/metadados antes do processamento. O OCR externo só é usado quando o e-mail trouxer autorização explícita, por exemplo: `ocr externo: sim`; o OCR local continua sendo a primeira opção.

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


## v1.13 — o canal por e-mail e o Telegram (16/10/2026)

- **Responde os e-mails do dono** em turnos de escuta de até ~6 h que se revezam sozinhos (uma sessão por vez; o turno novo assume quando o anterior termina e já atende ~30 s depois de começar; código novo entra no ar sozinho em até ~10 min) e com um **vigia** que acorda o turno se algo ficar sem resposta.
- **Entende anexos:** foto (motores de visão + olho local), PDF/Word/TXT/CSV/JSON, PDF digitalizado (a página vira imagem), foto e documento na mesma mensagem, e áudio (transcrição local). Responde **falando** quando pedido (`voz: <texto>`).
- **Lê o e-mail como ele chega de verdade (v12.14):** entende a estrutura dos e-mails do Gmail, do iPhone e do Outlook (partes aninhadas, texto em base64 ou quoted-printable, acentos em UTF-8 ou Latin-1). Antes, um e-mail com foto mandado pelo Gmail chegava sem a pergunta e o do iPhone chegava sem a foto.
- **Fotos de celular (v12.14):** até ~22 MB, até 4 fotos por e-mail (viram uma montagem numerada e a resposta fala de cada uma pelo número) e fotos HEIC do iPhone; se uma foto não abrir, a resposta explica como mandar.
- **Leitor de texto local (v12):** o tesseract roda no próprio runner e lê bilhete, placa, rótulo e documento fotografado **sem mandar a foto para terceiros**. A confiança vai junto para o motor de visão; quando divergir do que ele vê, vale a imagem.
- **Resposta cega barrada (v12.2):** se o motor de visão engasga e um modelo só de texto tenta "descrever" a foto sem vê-la, a resposta é descartada; aí vem o fallback honesto (texto lido + olho local).
- **Visão local (v12.6–v12.10):** se os motores de visão da internet caem, um modelo de visão (**Qwen3-VL-4B**, escolhido no exame comparativo: formas 5/5 e horta 4/4, contra 3/5 e 3/4 do 2B) roda na CPU do próprio GitHub e olha a foto; um motor de texto escreve a resposta. Ela começa junto com a 1ª tentativa na internet: em pane real, uma foto sai em **~1–1,5 min** (antes, 4–5 min). Com foto + documento, o arquivo é respondido mesmo se nada conseguir ver a foto. O aviso de origem ("descrição feita pela visão local…", "a foto não pôde ser vista agora…") é acrescentado pelo próprio código, curto e fixo — não depende do modelo.
- **Foto de celular (v12.9):** foto grande ou gravada "deitada" (a marca EXIF que o celular usa) é preparada uma vez antes de tudo: em pé, até 2048 px, JPEG. A internet recebe um arquivo pequeno e a visão local, o leitor de texto e o olho veem a foto em pé. Antes, uma foto de 12 MP estourava os 5 min da visão local.
- **Ordem de chegada (v12.5):** os e-mails são atendidos na ordem em que chegaram; um e-mail problemático fica para o turno seguinte sem travar os outros.
- **Nenhum e-mail perdido (v12.13):** a cada 5 min o chat confere se algum e-mail das últimas 6 h ficou marcado como lido sem resposta na pasta de enviados e o devolve à fila (uma vez por e-mail). Na estreia, recuperou e respondeu 7 e-mails de teste que tinham sumido da fila horas antes.
- **Resposta automática responsável (v12.13):** não responde robôs — avisos de entrega, no-reply, listas, mensagens marcadas como automáticas (RFC 3834) — e marca as próprias respostas como automáticas, para nunca entrar em laço com outro robô.
- **Resposta formatada (v12.14):** a resposta chega com negrito, listas e código formatados (e uma versão em texto puro, sem asteriscos).
- **Memória que não se perde (v12.14):** o chat relê a própria conversa no Gmail para lembrar o que foi combinado — vale mesmo depois da troca de turno.
- **Responde até sem internet (v12.15):** se os motores de texto gratuitos caírem, o próprio modelo da casa (o mesmo da visão local) responde — e avisa.
- **Mais rápido (escutador v4.3):** o Gmail avisa na hora que chegou e-mail; o chat não espera mais a próxima varredura.
- **Comandos novos (v12.16):** `lembrete: amanhã às 7h regar a horta` (também "me lembra daqui a 2 horas…"; `lembretes` lista e `cancelar lembrete 1` cancela — horário de Brasília); `pesquisa: …` (responde com as fontes e seus endereços); "faça uma planilha…" (volta com .xlsx anexo); "…em PDF" (volta com PDF anexo).
- **Mais anexos:** planilhas Excel, PDF escaneado de até 4 páginas, nota de voz (como a do WhatsApp) e vídeo curto (quadros + fala).
- **Telegram (v12.17):** o mesmo chat no bot `@ceifalume_bot`, em conversa privada — texto, foto, nota de voz, documento, vídeo, lembretes (avisam pelo próprio Telegram) e pesquisa. Só o dono usa: ele se apresenta uma vez com `/parear <código>`; quem mais escrever ao bot recebe o link do canal do jogo e do Discord.
- **Olho local (v5):** sem internet, mede rostos, cena em faixas (céu/água/vegetação/areia), blocos de cor, linha de horizonte, "parece ter texto" e nitidez. Para o motor de visão só vai a contagem de rostos, quando a pergunta é sobre pessoas (pista rica no prompt piorava as respostas); o resto garante uma resposta mínima e honesta quando os motores caem.
- **Privacidade:** o `email-log.md` e o log de execução do Actions (ambos públicos) levam o endereço mascarado e só o assunto de e-mails de teste; transcrição de áudio e nome de arquivo do dono não aparecem (v12.12). A memória da conversa é guardada por remetente + assunto (outra pessoa com o mesmo assunto não vê a sua conversa). **Só o dono (e quem ele autorizar) usa o chat:** quem não está autorizado recebe uma resposta curta, sem IA e sem os anexos serem abertos. O endereço do dono fica num segredo do repositório, não no código. O remetente só vale como o dono se o Gmail confirmar que o e-mail é autêntico (DKIM/DMARC) — "De" falsificado recebe a resposta curta.
- **Provas:** robô de teste com 35 casos (`teste-email.yml`) e **exame das ferramentas** de 1 clique (`ferramentas.yml`, que também compara modelos de visão local); os relatórios ficam em `provas/`. Última rodada (27): **35/35 PASS**, com lembrete entregue na hora, pesquisa com fonte, planilha gerada, vídeo, nota de voz, planilha e PDF escaneado lidos, remetente falsificado barrado, e-mails no formato real do Gmail e do iPhone, 3 fotos, HEIC, foto de 6 MB, memória pela conversa, remetente não autorizado, e-mail perdido (chega como lido), e-mail automático (não responder), foto + PDF, bilhete, foto complexa, foto de celular de 12 MP e o modo "sem visão"; falha em modo de pane (motores da internet fora) aparece separada no relatório como "PANE". A cada mudança de código roda uma **barreira de testes rápidos** (`testes-rapidos.yml`) — o turno só troca para o código novo se ela passar. Os workflows ficam fixados no Ubuntu 24.04 (o `ubuntu-latest` migra para o Ubuntu 26 em 19/10/2026).

## v12.18 — mais comandos locais e turno à prova de queda (16/10/2026)

- **`conta:`** — conta rápida que responde na hora, sem internet e sem motor: `conta: (1250*0,15)+80`, `conta: 7x8`, `conta: 2^10`, `conta: 20% de 150` (aceita vírgula decimal, "x" como vezes e milhar brasileiro). Conta que não dá para ler devolve uma ajuda amigável em vez de resposta inventada.
- **`feriado:`** — próximos feriados nacionais com dia da semana; `feriado: 2027` lista o ano inteiro. Dados da BrasilAPI (grátis, sem chave).
- **`cep:`** — endereço do CEP (rua, bairro, cidade/UF) pela BrasilAPI; CEP que não existe é avisado em vez de chutar.
- Os três funcionam **por e-mail e pelo Telegram** (as mesmas ferramentas), e já aparecem no `ajuda` e no CAPS da Assistente.
- **Turno à prova de queda (escutador v4.5):** uma rejeição/exceção inesperada (no e-mail, no Telegram ou numa biblioteca) podia derrubar o processo do turno inteiro; agora ela é registrada no log e o turno segue vivo.
- **Testes:** nova suíte `conta-e-comandos.js` na barreira (13 verificações) e 3 casos novos no robô (R3-35 a R3-37) — a rodada agora tem 38 e-mails.

## v12.19 — autonomia observável e web pública segura (16/10/2026)

- **Placar de capacidade, não “QI”:** a bateria diária agora traduz os sinais verificáveis da casa em qualidade, confiabilidade, resiliência, ferramentas, autonomia e pesquisa/criatividade. O painel `CAPACIDADE.md` deixa explícito que nota não é consciência nem promessa de disponibilidade.
- **Navegador público isolado:** o dono pode pedir `navegar: https://...` por e-mail/Telegram e consultar depois com `navegador: estado`; a abertura ocorre em Chrome/Chromium sem perfil e sem os segredos do chat. Ela bloqueia localhost/redes privadas, URLs com credencial e portas incomuns, e grava só título/trecho público sanitizado.
- **Melhoria contínua com freio:** vigia, bateria, oficina e marketing continuam aprendendo e operando com a autorização do dono; mudanças sensíveis, segredos, permissões e ações irreversíveis seguem exigindo revisão, teste e rollback. Tudo continua em **R$ 0** — sem prometer “1 segundo” ou 24 h sem falha de serviços gratuitos.

## v12.20 — `status:` explica o vigia sem expor detalhes (19/10/2026)

- **Estado técnico explicável:** por e-mail e Telegram, `status:` traduz somente os códigos fechados do vigia em rótulos humanos. A mensagem diferencia causas que podem ser elegíveis à recuperação interna de sinais que só devem ser observados, como API indisponível, fila sem executor ou execução que falhou.
- **Freio visível e sanitizado:** quando houver uma contenção persistida, mostra apenas a família conhecida (`e-mail` ou `bateria`) e a janela técnica; não mostra erro bruto, mensagem, endereço, URL autenticada, token, chaves desconhecidas nem campos extras do estado público.
- **Limite honesto:** é a fotografia da última checagem técnica, não uma promessa de resposta, disponibilidade ou SLA. Se a leitura do estado falhar ou vier malformada, devolve um aviso neutro em vez de inventar saúde.

## v12.21 — `status:` não confunde fotografia antiga com saúde atual (19/10/2026)

- **Frescor visível:** como o vigia publica um pulso horário, `status:` avisa quando a última fotografia passa de 1 h 30 min. O aviso não declara pane nem dispara recuperação: só impede que uma leitura antiga pareça disponibilidade presente.
- **Consistência mais rígida:** um item só aparece como saudável quando `ok` e a causa fechada `saudavel` concordam. Estado inconsistente ou data futura recebem diagnóstico neutro; timestamp futuro de recuperação é ignorado, sem ecoar o dado recebido.
- **Compacto nos dois canais:** mesmo com os oito itens, alerta de frescor e freio de recuperação, o texto fica em até 12 linhas para o Telegram. Continua sem nova sonda, canal, conta, custo ou efeito externo.

## v12.22 — falha operacional não recebe selo verde (19/10/2026)

- **Falha agora é observável:** se o turno principal ou a reserva não tiverem as credenciais de e-mail, encerram com erro em vez de aparentar ciclo vazio bem-sucedido. O vigia também devolve falha ao workflow diante de exceção fora das sondas tratadas.
- **Estado recuperável:** `vigia-estado.json` com JSON válido mas formato inválido (como `null`) é reconstruído como fotografia sanitizada, em vez de derrubar o vigia. O passo de salvar estado roda mesmo após erro para preservar uma fotografia que já tenha sido escrita.
- **Sem automação extra:** a mudança não faz dispatch, não envia aviso, não consulta canal real, não muda segredos nem cria custo. Ela só torna mais honesto o sinal de falha já existente.

## v12.23 — trabalhador preso em falha total passa a se declarar falho (19/10/2026)

- **Liveness honesto:** três erros consecutivos que escapem de um ciclo completo de caixa encerram o turno com erro não zero. Assim, um processo incapaz de ler a caixa não fica cinco horas parecendo “em execução”.
- **Tolerância a oscilação:** a primeira e a segunda falha ainda aguardam o próximo ciclo; uma varredura saudável zera o contador. A proteção não reprocessa e-mail, não cria dispatch nem transforma erro de uma mensagem isolada em pane do turno.
- **Adoção segura:** a regra pura entra na barreira e na lista de arquivos que pedem troca de turno após testes. Continua sem canal, conta, segredo, custo ou infraestrutura nova.

## v12.24 — imagens remotas viram escolha explícita (19/10/2026)

- **Privacidade da conversa:** Markdown de imagem externa não cria mais `<img>` automático na tela. Em vez disso, apresenta um link “Abrir imagem”, para que a pessoa decida se quer buscar o recurso remoto.
- **Menos rastreamento passivo:** o link abre isolado, com `noopener`, `noreferrer` e política de não enviar referer. O conteúdo textual e links comuns continuam disponíveis; só a busca automática da imagem foi retirada.
- **Paridade nas quatro rotas:** `index`, `direto`, `ligar` e `limpar` usam a mesma regra, coberta por regressão offline. Não houve nova dependência, canal, conta, custo ou consulta externa.

## v12.25 — envio, importação e links com limites claros (19/10/2026)

- **Erro sem vazar detalhe externo:** mensagens de rede/API na página e no Console agora usam categorias curtas e seguras. Não repetem texto arbitrário devolvido por servidor, URL, cabeçalho ou outro detalhe bruto.
- **Menos risco de duplicar conversa:** a página só repete leitura (`GET`) depois de uma falha transitória. Ao criar conversa, comentar, renomear, fechar ou importar, um resultado incerto não é reenviado automaticamente — atualize a lista antes de tentar de novo.
- **Importação honesta e limitada:** o JSON exportado traz versão; a importação aceita até 25 conversas e 2 MB por vez e cria somente uma nova conversa com a primeira mensagem sua de cada item. Respostas e histórico não são reenviados como se fossem instruções novas. O Chat mostra se a importação parar no meio, sem esconder o que já foi criado.
- **Links externos sob escolha e sem referer:** além das imagens, links Markdown e URLs textuais abrem isolados com `noopener`, `noreferrer` e sem referer. O clique continua sendo uma escolha da pessoa.
- **Quatro rotas e PWA coerentes:** `index`, `direto`, `ligar` e `limpar` passaram a compartilhar um contrato de segurança/fluxo; o cache estático cobre as quatro e verifica atualização periodicamente. Isto não transforma o PWA em fonte de verdade para conversas nem garante disponibilidade.

## v12.26 — entrega honesta e falha isolada observável (19/10/2026)

- **Envio sem adivinhar:** as quatro rotas agora distinguem “criando”, “mensagem criada e aguardando processamento”, resposta recebida, envio recusado e resultado incerto. Em perda de confirmação, a tela pede atualização antes de nova tentativa e não reenvia sozinha; o cartão de nova conversa e o botão de reenviar também bloqueiam duplo toque durante a escrita.
- **Contingência só com evidência:** a resposta local de contingência só começa quando uma falha recente e correlacionada do turno foi confirmada. Demora, fila, êxito, evento alheio ou consulta indisponível continuam aguardando; depois de erros repetidos de consulta, o indicador encerra com orientação explícita em vez de spinner infinito. A casca PWA avançou para `rebocl-chat-v6`, sem cachear API, query ou terceiros.
- **Falhas por mensagem sem expor mensagem:** o turno de e-mail agrega somente classes fechadas (leitura, anexo, processamento, envio, acesso, limite ou serviço) numa janela efêmera de 15 minutos. Três consecutivas viram padrão para **observar**, nunca dispatch/reprocessamento automático; uma conclusão posterior zera apenas a sequência. Não entram UID, remetente, assunto, corpo, URL, nome de anexo, erro bruto ou segredo nesse contador.
- **Cobertura controlada:** a regressão nova passou 27/27 nas quatro rotas e no agregador; a suíte rápida passou 43/43 e o Chromium controlado percorreu as quatro rotas. Foram mocks/fixtures locais, sem caixa, conversa, PAT real, API produtiva, mensagem, dispatch, custo ou nova infraestrutura. Isto não prova worker disponível, entrega real, satisfação, adoção, privacidade absoluta ou SLA.

## v12.27 — navegação assistiva e ditado sem controles ambíguos (19/10/2026)

- **Navegação por teclado e leitor de tela:** as quatro rotas agora têm nomes acessíveis nos controles principais, regiões de estado anunciadas, log de mensagens, foco visível, respeito a redução de movimento e retorno de foco ao fechar imagem ampliada. Cartões de conversa e “Nova conversa” respondem a Enter/Espaço; ao trocar de tela, o foco chega ao título da conversa ou à busca.
- **Controles coerentes:** o botão de avisos informa se está aberto, as opções alternáveis expõem estado pressionado e os dois atalhos de ditado passaram a usar um único fluxo. Isso removeu o ID duplicado `btn-mic` e a sobrescrita silenciosa de um dos manipuladores; o ditado só começa por escolha da pessoa e continua sujeito ao suporte do navegador.
- **Cobertura controlada:** novo contrato estático de acessibilidade passou 29/29 nas quatro rotas; a suíte rápida passou 44/44 e o Chromium controlado aprovou as quatro rotas. As provas usam fixtures/mocks locais, sem PAT, conversa, mensagem, API produtiva, caixa, dispatch, custo ou infraestrutura nova. Não provam uso humano, compreensão, acessibilidade absoluta, entrega real, satisfação, disponibilidade ou SLA.

## v12.28 — atualização PWA sob escolha e cópias offline sob controle (19/10/2026)

- **Atualização não interrompe escrita:** o worker v7 instala a nova casca, mas fica aguardando. A página mostra que há versão pronta e só pede ativação quando não há envio, importação, sincronização ou rascunho na caixa. “Atualizar agora” é uma escolha explícita; a página só recarrega depois da ativação escolhida. API, query e terceiros continuam fora do cache.
- **Cópias offline controláveis:** Configurações agora permite apagar a lista/histórico offline de conversas e trocas locais ainda não sincronizadas, após confirmação clara. A ação preserva as conversas no GitHub, o token autorizado, preferências, caderno e chaves locais; ela não apaga conta nem cria tráfego.
- **Cobertura controlada:** contrato PWA passou 16/16; suíte rápida 45/45; a fixture Chromium controlada aprovou as quatro rotas e, nas três rotas de conversa, verificou que rascunho bloqueia a ativação e que o worker só recebe a ordem explícita. Sem PAT, conversa, mensagem, API produtiva, caixa, dispatch, custo ou infraestrutura nova. Isto não prova atualização em dispositivos reais, perda zero em todos os navegadores, uso humano, worker disponível, satisfação, SLA ou disponibilidade contínua.

## v12.29 — limites locais de composição e Markdown (19/10/2026)

- **Texto e arquivo com limite declarado:** o compositor mostra `atual/12.000`, bloqueia envio, criação e reenvio acima disso sem mandar nada, e permite arrastar somente texto de até 1 MB. Do arquivo, acrescenta no máximo o trecho que ainda cabe; arquivo grande não é sequer lido e qualquer corte é informado antes do envio.
- **Renderização previsível:** mensagem recebida com mais de 60.000 caracteres é limitada antes do Markdown, com aviso local e escape preservado. Isto evita trabalho ilimitado de renderização no navegador; não altera a cópia já guardada no GitHub e a exportação continua sendo o caminho para o histórico disponível.
- **Cobertura controlada:** o novo contrato offline passou 19/19 nas quatro rotas; a suíte rápida passou 46/46 e o Chromium controlado continuou 4/4. Foram mocks/VM/fixtures locais, sem PAT, conversa, mensagem, arquivo privado, API produtiva, rede externa, custo ou infraestrutura nova. Não é prova de todos os navegadores, entrega, preservação completa de histórico, uso humano, satisfação, disponibilidade ou SLA.

## v12.30 — rascunho local opt-in e revisão de texto arrastado (19/10/2026)

- **Atualização PWA segura:** a casca avançou para `rebocl-chat-v8`; a mesma escolha explícita de atualização permanece, e um rascunho opt-in já salvo continua local após recarregar.
- **Rascunho só se você escolher:** em ⚙️, a opção começa desligada. Ao ativar, o Chat guarda até oito rascunhos por conversa/nova conversa **somente neste navegador**. Ele não sincroniza, não envia, não aparece sozinho na tela e pode ser restaurado ou apagado conscientemente. Um envio confirmado remove apenas o rascunho correspondente; resultado incerto o preserva para recuperação.
- **Proteção de credencial:** texto que pareça token do GitHub não vira rascunho nem mensagem de nova conversa. Use token exclusivamente no campo protegido de ⚙️.
- **Arquivo de texto revisável:** ao arrastar um `.txt`, `.md` ou outro formato aceito, a tela informa localmente o nome/tamanho e o tamanho do trecho inserido no rascunho. Não é anexo nem envio: a pessoa pode revisar/editar o texto antes de escolher Enviar.
- **Cobertura controlada:** contrato novo 22/22 em quatro rotas, regressões de limites 19/19, PWA 16/16, segurança/fluxo 30/30 e acessibilidade 29/29 passaram sem PAT, conversa, API produtiva, arquivo privado, rede externa, custo ou infraestrutura. O harness de Chromium foi atualizado e sua guarda estática passou 6/6; este sandbox específico não tinha Chromium para repetir a execução visual. Nada disso prova backup permanente, segurança física do navegador, envio/worker real, uso humano, satisfação, disponibilidade ou SLA.

## v12.31 — leitura confortável e início guiado sem ação automática (19/10/2026)

- **Leitura como preferência local:** em ⚙️, “📖 leitura confortável” aumenta fonte, espaçamento e largura de leitura das conversas. Começa desligada, não muda mensagens e não envia/sincroniza preferência alguma.
- **Começar sem decorar comandos:** o cartão “🧭 Comece por uma tarefa” oferece escrever, pesquisar, nota, cálculo e exploração. Ele usa uma lista fechada de sugestões e abre a caixa de criação para a pessoa revisar, editar ou cancelar; nenhuma consulta, conversa ou escrita é iniciada pelo clique sozinho.
- **Cobertura controlada:** novo contrato 15/15 preserva paridade das quatro rotas, preferência local e allowlist do guia. Não houve PAT, conversa, API produtiva, mensagem, rede externa, custo ou infraestrutura. A melhora não prova compreensão humana, acessibilidade universal, entrega, worker, satisfação, disponibilidade ou SLA.

## v12.32 — transparência de rede e modo somente-local temporário (19/10/2026)

- **Sem promessa escondida:** ⚙️ agora esclarece que preparar o cérebro local pode baixar biblioteca/modelo; a mensagem não é enviada por esse preparo e, uma vez pronto, o cálculo da resposta local roda no aparelho. Recursos diferentes do Chat ainda podem usar rede.
- **Controle estrito, porém honesto:** em uma conversa aberta com o cérebro já preparado, a pessoa pode confirmar “🔒 modo somente-local”. Até desligar ou recarregar, o Chat bloqueia novas requisições `fetch` iniciadas pela página, GitHub/sincronização/pesquisa/download, links externos e a ida ao Console; também para polling e a checagem PWA futura desta página. Ao desligar, rotinas que ele interrompeu não são religadas sozinhas. Não é firewall: não cancela conexão anterior nem controla navegador, sistema, extensões ou worker já ativo.
- **Sem aprisionar a navegação:** Configurações ganhou “← Voltar ao Chat”; Esc e o botão ⚙️ retornam à conversa aberta ou à lista, preservando o compositor.
- **Cobertura controlada:** novo contrato 22/22 verifica as quatro rotas, a guarda de `fetch` e novas atribuições externas de imagem/mídia antes da rede, desligamento explícito, preparação/confirmação e limites declarados. A suíte integral ficou 47/49; os mesmos dois limites ambientais de OCR/PDF sem visão permanecem, sem relação atribuída a esta interface. Não houve PAT, conversa, API produtiva, modelo, download, rede externa, custo ou infraestrutura. Isto não prova firewall real, isolamento do navegador, inferência local em aparelho real, entrega, uso humano, satisfação, disponibilidade ou SLA.

## v12.33 — pré-requisitos multimodais visíveis, sem falso verde local (19/10/2026)

- **Resultado local honesto:** quando este sandbox não tem `tesseract` ou `pdftotext`, a suíte não chama OCR/PDF de aprovado nem atribui a ausência ao produto. Ela executa o restante, mostra cada verificação não executada como `SKIP` e informa o pré-requisito ausente.
- **Barreira continua rígida:** no GitHub Actions, `REBOCL_EXIGIR_MULTIMODAL=1` torna esses mesmos pré-requisitos obrigatórios. O workflow já instala Tesseract em português e Poppler; se faltarem, OCR/PDF reprovam a barreira em vez de virar `SKIP`.
- **Evidência controlada:** neste sandbox, **48/48** verificações executadas passaram e **2** foram explicitamente ignoradas por falta de binários locais; a execução forçada com a variável da barreira falhou como esperado, comprovando que o `SKIP` não mascara CI. Nenhum e-mail, caixa, API produtiva, OCR externo, modelo, mensagem, custo ou infraestrutura foi acionado. Isto ainda não prova OCR em dispositivo real, entrega, visão, satisfação, disponibilidade ou SLA.
- **Correção e evidência remota:** a execução `39291420654` bloqueou antes do cenário PDF porque a sonda confundia o retorno não zero de `pdftotext --version` com binário ausente. Ela foi preservada como falha e corrigida com regressão específica: executável localizado segue para o cenário real; caminho ausente, sinal, timeout ou a própria leitura mal-sucedida continuam reprovando. A barreira final `39292459697` passou **50/50**, incluindo OCR 5/5 e o cenário PDF/foto sem visão; Pages `39292459612` também passou no commit `66e23b3`. Isso prova a execução técnica preparada, não OCR em aparelho real, entrega ou satisfação.

## v12.34 — casca visual compartilhada, sem framework (19/10/2026)

- **Menos cópia, mesma interface:** o CSS comum das quatro entradas passou para `chat-estilos.css`, um arquivo local da mesma origem. `index`, `direto`, `ligar` e `limpar` continuam com seus scripts e fluxos próprios; não houve unificação cega de comportamento, framework, CDN ou dependência nova.
- **Offline coerente:** a casca PWA avançou para `rebocl-chat-v9` e passou a precachear explicitamente essa folha local, mantendo a ativação de atualização sob escolha já existente. API, query e terceiros seguem fora do cache.
- **Cobertura controlada:** contrato novo 4/4 verifica a folha única, as quatro referências, ausência do bloco inline duplicado, precache e a observação da folha pela barreira/porta de continuidade. A suíte rápida integral passou **49/49**, com **2 SKIPs** locais já conhecidos por pré-requisitos multimodais ausentes; smoke HTTP estritamente local respondeu 200 nas quatro rotas e na folha. Sem PAT, conversa, API produtiva, rede externa, custo ou infraestrutura nova.

## v12.35 — atualização PWA em um único cliente local (19/10/2026)

- **Menos duplicação em comportamento sensível:** o cliente que registra o service worker, detecta versão esperando e pede a ativação escolhida saiu das quatro rotas e passou para `chat-pwa.js`, local e da mesma origem. As entradas continuam com seus fluxos específicos; não houve framework, CDN, chamada nova de API ou alteração das regras de atualização.
- **Casca offline completa:** `rebocl-chat-v10` precacheia tanto `chat-estilos.css` quanto `chat-pwa.js`. A nova versão continua aguardando escolha explícita e nunca chama `skipWaiting()` na instalação; API, query e terceiros continuam fora do cache.
- **Cobertura controlada:** contrato PWA **18/18**, segurança/fluxo **30/30** e a suíte rápida **49/49** passaram; permanecem apenas os 2 SKIPs multimodais locais já declarados. As verificações cobrem referências, cliente compartilhado, precache, porta de continuidade e, em VM, que o registro aponta só para `sw.js` e só envia a ordem de ativação após escolha. Smoke HTTP estritamente local respondeu 200 para o cliente e as quatro rotas. Nenhuma conversa, token, API produtiva, rede externa, custo ou infraestrutura foi usada.

## v12.36 — atualização PWA confirma ou devolve o controle (19/10/2026)

- **Sem botão preso:** depois de escolher atualizar, o cliente local aguarda a confirmação de troca do worker por até 15 segundos. Só essa confirmação recarrega a página; se ela não chegar — ou se o aviso ao worker falhar — a página continua aberta, explica o limite e oferece **Tentar atualizar**. Não há recarga, ativação, escrita ou tentativa automática adicional.
- **Uma regra nas quatro entradas:** o estado e o aviso da atualização também passaram para `chat-pwa.js`; `index`, `direto`, `ligar` e `limpar` continuam responsáveis por seus fluxos e por informar escrita/rascunho. A casca avançou para `rebocl-chat-v11`, com os mesmos arquivos locais aprovados; API, query e terceiros seguem fora do cache e `skipWaiting()` continua proibido na instalação.
- **Cobertura controlada:** o contrato PWA passou **20/20**, incluindo VM para escolha explícita, confirmação do worker, prazo sem recarga, tentativa posterior e falha de `postMessage`; segurança/fluxo ficou 30/30. Isto confirma código controlado, não atualização em todo navegador, worker disponível, uso humano, satisfação, disponibilidade ou SLA.

## v12.37 — modo somente-local também segura a atualização PWA (19/10/2026)

- **Uma fronteira coerente:** enquanto 🔒 modo somente-local estiver ligado, uma atualização PWA já pronta não pode ser aplicada nem recarregar a página. O aviso explica que é preciso desligar o modo antes de atualizar; ao voltar, a escolha continua manual. O modo também não pode ser ligado no intervalo curto em que uma atualização já escolhida aguarda confirmação.
- **Sem promessa de firewall:** a guarda impede a ação desta página; não cancela conexão que já começou nem controla navegador, sistema, extensões ou worker já ativo. `rebocl-chat-v12` apenas renova a casca local aprovada, sem API, query ou terceiros no cache e sem ativação silenciosa.
- **Cobertura controlada:** PWA **21/21** cobre o bloqueio e a retomada manual; modo somente-local **22/22**, segurança/fluxo **30/30** e estilos **4/4** preservam as quatro rotas. São VM/arquivos locais, não prova de isolamento de aparelho, atualização em todo navegador, uso humano, satisfação, disponibilidade ou SLA.

## v12.38 — modo somente-local cobre os transportes nativos da página (19/10/2026)

- **Mais cobertura da mesma fronteira:** com 🔒 modo somente-local ativo, o Chat agora bloqueia também novos `XMLHttpRequest`, `WebSocket`, `EventSource` e `sendBeacon` iniciados pela própria página, além de `fetch` e das atribuições novas de recursos já protegidas. Um XHR aberto antes do modo também não pode ser enviado depois dele; ao desligar, os transportes voltam a delegar normalmente.
- **Limite continua explícito:** a proteção vale para chamadas iniciadas pelo JavaScript desta página. Não cancela conexão que já começou, não controla worker, navegador, sistema ou extensões e não é firewall. `rebocl-chat-v13` apenas renova a casca local aprovada, sem API, query ou terceiros no cache e sem ativação silenciosa.
- **Cobertura controlada:** modo somente-local **23/23** cobre `fetch`/API, encadeamentos de cache, XHR, WebSocket, EventSource, beacon, mídia e retorno explícito; PWA **21/21**, segurança/fluxo **30/30** e estilos **4/4** preservam as quatro rotas. São VM/arquivos locais, não prova de isolamento de aparelho, atualização em todo navegador, uso humano, satisfação, disponibilidade ou SLA.

## v12.39 — saúde por evidência e cadência do postador (19/10/2026)

- **Estado técnico mais explicável:** o `vigia-estado.json` continua sanitizado, mas cada item saudável pode registrar somente um código fechado de evidência, como página que respondeu, turno ativo com sucessor, bateria recente ou caixa sem pendência. Texto de plataforma, e-mail, API, segredo ou erro bruto não é salvo nem exibido.
- **Cadência sem promessa falsa:** o vigia consulta a execução recente de `postagem-diaria.yml` no site. Se a última rotina bem-sucedida ficar fora da janela técnica de nove horas, informa **cadência do postador atrasada**; se a última execução falhar, informa a falha. Não tenta publicar, reexecutar nem criar fila no site. Nove horas são tolerância para agenda best-effort, não comprovação de cada cron ou de todos os canais externos.
- **`status:` mais útil:** mostra evidência fechada quando houver, como “rotina agendada recente” ou “turno ativo; sucessor na fila”, e mantém fallback neutro para estado desconhecido. Execução observada não confirma entrega, aceite da plataforma, alcance, disponibilidade ou SLA.

## v12.40 — corrente de e-mail sem cancelamento repetido (19/10/2026)

- **Menos churn, mesma continuidade:** a cada pulso de 40 minutos, o turno consulta a fila de `email.yml`. Se já houver um `workflow_dispatch` pendente ou enfileirado — o sucessor longo da corrente — ele o preserva em vez de disparar outro e cancelar o anterior pelo grupo de concorrência.
- **Reserva não vira sucessor por engano:** execuções agendadas não contam para essa decisão, porque podem ser a reserva curta. Se a consulta da fila estiver indisponível, o comportamento seguro anterior de pedir um sucessor é mantido, sem afirmar que a fila estava vazia.
- **Adoção de código preservada:** somente uma troca de código aprovada pela barreira pode substituir deliberadamente o sucessor pendente para que o próximo turno use o checkout novo. A regra pura entrou nos testes e na lista de arquivos que exigem adoção do turno: fila 5/5, contrato do coordenador 3/3 e suíte rápida 50/50 executados passaram (2 SKIPs multimodais ambientais já declarados). Não envia e-mail, Telegram, mensagem, nem cria conta, custo ou infraestrutura.

## v12.41 — handover testável, sem dispatch acidental (19/10/2026)

- **Contrato executável:** a decisão da fila agora passa por um coordenador injetável. A regressão não apenas procura texto: ela executa o fluxo com uma API falsa e confirma que um sucessor pendente não chama dispatch.
- **Caminhos críticos cobertos:** reserva agendada e turno ativo não contam como sucessor longo; ausência real pede um sucessor; troca de código aprovada ignora a consulta e substitui o checkout; falha da consulta mantém a continuidade sem dizer que a fila estava vazia.
- **Sem novo efeito externo:** o wrapper de produção continua usando a mesma API e o mesmo dispatch já existentes. A mudança só torna a garantia de não cancelar o sucessor por engano verificável offline: fila 5/5, contrato 3/3 e suíte rápida 50/50 executados passaram, com 2 SKIPs multimodais ambientais já declarados.

## v12.42 — pulso do vigia sem repetição desnecessária (19/10/2026)

- **Menos sonda duplicada:** antes de o turno de e-mail pedir o vigia, ele consulta as execuções recentes de `vigia.yml`. Uma sonda bem-sucedida há no máximo 20 minutos — ou ainda em andamento — é preservada; o pulso não cria outra execução por cima dela.
- **Continuidade acima de otimismo:** falha, data malformada/futura, execução velha ou API indisponível não viram saúde. Nesses casos, o pedido de vigia já existente continua, sem afirmar que a casa foi verificada.
- **Cobertura controlada:** a regra é pura/injetável e cobre sucesso recente, sonda ativa, falha, idade, dados inválidos e consulta indisponível. Pulso do vigia 5/5, adoção 4/4 e suíte rápida 51/51 executados passaram, com 2 SKIPs multimodais ambientais já declarados. Não lê caixa, envia mensagem nem cria custo, conta ou infraestrutura.

## v12.43 — Workspace interno local-first (20/10/2026)

- **Trabalho dentro do Chat:** o botão 🗂️ abre projetos e arquivos de texto persistidos somente neste navegador, com busca, criação/renomeação/remoção explícita, autosave, até 12 versões locais e backup/importação JSON. Os limites são 20 projetos, 100 arquivos, 512 KB por arquivo e 5 MB no total.
- **Fronteira explícita:** o Workspace usa IndexedDB separado e não chama API, GitHub, Issue, motor ou rede. A única ponte exige seleção manual e **Levar seleção ao Chat**; ela limita o trecho, tenta bloquear token reconhecível e apenas coloca o texto no compositor para revisão — não clica em enviar.
- **Limite honesto:** os arquivos dependem do navegador/perfil e podem desaparecer se os dados do site forem limpos; não é sincronização, cofre, criptografia de disco, colaboração, armazenamento de binários nem backup garantido. A atualização PWA v67 continua sendo escolhida pela pessoa, sem ativação silenciosa.

## 🚀 ATUALIZAÇÃO 13/10 — A CASA NA SUA FORMA MÁXIMA
- **~165 comandos** em 15+ famílias — o comando `!ferramentas` lista TUDO
- **47 motores de IA** — incluindo GIGANTES de 550B e 397B parâmetros (rota dupla) e um especialista em código
- **38 comandos LOCAIS** que funcionam SEM INTERNET: caderno de notas, lista de tarefas, pomodoro, tabuada, regra de três, senha, hash, conversor, morse…
- Saúde (IMC, água, respiração guiada com anel visual) · Cozinha (!cozinho frango) · Música (!piano) · Radares (aviões, asteroides, cheias de rio, ondas) · Brasil completo (CEP, CNPJ, loteria, IBGE, SELIC, tabela do Brasileirão) · Gutenberg · Xadrez · Tarô · D&D · Estúdio Ghibli
- **Auto-melhora distribuída:** os aparelhos se falam (canal ntfy), adotam motores provados entre si (!plantar) e a casa SEMEA o resumo do próprio diário todos os dias (!semear)
- **R$ 0,00 · sem conta · sem chave · offline quando precisa** → [abrir o chat](https://reboclbrank-max.github.io/chat/)
