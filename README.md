# 💬 Chat — Assistente Rebocl

Página de conversa com a **IA gratuita da Rebocl Brank**.

- **Endereço:** <https://reboclbrank-max.github.io/chat/>
- Abre no celular ou no computador. Para entrar, a página pede **um token de acesso do GitHub** (criado por você, guardado só no seu navegador — veja as instruções na própria página).
- **Não contém nenhum dado**: as conversas ficam salvas no repositório **privado** `reboclbrank-max/agente`.
- Feita em um único arquivo `index.html` (sem dependências externas), hospedada de graça no GitHub Pages.

## O que ela faz

- Lista as conversas abertas (issues do repositório privado) e **busca pelo título**.
- Cria conversa nova e envia mensagens.
- Mostra as respostas do assistente automaticamente quando o trabalhador privado está disponível e avisa por notificação. Se o navegador confirmar que o run correspondente falhou antes de iniciar, tenta uma recuperação local de contingência; isso requer o navegador aberto e não é SLA.
- Mostra **qual motor respondeu** (tag ao lado de "Assistente") e avisa quando a internet cai.
- **Exporta e importa conversas**: tudo em JSON, tudo em texto (.md), ou só uma conversa — para guardar fora do navegador ou levar para outro aparelho.
- Por conversa: **renomear**, **fechar**, **reenviar** a última mensagem e **copiar** qualquer mensagem.
- Dica: escreva `anotar: <texto>` para guardar algo na memória permanente.

## Manutenção e continuidade

Antes de qualquer alteração, leia [`CONTINUIDADE.md`](CONTINUIDADE.md), [`AGENTS.md`](AGENTS.md) e [`AUTONOMIA.md`](AUTONOMIA.md). Eles registram o mapa técnico, as proteções, a validação, os limites de autonomia e o procedimento obrigatório para quem assumir o trabalho.

Toda atualização autorizada que mude comportamento, segurança, workflow, teste ou capacidade do Chat deve atualizar também `CONTINUIDADE.md` no mesmo conjunto de commits; a barreira rápida verifica essa regra em pushes de código. Depois, registre a decisão/estado pertinente na memória privada `base`, faça commit, push e confirme os hashes remotos.

Para mudar o visual ou o texto, confira também as variantes `direto.html`, `ligar.html` e `limpar.html` quando a mudança afetar a interface. O GitHub Pages publica sozinho em ~1 minuto.

A auditoria operacional de 17/10 está em [`AUDITORIA-COMPLETA-2026-10-17.md`](AUDITORIA-COMPLETA-2026-10-17.md): ela documenta evidências, rotas, workflows, segurança, gargalos e limites. A [auditoria prática de 18/10](provas/auditoria-pratica-2026-10-18-1439.md) registrou uma página acessível, mas também que o trabalhador privado falhou antes de iniciar por restrição externa de pagamentos/limite de gasto; por isso foi adicionada uma recuperação no navegador, sem ativar cobrança. É uma contingência técnica controlada, não prova de disponibilidade ou satisfação humana. O protocolo [`AVALIACAO-PROFUNDA.md`](AVALIACAO-PROFUNDA.md) adiciona evidência controlada por dimensão, sem confundir teste técnico com satisfação humana. O piloto [`AVALIACAO-HUMANA-PILOTO.md`](AVALIACAO-HUMANA-PILOTO.md) coleta relato voluntário de uma pessoa, com consentimento e sem dados privados; ele não converte uma amostra em satisfação universal. O placar em [`CAPACIDADE.md`](CAPACIDADE.md) é operacional, não QI ou SLA.

## Segurança e privacidade

- **Token:** informe-o apenas em **⚙️ Configurar acesso**. Por escolha explícita do dono, ele permanece salvo neste navegador para manter as ações autorizadas automáticas após reiniciar; links com `?t=` e comandos `!token` não ativam nem enviam credenciais.
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

## 🚀 ATUALIZAÇÃO 13/10 — A CASA NA SUA FORMA MÁXIMA
- **~165 comandos** em 15+ famílias — o comando `!ferramentas` lista TUDO
- **47 motores de IA** — incluindo GIGANTES de 550B e 397B parâmetros (rota dupla) e um especialista em código
- **38 comandos LOCAIS** que funcionam SEM INTERNET: caderno de notas, lista de tarefas, pomodoro, tabuada, regra de três, senha, hash, conversor, morse…
- Saúde (IMC, água, respiração guiada com anel visual) · Cozinha (!cozinho frango) · Música (!piano) · Radares (aviões, asteroides, cheias de rio, ondas) · Brasil completo (CEP, CNPJ, loteria, IBGE, SELIC, tabela do Brasileirão) · Gutenberg · Xadrez · Tarô · D&D · Estúdio Ghibli
- **Auto-melhora distribuída:** os aparelhos se falam (canal ntfy), adotam motores provados entre si (!plantar) e a casa SEMEA o resumo do próprio diário todos os dias (!semear)
- **R$ 0,00 · sem conta · sem chave · offline quando precisa** → [abrir o chat](https://reboclbrank-max.github.io/chat/)
