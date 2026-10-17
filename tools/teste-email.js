// 🧪 ROBÔ DE TESTE DO CHAT POR E-MAIL — v3 (14/10/2026)
// v3.5: caso R3-13 — FOTO DE BILHETE (texto escrito na imagem → leitor de texto LOCAL/tesseract da v12).
// v3.6: varredura rápida — só e-mails desde ontem, cabeçalho antes do conteúdo, nada relido (UIDs estáveis).
// v3.7: caso R3-14 — FOTO COMPLEXA da horta (o ponto aberto "descrição completa da foto") + anexo JPEG com tipo certo;
//       caso R3-15 — VISÃO LOCAL forçada pela chave [VISAO-LOCAL] (prova o caminho que só roda quando a internet cai).
// v3.8: separa FALHOU de MODO DE PANE — se a checagem falha e a resposta admite pane (visão local, motores fora/
//       oscilando, foto não vista), a nota vira "PANE — FALHOU (…)" e o placar conta à parte (rodada 16).
// v3.9: caso R3-16 — foto + PDF com a chave [SEM-VISAO] (prova em produção o caminho "nada vê a foto" da v12.8);
//       caso R3-17 — FOTO DE CELULAR (12 MP, gravada deitada com a marca EXIF 6), que o chat v12.9 prepara antes.
// v3.10: e-mail SEM RESPOSTA ganha o motivo (LIDO sem resposta / NÃO LIDO / fora da caixa) — rodada 20.
// v3.11: R3-18 — e-mail PERDIDO (chega como lido; a rede de segurança do chat v12.13 tem de devolvê-lo à fila);
//        R3-19 — e-mail AUTOMÁTICO (Auto-Submitted): o certo é NÃO responder (RFC 3834) — PASS = lido e sem resposta.
// v3.12: e-mails no FORMATO REAL do Gmail e do iPhone (R3-22, R3-23), 3 fotos (R3-24), HEIC (R3-25), memória pela
//        conversa do Gmail (R3-20), remetente não autorizado (R3-21) e foto de celular de ~6 MB no R3-17.
// v3.13: cérebro local de texto (R3-26), remetente falsificado (R3-27), nota de voz (R3-28), planilha (R3-29) e
//        PDF escaneado de 2 páginas (R3-30); anexos genéricos (áudio, planilha, PDF) gerados na hora.
// v3.14: lembrete entregue na hora (R3-31, 2 respostas), pesquisa com fonte (R3-32), planilha gerada (R3-33) e
//        vídeo curto (R3-34); a resposta registra os nomes dos anexos (📎 anexos: …).
// v3.15: o registro do envio guarda a marca do lembrete (o robô esperava só 1 resposta e encerrava antes da hora);
//        os links da resposta são lidos do e-mail bruto (o leitor do chat tira links do texto de entrada).
// v3.16: casos R3-35 a R3-37 — os comandos novos da v12.18: conta: (local, 267,5 na hora), feriado: (datas + nomes)
//        e cep: 49300000 (Tobias Barreto — SE, pela BrasilAPI).
// v3.19: 🪶 varre do MAIS NOVO para o mais velho — se o Gmail cortar a conexão no meio da varredura
//        (fez isso a tarde toda de 16/10), a rodada de HOJE já foi coletada; os restos antigos não importam.
// v3.18: 🪶 varredura mais leve e com sonda de vida — "Todos os e-mails" fica fora (é cópia de INBOX+Enviados e
//        dobrava o trabalho); antes de varrer, um STATUS rápido confere se a conexão está viva (conexão meia-morta
//        não queima mais 2 min de teto). Motivação: 16/10 à noite, o Gmail derrubava as varreduras pesadas.
// v3.17: 🛡️ COLETA À PROVA DE CONEXÃO MORTA — o Gmail derrubou a conexão IMAP do robô no meio da espera (16/10:
//        "Connection not available" e uma rodada travada até o teto do workflow). Agora cada operação tem teto de
//        tempo, a conexão morta é destruída e refeita na hora, o envio tenta 2x e a rodada termina sempre com relatório.
// Melhorias sobre a v2: usa o MESMO parser do canal (pegaTexto), casa cada resposta com o e-mail
// que a originou (In-Reply-To = thread exata) e roda CHECAGENS AUTOMÁTICAS por caso no relatório.
const fs = require('fs');
const path = require('path');
const { notaSemResposta, notaDoCaso, resumoDasNotas } = require('./teste-email-resultado');
const { aliasesDeTeste } = require('./teste-email-remetentes');
// v3.8: frases que o chat usa quando responde em modo degradado (motores da internet fora)
const PANE = /vis[ãa]o local|motores[^.\n]{0,40}(fora|oscilando)|c[ée]rebros[^.\n]{0,20}oscilando|n[ãa]o (p[ôo]de|pude|consegui|conseguiu)[^.\n]{0,25}(ver|vista)/i;
function avalia(e, texto) {
  const nota = e.check(texto);
  if (nota.indexOf('PASS') === 0 || !PANE.test(texto)) return nota;
  return 'PANE — ' + nota + ' · respondeu em modo de pane (motores da internet fora)';
}

const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 25);
const ALIASES = aliasesDeTeste(USER);
const ALIAS = ALIASES.teste;
const MARCA = '[TESTE-REBOCL]';
const ALIAS_ESTRANHO = ALIASES.estranho;   // v3.12: remetente não autorizado
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mascarar = a => { const s = String(a || ''); const i = s.indexOf('@'); return i < 3 ? '***' : s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i); };

// ---- casos da rodada 3 ----
const CASOS = [
  { n: 'R3-1', assunto: MARCA + ' R3-1 — recursos', esperado: 'Dizer os recursos certos: vê fotos, tem comandos (clima/cambio/hora/noticias/status), e o que NÃO tem (WhatsApp etc.).',
    check: t => (/foto/i.test(t) && /whatsapp/i.test(t)) ? 'PASS (cita foto e WhatsApp)' : 'FALHOU (não citou foto/WhatsApp)',
    corpo: 'Me diga, sem enfeite: quais recursos você tem por aqui e quais NÃO tem? (responda em lista curta)' },
  { n: 'R3-2', assunto: MARCA + ' R3-2 — clima local', esperado: 'Clima real de Tobias Barreto (ferramenta), com graus.',
    check: t => /[0-9]+\s*°C/.test(t) ? 'PASS (°C presente)' : 'FALHOU (sem temperatura)',
    corpo: 'clima: Tobias Barreto' },
  { n: 'R3-3', assunto: MARCA + ' R3-3 — poema', esperado: 'Poema curto de 4 linhas, tema rio/cidade, para ler de manhã.',
    check: t => (t.split(NL).filter(l => l.trim()).length >= 4) ? 'PASS (4+ linhas)' : 'FALHOU (curto demais)',
    corpo: 'Escreva um poeminha de 4 linhas sobre o rio daqui, pro dono ler de manhã. Capricha.' },
  { n: 'R3-4', assunto: MARCA + ' R3-4 — tradução', esperado: 'Tradução natural para inglês.',
    check: t => /wakes up early|works in silence|Rebocl house/i.test(t) ? 'PASS (tradução plausível)' : 'FALHOU (sem tradução)',
    corpo: 'Traduza para o inglês, de forma natural: "A casa Rebocl acorda cedo e trabalha em silêncio." Só a tradução e uma nota curta.' },
  { n: 'R3-5', assunto: MARCA + ' R3-5 — código', esperado: 'Citar trim() em JavaScript.',
    check: t => /trim\(\)/.test(t) ? 'PASS (trim)' : 'FALHOU (não citou trim)',
    corpo: 'Em uma linha de JavaScript: como eu tiro os espaços do começo e do fim de um texto? Explique em uma frase.' },
  { n: 'R3-6', assunto: MARCA + ' R3-6 — foto nova', foto: true, esperado: 'quadrado azul, círculo vermelho, triângulo verde e o texto "CASA REBOCL 14/10/2026".',
    check: t => (/quadrado|square/i.test(t) && /c[íi]rculo|circle/i.test(t) && /2026/.test(t)) ? 'PASS (formas + data completa)' : (/lupa/i.test(t) && /REBOCL/i.test(t) && /2026/.test(t) ? 'PASS (lupa de texto — visão oscilou, mas o texto veio)' : 'FALHOU (faltou algo)'),
    corpo: 'Anexei uma foto nova do laboratório. Leia TODO o texto exatamente como aparece e liste as formas e cores.' },
  { n: 'R3-7', assunto: MARCA + ' R3-7 — ajuda', esperado: 'Lista de comandos e assinatura ÚNICA (o defeito da assinatura dupla foi corrigido).',
    check: t => { const c = (t.match(/— Assistente Rebocl \(casa Rebocl Brank\)/g) || []).length; return c === 1 ? 'PASS (assinatura única)' : 'FALHOU (assinatura aparece ' + c + 'x)'; },
    corpo: 'ajuda' },
  { n: 'R3-8', assunto: MARCA + ' R3-8 — memória (1/2)', esperado: 'Confirmar que guardou a palavra JATOBÁ.',
    check: t => /guardad|anotad|combinad|confirmad|jatob/i.test(t) ? 'PASS (confirmou)' : 'FALHOU',
    corpo: 'Guarde uma palavra-chave para a próxima mensagem: JATOBÁ é o nome que eu dei pra horta. Responda só confirmado.' },
  { n: 'R3-9', assunto: MARCA + ' R3-9 — limites (2ª vez)', esperado: 'Limites reais SEM dizer que não abre anexos/fotos (o CAPS foi aplicado).',
    check: t => /n[ãa]o (consigo|posso) (abrir|processar) (arquivos|anexos|fotos)/i.test(t) ? 'FALHOU (ainda diz que não vê anexos)' : 'PASS (não nega a visão)',
    corpo: 'Conte com franqueza: o que você ainda erra ou não faz direito? Cite 3 coisas reais.' },
  { n: 'R3-10', assunto: MARCA + ' R3-10 — assunto com emoji 🙂', esperado: 'Ler assunto com emoji e responder em uma linha.',
    check: t => t.trim().length > 5 ? 'PASS (respondeu)' : 'FALHOU (vazio)',
    corpo: 'Você conseguiu ler este assunto com emoji? Responda em uma linha, simpática.' },
  { n: 'R3-11', assunto: MARCA + ' R3-11 — e-mail só HTML', esperado: 'E-mail sem parte de texto puro (só HTML, como celular manda): ler a pergunta e responder sem vazar tags.', check: t => (/31/.test(t) && !/<[a-z][^>]*>/i.test(t) && !/&[a-z]+;/i.test(t)) ? 'PASS (leu o HTML, 31 dias, sem tags na resposta)' : 'FALHOU (tags na resposta ou não achou 31)', html: true,
    corpo: '<html><body><div style="font-family:sans-serif"><p>Oi! <b>Pergunta:</b> quantos dias tem o m&ecirc;s de outubro?</p><p>Responda s&oacute; o n&uacute;mero. &nbsp;</p></div></body></html>' },
  { n: 'R3-12', assunto: MARCA + ' R3-12 — foto + PDF juntos', foto: true, pdf: true,
    esperado: 'FOTO e PDF na MESMA mensagem: a resposta fala do PDF (couve/horta) e também da imagem.',
    check: t => (/couve|horta/i.test(t) && /foto|imagem/i.test(t)) ? 'PASS (respondeu o PDF e a foto juntos)' : 'FALHOU (ignorou um dos dois)',
    corpo: 'Anexei uma FOTO e um PDF juntos. Me diga o que tem na foto e quantos pés de couve diz o PDF.' },
  { n: 'R3-13', assunto: MARCA + ' R3-13 — foto de bilhete', fotoArq: 'foto-bilhete.png',
    esperado: 'FOTO de um bilhete de papel: ler o que está escrito (horta, varanda, portão/trinco) e quem assinou (Dona Marta) — aqui entra o leitor de texto LOCAL (tesseract).',
    check: t => { const achou = ['horta', 'varanda', 'trinco|port[ãa]o', 'marta'].filter(p => new RegExp(p, 'i').test(t)).length; return achou >= 3 ? 'PASS (leu o bilhete: ' + achou + '/4 trechos)' : 'FALHOU (leu só ' + achou + '/4 trechos do bilhete)'; },
    corpo: 'Achei este bilhete em cima da mesa. O que está escrito nele e quem assinou?' },
  { n: 'R3-14', assunto: MARCA + ' R3-14 — foto complexa (horta)', fotoArq: 'foto-horta.jpg',
    esperado: 'FOTO COMPLEXA de uma horta: descrever o que aparece — canteiros de verduras, regador vermelho, cachorro deitado, cerca de madeira (PASS com 3 dos 4).',
    check: t => { const g = [/horta|alface|couve|verdura|hortali|canteir|vegeta/i, /regador/i, /cachorr|\bc[ãa]o\b|cadel/i, /cerca|estaca/i]; const achou = g.filter(r => r.test(t)).length; return achou >= 3 ? 'PASS (descreveu a cena: ' + achou + '/4 elementos)' : 'FALHOU (só ' + achou + '/4 elementos da cena)'; },
    corpo: 'Tirei essa foto do quintal agora. O que você vê nela? Descreve tudo que der.' },
  { n: 'R3-15', assunto: MARCA + ' R3-15 — visão local [VISAO-LOCAL]', fotoArq: 'teste-visao3.png',
    esperado: 'Caminho da VISÃO LOCAL (a chave [VISAO-LOCAL] pula a visão da internet): formas + texto da foto do laboratório, dizendo que veio da visão local.',
    check: t => (/quadrado|square/i.test(t) && /c[íi]rculo|circle/i.test(t) && /REBOCL|2026/i.test(t) && /vis[ãa]o local/i.test(t)) ? 'PASS (visão local viu as formas e o texto, e disse de onde veio)' : 'FALHOU (faltou forma, texto ou o aviso de visão local)',
    corpo: 'Teste da visão local: o que tem nesta imagem? Liste formas, cores e o texto.' },
  { n: 'R3-16', assunto: MARCA + ' R3-16 — foto + PDF sem visão [SEM-VISAO]', foto: true, pdf: true,
    esperado: 'Caminho SEM VISÃO (a chave [SEM-VISAO] desliga a visão da internet e a local): responder o PDF (12 pés de couve) e dizer com franqueza que a foto não foi vista — inventar a foto reprova.',
    check: t => { const doc = /\b12\b/.test(t) && /couve/i.test(t); const franca = /n[ãa]o (p[ôo]de|pude|consegui|conseguiu|foi poss[íi]vel|deu|tenho como|d[áa] para)[^.\n]{0,50}(\bver\b|vist|enxerg|analis|olh|visualiz|descrev)|sem (conseguir )?ver a (foto|imagem)|n[ãa]o vi a (foto|imagem)|(foto|imagem) n[ãa]o (p[ôo]de|foi|p[ôo]de ser)[^.\n]{0,20}(vist|analis|visualiz)/i.test(t); return (doc && franca) ? 'PASS (respondeu o PDF e disse com franqueza que a foto não foi vista)' : (doc ? 'FALHOU (respondeu o PDF, mas não foi franco sobre a foto)' : 'FALHOU (não respondeu o PDF)'); },
    corpo: 'Teste do modo sem visão: quantos pés de couve diz o PDF? E o que dá para saber da foto?' },
  { n: 'R3-17', assunto: MARCA + ' R3-17 — foto de celular (12 MP, deitada)', fotoArq: 'foto-grande.jpg',
    esperado: 'FOTO DE CELULAR de verdade: 12 MP, ~6 MB (antes da v12.14, acima de ~4 MB era descartada sem aviso), gravada deitada com a marca EXIF 6 (como o celular faz). O chat prepara a foto (em pé, menor) e descreve a horta — canteiros, regador, cachorro, cerca (PASS com 3 dos 4).',
    check: t => { const g = [/horta|alface|couve|verdura|hortali|canteir|vegeta/i, /regador/i, /cachorr|\bc[ãa]o\b|cadel/i, /cerca|estaca/i]; const achou = g.filter(r => r.test(t)).length; return achou >= 3 ? 'PASS (descreveu a foto de celular: ' + achou + '/4 elementos)' : 'FALHOU (só ' + achou + '/4 elementos da foto de celular)'; },
    corpo: 'Tirei essa foto do quintal com o celular agora. O que você vê nela?' },
  { n: 'R3-18', assunto: MARCA + ' R3-18 — e-mail perdido (chega como lido)', lido: true,
    esperado: 'REDE DE SEGURANÇA: o e-mail chega já marcado como LIDO (como se tivesse sumido da fila, igual à rodada 20). A auditoria do chat (a cada 5 min, com 8 min de folga) tem de devolvê-lo à fila — e ele tem de ser respondido.',
    check: t => t.trim().length > 5 ? 'PASS (a rede de segurança devolveu o e-mail à fila e ele foi respondido)' : 'FALHOU (resposta vazia)',
    corpo: 'Teste da rede de segurança: este e-mail chegou como LIDO, como se tivesse sumido da fila. Responda só: recebido.' },
  { n: 'R3-19', assunto: MARCA + ' R3-19 — e-mail automático (não responder)', cab: ['Auto-Submitted: auto-generated'], semResposta: true,
    esperado: 'E-mail AUTOMÁTICO (cabeçalho Auto-Submitted: auto-generated): pela RFC 3834 o chat NÃO responde — evita laço de respostas automáticas. PASS se ele for lido e ficar sem resposta.',
    corpo: 'Este é um aviso automático de teste. Não responda.' },
  { n: 'R3-21', assunto: MARCA + ' R3-21 — remetente desconhecido', de: ALIAS_ESTRANHO,
    esperado: 'Remetente NÃO autorizado (endereço que não é do dono nem do robô): o chat manda só uma resposta curta e fixa — sem IA, sem abrir anexo e sem responder a pergunta.',
    check: t => (/n[ãa]o est[áa] autorizado/i.test(t) && !/\b56\b/.test(t)) ? 'PASS (resposta curta, sem IA, sem responder a conta)' : (/\b56\b/.test(t) ? 'FALHOU (respondeu a pergunta de um desconhecido)' : 'FALHOU (faltou o aviso de não autorizado)'),
    corpo: 'Quanto é 7 vezes 8? Responda só o número.' },
  { n: 'R3-22', assunto: MARCA + ' R3-22 — e-mail do Gmail com foto', foto: true, formato: 'gmail',
    esperado: 'E-mail montado como o GMAIL monta (texto dentro de multipart/alternative, foto anexada): antes da v12.14 a pergunta se perdia. Tem de responder PIMENTA (só está na pergunta) e a data da imagem.',
    check: t => (/PIMENTA/i.test(t) && /14\/10\/2026/.test(t)) ? 'PASS (leu a pergunta do corpo e viu a foto)' : (/PIMENTA/i.test(t) ? 'FALHOU (leu a pergunta, mas não a data)' : 'FALHOU (a pergunta do corpo não chegou)'),
    corpo: 'Responda primeiro com a palavra PIMENTA e depois diga qual é a data escrita nesta imagem.' },
  { n: 'R3-23', assunto: MARCA + ' R3-23 — e-mail do iPhone com foto', foto: true, formato: 'iphone',
    esperado: 'E-mail montado como o Mail do IPHONE monta (texto em base64, foto dentro de multipart/related): antes da v12.14 o texto chegava em base64 e a foto não era achada. Tem de responder GOIABA e citar as formas.',
    check: t => { const f = [/quadrado/i, /c[íi]rculo/i, /tri[âa]ngulo/i].filter(r => r.test(t)).length; return (/GOIABA/i.test(t) && f >= 2) ? 'PASS (leu o texto do iPhone e viu a foto: ' + f + '/3 formas)' : (/GOIABA/i.test(t) ? 'FALHOU (leu o texto, mas não viu a foto)' : 'FALHOU (o texto do iPhone não chegou)'); },
    corpo: 'Responda primeiro com a palavra GOIABA e depois diga quais formas aparecem nesta foto.' },
  { n: 'R3-24', assunto: MARCA + ' R3-24 — três fotos no mesmo e-mail', fotos: ['teste-visao3.png', 'foto-bilhete.png', 'foto-horta.jpg'],
    esperado: 'TRÊS FOTOS no mesmo e-mail (formas, bilhete, horta): antes só a 1ª era vista. A resposta tem de falar das três.',
    check: t => { const g = [/quadrado|c[íi]rculo|tri[âa]ngulo|formas? geom/i, /bilhete|marta|varanda|trinco|port[ãa]o/i, /cachorr|\bc[ãa]o\b|regador|cerca|canteir|hortali/i]; const n = g.filter(r => r.test(t)).length; return n === 3 ? 'PASS (falou das 3 fotos)' : 'FALHOU (falou de ' + n + ' das 3 fotos)'; },
    corpo: 'Mandei 3 fotos. Diga, em uma linha por foto, o que aparece em cada uma.' },
  { n: 'R3-25', assunto: MARCA + ' R3-25 — foto HEIC do iPhone', fotoArq: 'foto-iphone.heic',
    esperado: 'Foto em HEIC (o formato padrão do iPhone): antes da v12.14 nem era reconhecida como foto. Tem de descrever a horta (3 de 4).',
    check: t => { const g = [/horta|alface|couve|verdura|hortali|canteir|vegeta/i, /regador|rega\b/i, /cachorr|\bc[ãa]o\b|cadel/i, /cerca|estaca/i]; const n = g.filter(r => r.test(t)).length; return n >= 3 ? 'PASS (abriu a HEIC e descreveu: ' + n + '/4)' : 'FALHOU (só ' + n + '/4 elementos — a HEIC abriu?)'; },
    corpo: 'Tirei essa foto com o iPhone. O que você vê nela?' },
  { n: 'R3-26', assunto: MARCA + ' R3-26 — sem internet [SEM-INTERNET]',
    esperado: 'CÉREBRO LOCAL DE TEXTO: a chave [SEM-INTERNET] desliga os motores de texto da internet; o modelo local (o mesmo da visão local) responde 12×12 = 144 e a resposta diz que veio do cérebro local.',
    check: t => (/\b144\b/.test(t) && /c[ée]rebro local/i.test(t)) ? 'PASS (o cérebro local respondeu 144 e disse de onde veio)' : (/c[ée]rebro local/i.test(t) ? 'FALHOU (o cérebro local respondeu, mas errou a conta)' : 'FALHOU (o cérebro local não respondeu)'),
    corpo: 'Quanto é 12 vezes 12? Responda em uma frase curta.' },
  { n: 'R3-27', assunto: MARCA + ' R3-27 — remetente falsificado',
    cab: ['Authentication-Results: mx.google.com; dkim=fail header.i=@gmail.com header.s=20230601; spf=softfail (google.com: domain of transitioning teste@gmail.com does not designate 203.0.113.9 as permitted sender) smtp.mailfrom=teste@gmail.com; dmarc=fail (p=NONE sp=QUARANTINE dis=NONE) header.from=gmail.com'],
    esperado: 'REMETENTE FALSIFICADO: o "De" é um endereço autorizado, mas o carimbo do Gmail diz que a autenticação FALHOU (dkim/spf/dmarc). O chat não confia no "De": resposta curta, sem IA.',
    check: t => (/n[ãa]o est[áa] autorizado/i.test(t) && !/\b81\b/.test(t)) ? 'PASS (não confiou no "De" falsificado)' : (/\b81\b/.test(t) ? 'FALHOU (respondeu um remetente falsificado)' : 'FALHOU (faltou o aviso de não autorizado)'),
    corpo: 'Quanto é 9 vezes 9? Responda só o número.' },
  { n: 'R3-28', assunto: MARCA + ' R3-28 — nota de voz', arquivos: [['nota-de-voz.ogg', 'nota-de-voz.mp3']],
    esperado: 'NOTA DE VOZ (como o WhatsApp manda, .ogg/opus): o chat transcreve e responde — a palavra secreta MANGUEIRA e a conta (2+3) só estão no áudio.',
    check: t => (/MANGUEIRA/i.test(t) && /\b5\b|cinco/i.test(t)) ? 'PASS (ouviu a nota de voz e respondeu)' : (/MANGUEIRA/i.test(t) ? 'FALHOU (ouviu, mas não respondeu a conta)' : 'FALHOU (não ouviu o áudio)'),
    corpo: 'Mandei uma nota de voz. Responda o que eu perguntei no áudio e repita a palavra secreta.' },
  { n: 'R3-29', assunto: MARCA + ' R3-29 — planilha Excel', arquivos: [['materiais.xlsx']],
    esperado: 'PLANILHA EXCEL (.xlsx): antes da v12.15 não era lida. Tem de dizer quantos tijolos (500) e o preço do cimento (38,90).',
    check: t => (/\b500\b/.test(t) && /38[,.]9/.test(t)) ? 'PASS (leu a planilha)' : 'FALHOU (não leu a planilha)',
    corpo: 'Na planilha anexa, quantos tijolos tem e qual é o preço do cimento?' },
  { n: 'R3-30', assunto: MARCA + ' R3-30 — PDF escaneado de 2 páginas', arquivos: [['pdf-escaneado.pdf']],
    esperado: 'PDF DIGITALIZADO com 2 páginas (só imagem, sem texto): antes da v12.15 só a 1ª página era lida. A senha do portão (4721) está na página 2.',
    check: t => /\b4721\b/.test(t) ? 'PASS (leu a página 2 do PDF escaneado)' : 'FALHOU (não leu a página 2)',
    corpo: 'Qual é a senha do portão que aparece na página 2 do PDF anexo?' },
  { n: 'R3-31', assunto: MARCA + ' R3-31 — lembrete', lembrete: true,
    esperado: 'LEMBRETE: "daqui a 2 minutos" — o chat confirma (com dia e hora) e, na hora marcada, manda o lembrete na mesma conversa (guardado na própria caixa, sobrevive à troca de turno).',
    check: t => (/vou te lembrar/i.test(t) && /⏰ Lembrete:[^\n]*testar o lembrete/i.test(t)) ? 'PASS (confirmou e entregou o lembrete na hora)' : (/vou te lembrar/i.test(t) ? 'FALHOU (confirmou, mas o lembrete não chegou na janela)' : 'FALHOU (não confirmou o lembrete)'),
    corpo: 'lembrete: daqui a 2 minutos testar o lembrete da casa' },
  { n: 'R3-32', assunto: MARCA + ' R3-32 — pesquisa com fonte',
    esperado: 'PESQUISA COM FONTE: busca na Wikipédia/buscador e responde citando as fontes, com o endereço de cada uma.',
    check: t => (/Aracaju/i.test(t) && /https?:\/\//.test(t)) ? 'PASS (respondeu Aracaju e citou a fonte)' : (/Aracaju/i.test(t) ? 'FALHOU (respondeu, mas sem o endereço da fonte)' : 'FALHOU (a pesquisa não respondeu)'),
    corpo: 'pesquisa: capital de Sergipe' },
  { n: 'R3-33', assunto: MARCA + ' R3-33 — planilha gerada',
    esperado: 'RESPOSTA COM ARQUIVO: "faça uma planilha…" — a resposta volta com planilha.xlsx anexa.',
    check: t => /📎 anexos:[^\n]*planilha\.xlsx/.test(t) ? 'PASS (veio a planilha.xlsx anexa)' : 'FALHOU (a planilha não veio anexa)',
    corpo: 'Faça uma planilha com 3 materiais de construção e o preço estimado de cada um.' },
  { n: 'R3-34', assunto: MARCA + ' R3-34 — vídeo curto', arquivos: [['video-curto.mp4']],
    esperado: 'VÍDEO CURTO (6 s: a horta e depois o bilhete, com uma fala): o chat tira quadros e o áudio — tem de dizer a palavra falada (JABUTICABA) e algo do que aparece.',
    check: t => (/jabuticaba/i.test(t) && /horta|regador|cachorr|canteir|bilhete|marta|planta|jardim/i.test(t)) ? 'PASS (viu os quadros e ouviu a fala do vídeo)' : (/jabuticaba/i.test(t) ? 'FALHOU (ouviu, mas não descreveu o que aparece)' : 'FALHOU (não ouviu a fala do vídeo)'),
    corpo: 'Mandei um vídeo curto. O que aparece nele e qual é a palavra falada no vídeo?' },
  { n: 'R3-35', assunto: MARCA + ' R3-35 — conta rápida', esperado: 'CONTA LOCAL: (1250*0,15)+80 volta = 267,5 na hora, sem motor.',
    check: t => /267[.,]5/.test(t) ? 'PASS (267,5 na hora)' : 'FALHOU (não veio 267,5)',
    corpo: 'conta: (1250*0,15)+80' },
  { n: 'R3-36', assunto: MARCA + ' R3-36 — próximos feriados', esperado: 'FERIADOS NACIONAIS pela ferramenta: datas DD/MM/AAAA com nome.',
    check: t => (/[0-9]{2}\/[0-9]{2}\/[0-9]{4}/.test(t) && /consci[êe]ncia|independ[êe]ncia|finados|natal|padroeira|trabalh|carnaval|tiradentes|sexta-feira santa/i.test(t)) ? 'PASS (datas + feriados)' : 'FALHOU (sem feriado com data)',
    corpo: 'feriado:' },
  { n: 'R3-37', assunto: MARCA + ' R3-37 — endereço por CEP', esperado: 'ENDEREÇO DO CEP 49300-000 pela ferramenta (Tobias Barreto — SE).',
    check: t => /Tobias Barreto|Sergipe/i.test(t) ? 'PASS (cidade/UF do CEP)' : 'FALHOU (sem endereço)',
    corpo: 'cep: 49300000' }
];
const M3 = { n: 'R3-20', assunto: 'Re: ' + MARCA + ' R3-8 — memória (1/2)',
  esperado: 'MEMÓRIA PELA CONVERSA DO GMAIL: a chave [SEM-MEMORIA] faz o chat ignorar a memória do turno e a citação — só a conversa guardada no Gmail pode lembrar JATOBÁ (é a memória que sobrevive à troca de turno).',
  check: t => /JATOB[ÁA]/i.test(t) ? 'PASS (lembrou JATOBÁ pela conversa do Gmail)' : 'FALHOU (não lembrou pela conversa)' };
const M2 = { n: 'R3-8b', assunto: 'Re: ' + MARCA + ' R3-8 — memória (1/2)',
  esperado: 'Dizer JATOBÁ (memória citada funcionando).',
  check: t => /JATOB[ÁA]/i.test(t) ? 'PASS (lembrou JATOBÁ)' : 'FALHOU (não lembrou)', corpo: '' };

function montaMensagem(assunto, corpo, imgB64, html, pdfB64, imgNome, extraCab, opc) {
  // v3.12: formatos REAIS — 'gmail' (multipart/mixed > multipart/alternative > text/plain QP + text/html; fronteiras
  // hexadecimais minúsculas) e 'iphone' (multipart/alternative > text/plain base64 + multipart/related > html + foto
  // inline); várias fotos; HEIC; resposta na mesma conversa (In-Reply-To/References); remetente escolhido
  opc = opc || {};
  const tipoDe = n => /\.jpe?g$/i.test(n) ? 'image/jpeg' : (/\.hei[cf]$/i.test(n) ? 'image/heic' : 'image/png');
  const imagens = opc.imagens || (imgB64 ? [{ nome: imgNome || 'teste-visao3.png', b64: imgB64 }] : []);
  const id = '<teste-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + (opc.de || ALIAS) + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id]
    .concat(opc.inReplyTo ? ['In-Reply-To: ' + opc.inReplyTo, 'References: ' + (opc.references || opc.inReplyTo)] : [])
    .concat(extraCab || []).concat(['MIME-Version: 1.0']);
  const b64 = s => Buffer.from(s, 'utf-8').toString('base64').match(/.{1,76}/g).join(CRLF);
  const anexosImg = b => imagens.flatMap(im => ['--' + b, 'Content-Type: ' + tipoDe(im.nome) + '; name="' + im.nome + '"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="' + im.nome + '"', '', im.b64.match(/.{1,76}/g).join(CRLF)]);
  let bruto;
  if (opc.formato === 'gmail') {
    const A = '0000000000' + Date.now().toString(16) + 'a1', B = '0000000000' + Date.now().toString(16) + 'b2';
    const partes = ['--' + A, 'Content-Type: multipart/alternative; boundary="' + B + '"', '',
      '--' + B, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: quoted-printable', '', qpCodifica(corpo), '',
      '--' + B, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: quoted-printable', '', qpCodifica('<div dir="ltr">' + corpo + '</div>'), '',
      '--' + B + '--'].concat(anexosImg(A)).concat(['--' + A + '--', '']);
    bruto = cab.concat(['Content-Type: multipart/mixed; boundary="' + A + '"', '', partes.join(CRLF)]).join(CRLF);
  } else if (opc.formato === 'iphone') {
    const C = 'Apple-Mail-' + Date.now().toString(16).toUpperCase() + '-A', D = 'Apple-Mail-' + Date.now().toString(16).toUpperCase() + '-B';
    const inline = imagens.flatMap((im, i) => ['--' + D, 'Content-Type: ' + tipoDe(im.nome) + ';', '\tname=' + im.nome, 'Content-Disposition: inline;', '\tfilename=' + im.nome, 'Content-Transfer-Encoding: base64', 'Content-Id: <foto' + i + '@iphone>', '', im.b64.match(/.{1,76}/g).join(CRLF)]);
    const partes = ['--' + C, 'Content-Type: text/plain;', '\tcharset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(corpo), '',
      '--' + C, 'Content-Type: multipart/related;', '\ttype="text/html";', '\tboundary=' + D, '',
      '--' + D, 'Content-Type: text/html;', '\tcharset=utf-8', 'Content-Transfer-Encoding: base64', '', b64('<html><body>' + corpo + imagens.map((im, i) => '<img src="cid:foto' + i + '@iphone">').join('') + '</body></html>'), '']
      .concat(inline).concat(['--' + D + '--', '', '--' + C + '--', '']);
    bruto = cab.concat(['Content-Type: multipart/alternative;', '\tboundary=' + C, '', partes.join(CRLF)]).join(CRLF);
  } else if (html && !imagens.length && !(opc.arquivos || []).length) bruto = cab.concat(['Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF);
  else if (!imagens.length && !pdfB64 && !(opc.arquivos || []).length) bruto = cab.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF);
  else {
    const b = 'fronteira-teste-' + Date.now();
    const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo].concat(anexosImg(b));
    if (pdfB64) partes.push('--' + b, 'Content-Type: application/pdf; name="anexo-prova.pdf"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="anexo-prova.pdf"', '', pdfB64.match(/.{1,76}/g).join(CRLF));
    for (const a of (opc.arquivos || [])) partes.push('--' + b, 'Content-Type: ' + a.tipo + '; name="' + a.nome + '"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="' + a.nome + '"', '', a.b64.match(/.{1,76}/g).join(CRLF));   // v3.13
    partes.push('--' + b + '--', '');
    bruto = cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF);
  }
  return { bruto, id };
}
function qpCodifica(s) {   // quoted-printable (UTF-8) como o Gmail manda, linhas de até 76
  let out = '', linha = '';
  for (const b of Buffer.from(String(s), 'utf-8')) {
    const c = ((b >= 33 && b <= 126 && b !== 61) || b === 32) ? String.fromCharCode(b) : '=' + b.toString(16).toUpperCase().padStart(2, '0');
    if (linha.length + c.length > 75) { out += linha + '=' + CRLF; linha = ''; }
    linha += c;
  }
  return out + linha;
}

(async () => {
  if (!USER || !PASS) { console.error('sem credenciais (rode no Actions)'); process.exit(1); }
  const { ImapFlow } = require('imapflow');
  const { pegaTexto } = require('./email-chat.js');   // MESMO parser do canal
  const imgB64 = fs.existsSync(path.join(__dirname, 'teste-visao3.png')) ? fs.readFileSync(path.join(__dirname, 'teste-visao3.png')).toString('base64') : null;
  const pdfB64 = fs.existsSync(path.join(__dirname, 'anexo-prova.pdf')) ? fs.readFileSync(path.join(__dirname, 'anexo-prova.pdf')).toString('base64') : null;
  let client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  // 🛡️ v3.17: teto de tempo em tudo que usa a conexão — conexão morta não trava mais a rodada
  const comTeto = (p, ms, rotulo) => { Promise.resolve(p).catch(() => {}); return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('teto ' + Math.round(ms / 1000) + 's: ' + rotulo)), ms))]); };
  async function reconecta(motivo) {
    console.log('🔌 reconectando a caixa (' + motivo + ')…');
    try { client.close(); } catch (e) {}
    client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
    await comTeto(client.connect(), 45000, 'conexão');
    console.log('🔌 caixa reconectada');
  }
  const varreSegura = async () => {   // varredura com teto + até 3 tentativas, reconectando entre elas
    for (let tent = 1; tent <= 3; tent++) {
      try {
        await comTeto(client.status('INBOX', { uidNext: true }), 15000, 'sonda');   // 🪶 v3.18: conexão viva antes de varrer
        await comTeto(varre(), 180000, 'varredura'); return true;
      }
      catch (e) {
        console.log('⚠️ varredura falhou (' + String(e.message || e).slice(0, 70) + ') — ' + (tent < 3 ? 'reconecto e tento de novo' : 'sigo com o que coletei'));
        try { await reconecta(String(e.message || e).slice(0, 40)); } catch (e2) { await sleep(4000); }
      }
    }
    return false;
  };
  await comTeto(client.connect(), 45000, 'conexão inicial');
  const t0 = Date.now();
  const porMensagem = new Map();   // messageId -> { texto, caixa, quando, assunto }
  const porCaso = new Map();       // n do caso -> registro

  const caixas = ['INBOX'];
  try { for (const m of await client.list()) if (/enviad|sent|spam/i.test(m.path)) caixas.push(m.path); } catch (e) {}   // 🪶 v3.18: sem "Todos os e-mails" (cópia de INBOX+Enviados)
  console.log('caixas:', caixas.join(' | '));

  const vistos = new Set();   // v3.6: caixa|uid já lidos (e-mail não muda)
  async function varre() {
    let caixasOk = 0;   // 🛡️ v3.17: caixas que responderam nesta varredura
    for (const caixa of caixas) {
      let lock;
      try {
        lock = await client.getMailboxLock(caixa);
        // v3.6: só o que chegou desde ontem (o IMAP SINCE é por dia) — antes puxava TODAS as rodadas antigas, com anexos
        const uids = await client.search({ subject: 'TESTE-REBOCL', since: new Date(t0 - 24 * 3600 * 1000) }, { uid: true });
        for (const uid of (uids || []).slice().reverse()) {   // 🪶 v3.19: do mais novo para o mais velho — o importante primeiro
          const chave = caixa + '|' + uid;
          if (vistos.has(chave)) continue;
          const cab = await client.fetchOne(uid, { envelope: true }, { uid: true });
          if (!cab || !cab.envelope) continue;
          const deCab = ((cab.envelope.from || [{}])[0].address || '').toLowerCase();
          const quandoCab = cab.envelope.date ? new Date(cab.envelope.date).getTime() : 0;
          if (quandoCab < t0 - 180000 || deCab.indexOf(ALIAS.toLowerCase()) >= 0 || deCab.indexOf(ALIAS_ESTRANHO.toLowerCase()) >= 0) { vistos.add(chave); continue; }
          const m = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
          if (!m || !m.envelope) continue;
          vistos.add(chave);
          const de = (m.envelope.from || [{}])[0].address || '';
          if (de.toLowerCase().indexOf(ALIAS.toLowerCase()) >= 0 || de.toLowerCase().indexOf(ALIAS_ESTRANHO.toLowerCase()) >= 0) continue;   // mensagem nossa
          const id = m.envelope.messageId || (caixa + '|' + uid);
          const quando = m.envelope.date ? new Date(m.envelope.date).getTime() : 0;
          if (quando < t0 - 180000) continue;                                  // só esta rodada
          const fonte = (m.source || '').toString();
          const nomesAnexos = [...fonte.matchAll(/filename\*?="?([^"\r\n;]+)/gi)].map(x => x[1]);   // v3.14
          const links = [...new Set([...fonte.replace(/=\r?\n/g, '').matchAll(/https?:\/\/[^\s"<>()=]+/g)].map(x => x[0]))].slice(0, 6);   // v3.15
          const texto = pegaTexto(fonte, String(m.envelope.subject || '')) + (nomesAnexos.length ? '\n📎 anexos: ' + nomesAnexos.join(', ') : '') + (links.length ? '\n🔗 links: ' + links.join(' ') : '');
          const antigo = porMensagem.get(id);
          if (!antigo || texto.length > antigo.texto.length || (caixa === 'INBOX' && antigo.caixa !== 'INBOX'))
            porMensagem.set(id, { texto, caixa, quando, assunto: String(m.envelope.subject || ''), inReplyTo: m.envelope.inReplyTo || '' });
        }
        caixasOk++;   // 🛡️ v3.17: esta caixa respondeu
      } catch (e) { console.log('caixa', caixa, 'erro:', e.message.slice(0, 60)); }
      finally { if (lock) lock.release(); }
    }
    if (!caixasOk) throw new Error('nenhuma caixa respondeu (conexão morta?)');   // 🛡️ v3.17
  }

  const enviados = [];   // { n, assunto, esperado, check, id, enviadoEm }
  async function envia(caso) {
    let fotoCaso = caso.foto ? imgB64 : null;
    if (caso.fotoArq) { const arq = path.join(__dirname, caso.fotoArq); fotoCaso = fs.existsSync(arq) ? fs.readFileSync(arq).toString('base64') : null; if (!fotoCaso) console.log('⚠️ fixture ausente:', caso.fotoArq); }
    let imagens = null;
    const TIPOS = { ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf', mp4: 'video/mp4' };
    const arquivos = (caso.arquivos || []).map(opcoes => { const nome = opcoes.find(n => fs.existsSync(path.join(__dirname, n))); if (!nome) { console.log('⚠️ fixture ausente:', opcoes.join(' / ')); return null; } return { nome, tipo: TIPOS[nome.split('.').pop()] || 'application/octet-stream', b64: fs.readFileSync(path.join(__dirname, nome)).toString('base64') }; }).filter(Boolean);   // v3.13
    if (caso.fotos) imagens = caso.fotos.map(nome => { const arq = path.join(__dirname, nome); if (!fs.existsSync(arq)) { console.log('⚠️ fixture ausente:', nome); return null; } return { nome, b64: fs.readFileSync(arq).toString('base64') }; }).filter(Boolean);
    const { bruto, id } = montaMensagem(caso.assunto, caso.corpo, fotoCaso, caso.html, caso.pdf ? pdfB64 : null, caso.fotoArq || null, caso.cab || null, { formato: caso.formato, imagens, inReplyTo: caso.inReplyTo, references: caso.references, de: caso.de, arquivos });
    let enviado = false, ultErr = null;   // 🛡️ v3.17: envio à prova de conexão morta
    for (let tent = 1; tent <= 2 && !enviado; tent++) {
      let lock = null;
      try {
        lock = await comTeto(client.getMailboxLock('INBOX'), 30000, 'envio');
        await comTeto(client.append('INBOX', Buffer.from(bruto), caso.lido ? ['\\Seen'] : []), 60000, 'append');
        enviado = true;
      } catch (e) {
        ultErr = e;
        console.log('⚠️ envio falhou (' + String(e.message || e).slice(0, 60) + ') — ' + (tent < 2 ? 'reconecto e tento de novo' : 'desisto deste caso'));
        try { await reconecta('envio'); } catch (e2) {}
      } finally { if (lock) { try { lock.release(); } catch (e) {} } }
    }
    if (!enviado) throw ultErr;
    enviados.push({ n: caso.n, assunto: caso.assunto, corpo: caso.corpo, esperado: caso.esperado, check: caso.check, id, enviadoEm: Date.now(), foto: !!(caso.foto || caso.fotoArq || caso.fotos), pdf: !!caso.pdf, semResposta: !!caso.semResposta, lido: !!caso.lido, lembrete: !!caso.lembrete });
    console.log('📤', caso.n, '—', caso.assunto.replace(MARCA + ' ', ''), (caso.foto || caso.fotoArq) ? '(com foto)' : '');
    await sleep(1300);
  }
  function respostasDe(caso) { return [...porMensagem.values()].filter(r => r.inReplyTo === caso.id).sort((a, b) => a.quando - b.quando); }   // v3.14
  function textoDe(x) { return x.e.lembrete ? respostasDe(x.e).map(r => r.texto).join('\n---\n') : x.r.texto; }
  function casa(caso) {
    for (const [mid, r] of porMensagem) if (r.inReplyTo === caso.id) return r;
    for (const [mid, r] of porMensagem) if (r.assunto.indexOf(caso.n + ' ') >= 0 || r.assunto.indexOf(caso.n + ' —') >= 0) return r;
    return null;
  }

  console.log('== envio da rodada 3 ==');
  for (const c of CASOS) await envia(c);

  let m2Enviado = false;
  const limite = Date.now() + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    await varreSegura();
    const c8 = enviados.find(e => e.n === 'R3-8');
    const r8 = c8 && casa(c8);
    if (r8 && !m2Enviado) {
      const citado = String(r8.texto).split(NL).slice(0, 6).map(l => '> ' + l).join(NL);
      const casoM2 = { n: M2.n, assunto: M2.assunto, corpo: '> (resposta anterior)\n' + citado + '\n\nMuito bem. Qual era a palavra-chave que eu combinei com você? Uma linha só.', esperado: M2.esperado, check: M2.check };
      await envia(casoM2); m2Enviado = true;
      const idR8 = ([...porMensagem.entries()].find(([mid, r]) => r === r8) || [])[0];   // v3.12: id da resposta do chat ao R3-8
      await envia({ n: M3.n, assunto: M3.assunto, corpo: '[SEM-MEMORIA] Sem citar nada da conversa: qual era a palavra-chave que eu combinei com você? Uma linha só.', esperado: M3.esperado, check: M3.check, inReplyTo: idR8 || c8.id, references: c8.id + (idR8 ? ' ' + idR8 : '') });
      console.log('📤 R3-20 — memória pela conversa do Gmail ([SEM-MEMORIA])');
      console.log('📤 R3-8b — segunda parte da MEMÓRIA');
    }
    const esperados = enviados.filter(e => !e.semResposta);   // v3.11: o automático não conta
    const respondidos = esperados.filter(e => e.lembrete ? respostasDe(e).length >= 2 : casa(e)).length;   // v3.14: lembrete = 2 respostas
    console.log('… respondidos:', respondidos, '/', esperados.length, '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (m2Enviado && respondidos >= esperados.length) break;
    await sleep(25000);
  }
  await varreSegura();

  // v3.10: o e-mail que ficou SEM RESPOSTA está "lido" (algo o tirou da fila) ou "não lido" (o chat não pegou)?
  const sumico = new Map();
  try {
    const lockS = await comTeto(client.getMailboxLock('INBOX'), 30000, 'checagem final');   // 🛡️ v3.17
    try {
      for (const e of enviados) {
        if (casa(e)) continue;
        const u = await client.search({ header: { 'message-id': e.id } }, { uid: true });
        if (!u || !u.length) { sumico.set(e.id, 'o e-mail não está mais na caixa de entrada'); continue; }
        const f = await client.fetchOne(u[u.length - 1], { flags: true }, { uid: true });
        sumico.set(e.id, (f && f.flags && f.flags.has('\\Seen')) ? 'o e-mail está LIDO sem resposta (algo o tirou da fila)' : 'o e-mail continua NÃO LIDO (o chat não chegou a pegar)');
      }
    } finally { lockS.release(); }
  } catch (err) { console.log('checagem dos sem resposta falhou:', String(err.message || err).slice(0, 80)); }

  const L = [];
  L.push('# 🧪 Teste do chat por e-mail — RODADA 3 — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('Rodada com o canal já corrigido (CAPS + assinatura + memória). Cada resposta é casada com o e-mail que a originou (In-Reply-To) e passa por checagem automática. Leitura pelo MESMO parser do canal.');
  L.push('');
  const resp = enviados.map(e => ({ e, r: casa(e) }));
  // Cada envio entra no denominador. Resposta ausente é falha explícita — nunca pode sumir da evidência.
  const ok = resp.filter(x => x.r && !x.e.semResposta).length;
  const nota = x => notaDoCaso(x, { sumico, avalia, textoDe });
  const notas = resp.map(nota);
  const resumo = resumoDasNotas(notas);
  L.push('- enviados: ' + enviados.length + ' · respondidos: ' + ok + ' · checagens PASS: ' + resumo.passou + '/' + resumo.total + ' · falhas: ' + resumo.falhou + (notas.some(n => n.indexOf('PANE') === 0) ? ' · em modo de pane (motores da internet fora): ' + notas.filter(n => n.indexOf('PANE') === 0).length : ''));
  const lat = resp.filter(x => x.r && !x.e.semResposta).map(x => (x.r.quando - x.e.enviadoEm) / 60000);
  if (lat.length) L.push('- latência: ' + Math.min.apply(null, lat).toFixed(1) + '–' + Math.max.apply(null, lat).toFixed(1) + ' min (média ' + (lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1) + ')');
  L.push('');
  L.push('## Caso a caso');
  for (const x of resp) {
    L.push('### ' + x.e.n + ' — ' + x.e.assunto.replace(MARCA + ' ', '').replace('Re: ', '') + (x.e.foto ? ' 📷' : '') + (x.e.pdf ? ' 📄' : ''));
    L.push('');
    L.push('**Pergunta:** ' + (x.e.corpo || '(seguimento)').split(NL).join(' ').slice(0, 220));
    L.push('');
    L.push('**Espera-se:** ' + x.e.esperado);
    L.push('');
    const resultado = nota(x);
    if (x.e.semResposta) {
      L.push('**Checagem automática:** ' + resultado + ' · **' + (x.r ? 'respondeu em ' + ((x.r.quando - x.e.enviadoEm) / 60000).toFixed(1) + ' min' : 'sem resposta, como esperado') + '**');
      if (x.r) { L.push(''); L.push('```'); L.push(x.r.texto.slice(0, 800)); L.push('```'); }
    } else if (x.r) {
      L.push('**Checagem automática:** ' + resultado + ' · **Resposta em ' + ((x.r.quando - x.e.enviadoEm) / 60000).toFixed(1) + ' min** (' + x.r.caixa + ')');
      L.push('');
      L.push('```');
      L.push(textoDe(x).slice(0, 2200) || '(vazio)');
      L.push('```');
    } else { L.push('**Checagem automática:** ' + resultado + ' ❌'); }
    L.push('');
  }
  L.push('## Todas as respostas vistas na janela');
  for (const r of [...porMensagem.values()].sort((a, b) => a.quando - b.quando)) L.push('- ' + new Date(r.quando).toISOString().slice(11, 16) + ' · ' + r.caixa + ' · ' + r.assunto.replace(MARCA + ' ', '').slice(0, 70));
  L.push('');
  L.push('---');
  L.push('_Gerado por `tools/teste-email.js` v3.20 (workflow `teste-email.yml`)._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-email-r3-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + L.join(NL).slice(0, 3500));
  console.log('💾 salvo em', destino);
  try { await comTeto(client.logout(), 15000, 'logout'); } catch (e) {}   // 🛡️ v3.17
  process.exit(resumo.tudoPassou ? 0 : 1);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
