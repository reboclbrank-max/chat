// 📧 CHAT POR EMAIL — módulo: processa 1 varredura da caixa (responde não-lidos com 3 rotas de cérebro)
// v12 (14/10/2026): 🔤 OCR LOCAL (tesseract) lê o texto da foto sem internet e entra no prompt;
// resposta curta demais para foto ganha UMA nova tentativa exigindo concretude.
// v12.1: a confiança do OCR vai no prompt; quando divergir do que o motor vê, vale a imagem.
// v12.2: resposta de foto que NÃO viu a imagem (diz que não enxerga ou só repete medidas locais) é descartada
// na corrida; o prompt leva só o que ajuda de verdade (rostos quando a pergunta é sobre pessoas; OCR >= 80%).
// v12.3: polimento do fallback — "pela lupa" (era "pelo lupa") e respostas começando com maiúscula.
// v12.4: PRIVACIDADE — o email-log.md vai para um repositório PÚBLICO: endereço mascarado e assunto só de teste.
// v12.5: ORDEM DE CHEGADA (o mais antigo primeiro) com UID consistente em busca/leitura/marcação, e proteção por
// e-mail: se um falhar 2x nesta sessão, ele é pulado (fica não lido para o próximo turno) e não trava os outros.
// v12.6: VISÃO LOCAL — se os motores de visão da internet falham, um modelo de visão na CPU do runner olha a foto
// (tools/visao-local.py) e um motor de texto redige a resposta só com o que ela viu (dizendo de onde veio).
// v12.7: a visão local começa JUNTO com a 1ª tentativa na internet (encerrada se a internet responder; se a internet
// falhar e ela já tiver a foto, o chat não espera as outras tentativas). E-mail com anexo espera as ferramentas do turno.
// v12.8: foto + documento em pane — a visão local só recebe a pergunta quando não há documento junto; se nada viu a
// foto, um motor de texto responde o que é texto (arquivo, texto lido na foto) e diz com franqueza o que não deu para ver.
const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const USER = process.env.GMAIL_CHAT_ADDR, PASS = process.env.GMAIL_CHAT_PASS;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function qpDecode(s) {
  s = String(s || '').replace(/=\r?\n/g, '');
  const bytes = []; let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else { if (bytes.length) { out += Buffer.from(bytes).toString('utf-8'); bytes.length = 0; } out += s[i]; }
  }
  if (bytes.length) out += Buffer.from(bytes).toString('utf-8');
  return out;
}
// 🛡 Guarda anti-cota (13/10/2026): a reserva Pollinations pode devolver 200 com TEXTO DE COTA
// no content ("The API key used for this request has reached..."). Isso NÃO é resposta — é infra.
// Regra da casa: infra falada ≠ cérebro errado; a rota seguinte assume.
const COTA_RE = /api key used for this request|(?:has|have) reached (?:its|your|the) (?:limit|quota)|too many requests|rate limit exceeded/i;
function textoUtil(t) {
  const s = String(t || '').trim();
  if (!s) return false;
  if (s.length < 300 && COTA_RE.test(s)) return false;
  return true;
}


// 📷 FOTOS POR E-MAIL (14/10/2026): extrai anexos de imagem do MIME e deixa o cérebro "ver".
// Simples e tolerante: aceita jpeg/png/webp/gif em base64 até ~4 MB. Sem anexo, nada muda.
function extraiAnexos(bruto) {
  const anexos = [];
  const mB = bruto.match(/content-type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n;]+)"?/i);
  if (!mB) return anexos;
  const sep = '--' + mB[1].replace(/^--/, '');
  for (const p of bruto.split(sep)) {
    const iCab = p.search(/\r?\n\r?\n/);
    if (iCab < 0) continue;
    const cab = p.slice(0, iCab);
    if (!/content-type:\s*image\//i.test(cab)) continue;
    const tipo = (cab.match(/content-type:\s*(image\/[a-z0-9.+-]+)/i) || [])[1].toLowerCase().replace('jpg', 'jpeg');
    if (!/^image\/(jpeg|png|webp|gif)$/.test(tipo)) continue;
    let corpo = p.slice(iCab).replace(/^\r?\n\r?\n/, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (corpo.length < 100) continue;
    if (corpo.length > 5500000) continue;
    anexos.push({ tipo, b64: corpo, bytes: Math.floor(corpo.length * 3 / 4) });
    if (anexos.length >= 2) break;
  }
  return anexos;
}

function limpaTexto(t) {
  return String(t || '').replace(/--[0-9a-f]{16,}[\s\S]*$/, '').replace(/-----BEGIN PGP[\s\S]*?-----END PGP SIGNATURE-----/g, '').replace(/https?:\/\/\S+/g, '').trim().slice(0, 3000);
}

function tiraHtml(s) {
  let t = String(s || '');
  t = t.split(/<style[\s\S]*?<\/style>/i).join(' ');
  t = t.split(/<script[\s\S]*?<\/script>/i).join(' ');
  t = t.replace(/<br\s*\/?>/gi, NL).replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, NL);
  t = t.replace(/<[^>]+>/g, ' ');
  t = decr(t);
  // acentos em entidade nomeada (celular/webmail manda assim: &ecirc; &ccedil;...)
  const ENTIDADES = [['&nbsp;', ' '], ['&#160;', ' '], ['&aacute;', 'á'], ['&eacute;', 'é'], ['&iacute;', 'í'],
    ['&oacute;', 'ó'], ['&uacute;', 'ú'], ['&atilde;', 'ã'], ['&otilde;', 'õ'], ['&ccedil;', 'ç'],
    ['&acirc;', 'â'], ['&ecirc;', 'ê'], ['&ocirc;', 'ô'], ['&agrave;', 'à'], ['&Aacute;', 'Á'],
    ['&Eacute;', 'É'], ['&Atilde;', 'Ã'], ['&Otilde;', 'Õ'], ['&Ccedil;', 'Ç'], ['&ldquo;', '"'],
    ['&rdquo;', '"'], ['&hellip;', '...'], ['&ndash;', '-'], ['&mdash;', '—']];
  for (const par of ENTIDADES) t = t.split(par[0]).join(par[1]);
  t = t.split('&amp;').join('&');
  t = t.split(/[ \t]{2,}/g).join(' ');
  t = t.split(NL).map(function (l) { return l.trim(); }).join(NL);
  return t.trim();
}
function pegaTexto(bruto, assunto) {
  const mB = bruto.match(/content-type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n;]+)"?/i);
  if (mB) {
    const sep = '--' + mB[1].replace(/^--/, '');
    let html = '';
    for (const p of bruto.split(sep)) {
      const iCab = p.search(/\r?\n\r?\n/);
      if (iCab < 0) continue;
      const cab = p.slice(0, iCab);
      if (/content-disposition:\s*attachment/i.test(cab)) continue; // 📎 anexo NUNCA é o corpo
      const corpoParte = qpDecode(p.slice(iCab).replace(/^\r?\n\r?\n/, ''));
      if (/content-type:\s*text\/plain/i.test(cab)) return limpaTexto(corpoParte);
      if (!html && /content-type:\s*text\/html/i.test(cab)) html = corpoParte;
    }
    if (html) return limpaTexto(tiraHtml(html)); // e-mail só-HTML (celular/webmail)
  }
  const partes = bruto.split(/\r?\n\r?\n/);
  let corpoMsg = partes.slice(1).join(NL + NL) || assunto;
  corpoMsg = qpDecode(corpoMsg);
  if (/<[a-z][\s\S]*>/i.test(corpoMsg)) corpoMsg = tiraHtml(corpoMsg);
  return limpaTexto(corpoMsg);
}


// 🧰 FERRAMENTAS POR E-MAIL (14/10/2026): comandos que respondem com DADOS REAIS, sem depender de motor.
// Vale mesmo com todos os cérebros caídos. Comandos: clima:, cambio:, hora:, noticias:, status:, ajuda
const NL = String.fromCharCode(10);
function semAcento(s) { return String(s || '').toLowerCase(); }
function decr(s) {
  return String(s || '').split('&amp;').join('&').split('&#39;').join(String.fromCharCode(39))
    .split('&apos;').join(String.fromCharCode(39)).split('&quot;').join(String.fromCharCode(34))
    .split('&lt;').join('<').split('&gt;').join('>')
    .split('&#193;').join('Á').split('&#225;').join('á').split('&#201;').join('É').split('&#233;').join('é')
    .split('&#205;').join('Í').split('&#237;').join('í').split('&#211;').join('Ó').split('&#243;').join('ó')
    .split('&#218;').join('Ú').split('&#250;').join('ú').split('&#195;').join('Ã').split('&#227;').join('ã')
    .split('&#199;').join('Ç').split('&#231;').join('ç');
}
async function ferramenta(corpo) {
  const txt = String(corpo || '').trim();
  if (/^!?ajuda$/i.test(txt) || txt.toLowerCase() === 'ajuda' || txt.toLowerCase() === 'comandos') return AJUDA;
  const pos = txt.indexOf(':');
  if (pos < 1 || pos > 12) return null;
  const cmd = txt.slice(0, pos).trim().toLowerCase();
  const arg = txt.slice(pos + 1).trim();
  if (cmd.indexOf(' ') >= 0) return null;
  try {
    if (cmd === 'clima') {
      const cidade = arg || 'Tobias Barreto';
      const r = await fetch('https://wttr.in/' + encodeURIComponent(cidade) + '?format=%l:+%C,+%t+(sensação+%f),+umidade+%h,+vento+%w&m&lang=pt', { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'curl/8' } });
      const linha = (await r.text()).trim();
      if (!linha) return null;
      return '🌤 Clima agora — ' + linha;
    }
    if (cmd === 'cambio' || cmd === 'cotacao') {
      const mapa = { 'dolar': 'USD', 'dólar': 'USD', 'usd': 'USD', 'euro': 'EUR', 'eur': 'EUR', 'libra': 'GBP', 'gbp': 'GBP', 'bitcoin': 'BTC', 'btc': 'BTC', 'iene': 'JPY', 'jpy': 'JPY', 'peso': 'ARS', 'ars': 'ARS' };
      const moeda = mapa[arg.toLowerCase()] || (arg ? arg.toUpperCase().slice(0, 3) : 'USD');
      if (moeda === 'BTC') {
        const rc = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl,usd', { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'rebocl/1' } });
        const jc = await rc.json();
        if (jc && jc.bitcoin && jc.bitcoin.brl) return '💱 1 BTC = R$ ' + Number(jc.bitcoin.brl).toLocaleString('pt-BR') + ' (US$ ' + Number(jc.bitcoin.usd).toLocaleString('en-US') + ')';
        return null;
      }
      const r = await fetch('https://open.er-api.com/v6/latest/' + moeda, { signal: AbortSignal.timeout(25000) });
      const j = await r.json();
      if (!j || !j.rates || !j.rates.BRL) return null;
      return '💱 1 ' + moeda + ' = R$ ' + Number(j.rates.BRL).toFixed(2) + ' (atualizado ' + String(j.time_last_update_utc || '').slice(0, 16) + ')';
    }
    if (cmd === 'hora') {
      const mapa = { 'brasilia': 'America/Sao_Paulo', 'brasília': 'America/Sao_Paulo', 'sp': 'America/Sao_Paulo', 'sao paulo': 'America/Sao_Paulo', 'são paulo': 'America/Sao_Paulo', 'rio': 'America/Sao_Paulo', 'aracaju': 'America/Maceio', 'maceio': 'America/Maceio', 'tokyo': 'Asia/Tokyo', 'tóquio': 'Asia/Tokyo', 'nova york': 'America/New_York', 'lisboa': 'Europe/Lisbon', 'londres': 'Europe/London', 'paris': 'Europe/Paris', 'utc': 'UTC', 'china': 'Asia/Shanghai', 'dubai': 'Asia/Dubai', 'sydney': 'Australia/Sydney' };
      const fuso = mapa[(arg || 'brasilia').toLowerCase()];
      if (!fuso) return '🕐 Ainda não conheço esse lugar. Tente: brasilia, tokyo, nova york, lisboa, utc…';
      const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, dateStyle: 'short', timeStyle: 'short' }).format(new Date());
      return '🕐 ' + (arg || 'Brasília') + ': ' + hora;
    }
    if (cmd === 'noticias' || cmd === 'notícias') {
      const termo = arg || 'Brasil';
      const le = (xml) => {
        const partes = String(xml || '').split('<title>').slice(1).map(p => p.split('</title>')[0]);
        return partes.map(x => decr(x.trim())).filter(x => {
          if (!x || x.length <= 8) return false;
          const l = x.toLowerCase();
          const ruins = ['google not', 'bingnot', 'bing not', ' - google', '- bing', 'notícias - '];
          if (ruins.some(ru => l.indexOf(ru) >= 0)) return false;
          const termoLimpo = termo.toLowerCase();
          if (l === termoLimpo) return false;
          if (l.indexOf(termoLimpo + ' -') === 0) return false;
          return true;
        }).slice(0, 5);
      };
      let titulos = [];
      try {
        const r1 = await fetch('https://news.google.com/rss/search?q=' + encodeURIComponent(termo) + '&hl=pt-BR&gl=BR&ceid=BR:pt-419', { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Mozilla/5.0' } });
        titulos = le(await r1.text());
      } catch (e) {}
      if (!titulos.length) {
        try {
          const r2 = await fetch('https://www.bing.com/news/search?q=' + encodeURIComponent(termo) + '&format=RSS&setmkt=pt-BR', { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Mozilla/5.0' } });
          titulos = le(await r2.text());
        } catch (e) {}
      }
      if (!titulos.length) return '📰 Não achei manchetes sobre "' + termo + '" agora. Tente outras palavras (ou o termo em inglês).';
      return '📰 Manchetes sobre "' + termo + '":' + NL + '• ' + titulos.join(NL + '• ');
    }
    if (cmd === 'status') {
      const r = await fetch('https://raw.githubusercontent.com/reboclbrank-max/chat/main/vigia-estado.json', { signal: AbortSignal.timeout(20000), cache: 'no-store' });
      const j = await r.json();
      const linhas = Object.entries(j.itens || {}).map(function (p) { return (p[1].ok ? '✅' : '❌') + ' ' + p[0]; });
      return '🩺 Estado da casa (checagem ' + j.verificado_em + ' UTC):' + NL + linhas.join(NL) + NL + NL + '📧 E-mail: respondendo · 🌐 site postando · 🧠 bateria diária';
    }
  } catch (e) { return null; }
  return null;
}
const AJUDA = [
  '🤖 Assistente Rebocl — o que você pode pedir por e-mail:',
  '',
  '(1) Qualquer pergunta ou conversa — eu respondo com o melhor cérebro disponível.',
  '(2) Uma FOTO, um ÁUDIO ou um ARQUIVO (PDF/Word/texto) anexado — eu olho, ouço ou leio.',
  '(3) Comandos rápidos que respondem na hora, sem depender dos motores:',
  '   • clima: Aracaju',
  '   • cambio: dolar     (também euro, libra, bitcoin, peso…)',
  '   • hora: tokyo       (também brasilia, nova york, lisboa, utc…)',
  '   • noticias: godot   (qualquer tema)',
  '   • status:           (como está a casa agora)',
  '   • voz: bom dia, dona!   (eu devolvo um áudio falado em anexo)',
  '   • ajuda',
  '',
  '— Assistente Rebocl (casa Rebocl Brank)'
].join(NL);


// 🧠 MEMÓRIA DE CONVERSA (14/10/2026): contexto citado no próprio e-mail + curto prazo no turno.
const memoria = new Map();
function limpaAssunto(a) {
  let s = String(a || '').trim();
  let guarda = 0;
  while (guarda++ < 3) {
    const b = s.toLowerCase();
    if (b.indexOf('re:') === 0 || b.indexOf('fwd:') === 0 || b.indexOf('enc:') === 0) s = s.slice(s.indexOf(':') + 1).trim();
    else break;
  }
  return s.toLowerCase().slice(0, 90);
}
function citacaoDoEmail(bruto) {
  const NLc = String.fromCharCode(10);
  const linhas = String(bruto || '').split(NLc);
  const citadas = [];
  for (const l of linhas) {
    const tt = l.trim();
    if (tt.charAt(0) === '>') citadas.push(tt.split('>').join('').trim());
  }
  return citadas.filter(Boolean).join(NLc).slice(0, 1200);
}


// 🪞 CAPACIDADES (14/10/2026): o chat precisa conhecer os próprios recursos para não errar sobre si mesmo.
const CAPS = ' Você é o chat por e-mail da casa Rebocl Brank. Seja PRECISA quando falar de si: você RESPONDE e-mails; você VÊ fotos anexadas (visão) e, quando os motores de visão oscilam, ainda lê o TEXTO da foto por uma lupa própria; você OUVE áudios recebidos por e-mail (transcrição por motor pequeno — pode errar nomes) e RESPONDE EM VOZ quando o dono pede, por palavras ("manda em áudio") ou pelo comando voz:, devolvendo um áudio falado em anexo; você LÊ arquivos anexados de texto (PDF, Word, TXT) extraindo o conteúdo; e tem comandos locais que funcionam mesmo com os motores caídos: clima:, cambio:, hora:, noticias:, status: e ajuda. O que você NÃO tem: WhatsApp, anexar arquivos quaisquer (só o áudio falado que VOCÊ mesma gera), memória longa entre e-mails distantes (lembra só o que vier citado na conversa) e os motores gratuitos às vezes oscilam — nesse caso avise e peça reenvio.';

async function buscaRota(nome, url, corpo, bearer, pergunta, imagem) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (bearer) headers['Authorization'] = 'Bearer unused';
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(corpo), signal: AbortSignal.timeout(45000) });
    if (!r.ok) return null;
    const j = await r.json();
    const t = ((((j.choices || [])[0] || {}).message || {}).content) || '';
    if (textoUtil(t)) return { texto: t.trim().slice(0, 2500), via: nome, modelo: String(j.model || '') };
  } catch (e) {}
  return null;
}
// 🏁 corrida: dispara um PAR de rotas e fica com a primeira que responder de verdade.
// (14/10: a fila sequencial fazia pior caso de ~12 min; a corrida corta para ~3 min e antecipa o caso comum.)
// 🔒 v12.4: o email-log.md é público — endereço mascarado (como em provas/) e assunto só de e-mail de TESTE.
function mascaraEndereco(a) {
  const s = String(a || ''); const i = s.indexOf('@');
  return i < 3 ? '***' : s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i);
}
function assuntoPublico(a) {
  const s = String(a || '');
  return /^(re:\s*)?\[TESTE-REBOCL\]/i.test(s) ? s.slice(0, 40) : '(assunto do dono — fica só na caixa)';
}
// 🙈 v12.2: famílias SÓ DE TEXTO (sonda 15/10: o gpt-oss-20b recebeu a foto e disse "não consigo visualizar").
const SO_TEXTO = /gpt-oss|nemotron-3-(ultra|super)|deepseek/i;
// 🙈 v12.2: resposta de FOTO que não viu a imagem — diz que não enxerga, ou só repete as medidas do olho local.
function pareceCego(t) {
  const s = String(t || '');
  const naoVe = /n[ãa]o (consigo|posso|[ée] poss[íi]vel) (ver|visualizar|abrir|enxergar|analisar) (a |esta |essa |sua )?(imagem|foto)|n[ãa]o recebi (a |nenhuma )?(imagem|foto)|sem acesso [àa] (imagem|foto)|can(no|')t see|unable to (see|view)/i;
  const eco = /bloco retangular|blocos de cor|cara de (c[ée]u|parede|[áa]gua|areia|terra)|parede ou fundo/i;
  return naoVe.test(s) || eco.test(s);
}
async function corre(dupla, pergunta, imagem, valida) {
  return new Promise(function (resolve) {
    let restantes = dupla.length;
    for (const rt of dupla) {
      buscaRota(rt[0], rt[1], rt[2], rt[3], pergunta, imagem).then(function (x) {
        if (x && (!valida || valida(x))) resolve(x);
        else { if (x) console.log('🙈 ' + rt[0] + (x.modelo ? ' (' + x.modelo + ')' : '') + ' respondeu sem ver a foto — descartei e segui a corrida'); if (--restantes === 0) resolve(null); }
      });
    }
  });
}
async function cerebro(pergunta, imagem, opcoes) {
  const rotas = [];
  if (imagem) {
    rotas.push(['visão (auto)', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: [{ type: 'text', text: pergunta }, { type: 'image_url', image_url: { url: 'data:' + imagem.tipo + ';base64,' + imagem.b64 } }] }], max_tokens: 600 }, true]);
    rotas.push(['visão (omni)', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: [{ type: 'text', text: pergunta }, { type: 'image_url', image_url: { url: 'data:' + imagem.tipo + ';base64,' + imagem.b64 } }] }], max_tokens: 600 }, true]);
  } else {
    rotas.push(
      ['frota', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true],
      ['reserva', 'https://text.pollinations.ai/openai/chat/completions', { model: 'openai-fast', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, false],
      ['llm7', 'https://api.llm7.io/v1/chat/completions', { model: 'DeepSeek-V4-Flash-0731', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true],
      ['omni', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true]
    );
  }
  // 👁️ foto vale mais uma passada: a saturação do g4f costuma ceder em menos de um minuto
  const passadas = imagem ? 3 : 2;
  for (let passada = 0; passada < passadas; passada++) {
    for (let i = 0; i < rotas.length; i += 2) {
      const r = await corre(rotas.slice(i, i + 2), pergunta, imagem, imagem ? (x => !pareceCego(x && x.texto) && !SO_TEXTO.test((x && x.modelo) || '')) : null);
      if (r) return r;
    }
    if (passada < passadas - 1) {
      // ⚡ v12.7: se a visão local já tem a foto, não espero as outras passadas da internet
      const desiste = opcoes && opcoes.desistirSe;
      const ate = Date.now() + (imagem ? 25000 : 8000);
      while (Date.now() < ate) {
        if (desiste && desiste()) { console.log('⏩ a internet falhou e a visão local já tem a foto — não espero as outras tentativas'); return null; }
        await sleep(1000);
      }
      if (desiste && desiste()) { console.log('⏩ a internet falhou e a visão local já tem a foto — não espero as outras tentativas'); return null; }
    }
  }
  return null;
}
// 🔎 LUPA DE TEXTO (rede de segurança da visão): OCR grátis da api.ocr.space (chave pública de
// demonstração 'helloworld', sem cadastro). Usada só quando os motores de visão oscilam — assim o
// dono nunca fica sem resposta: pelo menos o TEXTO da foto é lido e devolvido.
// 👁️ OLHO LOCAL: descreve formas/cores por análise de pixels (tools/olho.py) — a rede de segurança
// que entra quando os motores de visão saturam. Não inventa: se for foto bagunçada, o olho avisa.
async function olhoDaFoto(imagem) {
  const spawnSync = require('child_process').spawnSync;
  const fsLocal = require('fs');
  const caminho = '/tmp/olho-casa.' + (imagem.tipo.split('/')[1] || 'png');
  try { fsLocal.writeFileSync(caminho, Buffer.from(imagem.b64, 'base64')); } catch (e) { return ''; }
  const r = spawnSync('python3', ['tools/olho.py', caminho], { timeout: 90000, encoding: 'utf8' });
  try {
    const j = JSON.parse(String(r.stdout || '').trim().split(NL).pop());
    return String(j.descricao || '').trim();
  } catch (e) { return ''; }
}
// 🎯 OLHO v4 — pistas medidas (rostos, faixas de cena) para APOIAR os motores de visão no prompt.
async function olhoPistas(imagem) {
  const spawnSync = require('child_process').spawnSync;
  const fsLocal = require('fs');
  const caminho = '/tmp/olho-pistas.' + (imagem.tipo.split('/')[1] || 'png');
  try { fsLocal.writeFileSync(caminho, Buffer.from(imagem.b64, 'base64')); } catch (e) { return ''; }
  const r = spawnSync('python3', ['tools/olho.py', caminho], { timeout: 90000, encoding: 'utf8' });
  try {
    const j = JSON.parse(String(r.stdout || '').trim().split(NL).pop());
    return String(j.pistas || '').trim();
  } catch (e) { return ''; }
}
// 🔤 v12: OCR LOCAL — lê o TEXTO de foto/scan SEM internet e SEM terceiros (tesseract no runner).
// Devolve { texto, confianca, motor } ou null; leTextoLocal() devolve só o texto.
async function leTextoLocalInfo(imagem) {
  const spawnSync = require('child_process').spawnSync;
  const fsLocal = require('fs');
  const caminho = '/tmp/ocr-casa.' + (String(imagem.tipo || 'image/png').split('/')[1] || 'png');
  try { fsLocal.writeFileSync(caminho, Buffer.from(imagem.b64, 'base64')); } catch (e) { return null; }
  const r = spawnSync('python3', ['tools/ocr-local.py', caminho], { timeout: 200000, encoding: 'utf8' });
  try {
    const bruto = String(r.stdout || '').trim();
    const i = bruto.lastIndexOf('{');
    if (i < 0) return null;
    const j = JSON.parse(bruto.slice(i));
    if (!j.ok || !j.texto) { console.log('🔤 OCR local: ' + (j.motivo || 'sem texto')); return null; }
    console.log('🔤 OCR local (' + j.motor + ') leu ' + String(j.texto).length + ' caracteres' + (j.confianca ? ' · confiança ' + j.confianca + '%' : ''));
    return { texto: String(j.texto).trim(), confianca: (typeof j.confianca === 'number' ? j.confianca : null), motor: j.motor };
  } catch (e) { return null; }
}
async function leTextoLocal(imagem) { const j = await leTextoLocalInfo(imagem); return j ? j.texto : ''; }
// 👁️‍🗨️ v12.6: VISÃO LOCAL — modelo de visão rodando na CPU do runner (llama.cpp), sem serviço de terceiros.
// Se o preparo em 2º plano ainda estiver baixando o modelo, o script espera a trava e usa quando ficar pronto.
// ⚡ v12.7: começa a visão local SEM bloquear — devolve { promessa, para }. "para" encerra o grupo de processos
// (o python e o llama-mtmd-cli) quando a internet respondeu antes, liberando a CPU.
function iniciaVisaoLocal(imagem, pergunta) {
  const { spawn } = require('child_process');
  const fsLocal = require('fs');
  const ext = (String(imagem.tipo || 'image/png').split('/')[1] || 'png').replace('jpeg', 'jpg');
  const caminho = '/tmp/visao-casa-' + Date.now() + '.' + ext;
  try { fsLocal.writeFileSync(caminho, Buffer.from(imagem.b64, 'base64')); } catch (e) { return { promessa: Promise.resolve(null), para() {} }; }
  let filho = null, encerrado = false;
  const promessa = new Promise(resolve => {
    let saida = '';
    try { filho = spawn('python3', ['tools/visao-local.py', caminho, '--pergunta', String(pergunta || '').slice(0, 400)], { stdio: ['ignore', 'pipe', 'ignore'], detached: true }); }
    catch (e) { resolve(null); return; }
    const relogio = setTimeout(() => { try { process.kill(-filho.pid, 'SIGKILL'); } catch (e) {} }, 480000);
    filho.stdout.on('data', d => { saida += d; });
    filho.on('error', () => { clearTimeout(relogio); resolve(null); });
    filho.on('close', () => {
      clearTimeout(relogio);
      try { fsLocal.unlinkSync(caminho); } catch (e) {}
      if (encerrado) { resolve(null); return; }
      try {
        const j = JSON.parse(String(saida).trim().split(NL).pop());
        if (!j.ok || !j.texto) { console.log('👁️‍🗨️ visão local: ' + (j.motivo || 'sem descrição')); resolve(null); return; }
        resolve({ texto: String(j.texto).trim().slice(0, 2000), modelo: j.modelo || '?', segundos: j.segundos });
      } catch (e) { console.log('👁️‍🗨️ visão local não respondeu (saída vazia)'); resolve(null); }
    });
  });
  return { promessa, para() { encerrado = true; try { if (filho && filho.exitCode === null) process.kill(-filho.pid, 'SIGKILL'); } catch (e) {} } };
}
async function visaoLocal(imagem, pergunta) { return iniciaVisaoLocal(imagem, pergunta).promessa; }
// ⏳ v12.7: o turno instala as ferramentas Python em 2º plano; e-mail com anexo espera ficarem prontas (até 2 min).
async function esperaFerramentas() {
  const marcador = process.env.FERRAMENTAS_MARCADOR;
  if (!marcador || require('fs').existsSync(marcador)) return true;
  console.log('⏳ chegou anexo enquanto as ferramentas do turno ainda instalam — espero ficarem prontas');
  const ate = Date.now() + 120000;
  while (Date.now() < ate) {
    await sleep(2000);
    if (require('fs').existsSync(marcador)) return true;
  }
  console.log('⏳ as ferramentas não ficaram prontas em 2 min — sigo com o que tiver');
  return false;
}
// 🖨️ PDF digitalizado (scan): renderiza a 1ª página em PNG (pdftoppm) e devolve como imagem para a VISÃO.
async function renderPdf(a) {
  const spawnSync = require('child_process').spawnSync;
  const fsLocal = require('fs');
  try {
    fsLocal.writeFileSync('/tmp/scan-casa.pdf', Buffer.from(a.b64, 'base64'));
    spawnSync('pdftoppm', ['-png', '-r', '130', '-f', '1', '-l', '1', '/tmp/scan-casa.pdf', '/tmp/scan-pagina'], { timeout: 120000 });
    const achados = fsLocal.readdirSync('/tmp').filter(f => f.indexOf('scan-pagina') === 0 && /\.png$/.test(f));
    if (!achados.length) return null;
    const buf = fsLocal.readFileSync('/tmp/' + achados[0]);
    if (buf.length < 2000) return null;
    return { tipo: 'image/png', b64: buf.toString('base64'), bytes: buf.length };
  } catch (e) { return null; }
}
async function leTextoDaFoto(imagem) {
  try {
    const corpo = 'base64Image=' + encodeURIComponent('data:' + imagem.tipo + ';base64,' + imagem.b64) +
      '&apikey=helloworld&language=por&OCREngine=2&scale=true';
    const r = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo,
      signal: AbortSignal.timeout(60000)
    });
    if (!r.ok) return '';
    const j = await r.json();
    const t = (((j.ParsedResults || [])[0] || {}).ParsedText) || '';
    const limpo = t.split(String.fromCharCode(13)).join(' ').trim();
    return limpo.length >= 2 ? limpo.slice(0, 800) : '';
  } catch (e) { return ''; }
}


// ================== 📄 LEITOR DE DOCUMENTOS (14/10/2026) ==================
// Anexo de texto/PDF/Word → extrai o texto no próprio runner e responde sobre o conteúdo.
// PDF: pdftotext (poppler) e, se faltar, pypdf. Word: python-docx. Nunca finge: se não der, avisa.
function extraiAnexoTexto(bruto) {
  const mB = bruto.match(/content-type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n;]+)"?/i);
  if (!mB) return null;
  const sep = '--' + mB[1].replace(/^--/, '');
  for (const p of bruto.split(sep)) {
    const iCab = p.search(/\r?\n\r?\n/);
    if (iCab < 0) continue;
    const cab = p.slice(0, iCab);
    // só ANEXO de verdade (o corpo do e-mail também é text/plain!)
    if (!/content-disposition:\s*attachment/i.test(cab) && !/filename=/i.test(cab)) continue;
    const mTipo = cab.match(/content-type:\s*([a-z0-9.+\/-]+)/i);
    const tipo = (mTipo ? mTipo[1] : '').toLowerCase();
    const mNome = cab.match(/filename="?([^"\r\n;]+)"?/i) || cab.match(/name="?([^"\r\n;]+)"?/i);
    const nome = (mNome ? mNome[1] : 'arquivo').trim();
    const eTexto = /^text\/(plain|markdown|csv)$/.test(tipo) || tipo === 'application/json' || tipo === 'application/xml' || /\.(txt|md|csv|json|xml|ya?ml)$/i.test(nome);
    const ePdf = tipo === 'application/pdf' || /\.pdf$/i.test(nome);
    const eDocx = /wordprocessingml\.document/.test(tipo) || /\.docx$/i.test(nome);
    if (!eTexto && !ePdf && !eDocx) continue;
    const corpo = p.slice(iCab).replace(/^\r?\n\r?\n/, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (corpo.length < 40 || corpo.length > 9000000) continue;
    return { nome, tipo: tipo || (ePdf ? 'application/pdf' : 'text/plain'), b64: corpo, bytes: Math.floor(corpo.length * 3 / 4) };
  }
  return null;
}

async function docTexto(a) {
  const fsLocal = require('fs');
  const spawnSync = require('child_process').spawnSync;
  const nome = (String(a.nome).replace(/[^A-Za-z0-9._-]/g, '_') || 'arquivo').slice(-60);
  const caminho = '/tmp/doc-recebido-' + nome;
  try { fsLocal.writeFileSync(caminho, Buffer.from(a.b64, 'base64')); } catch (e) { return ''; }
  const opcoes = { timeout: 120000, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 };
  // texto puro
  if (/^text\//.test(a.tipo) || /\.[a-z0-9]+$/i.test(nome) && /\.(txt|md|csv|json|xml|ya?ml)$/i.test(nome)) {
    try {
      const t = fsLocal.readFileSync(caminho, 'utf8');
      if (t.trim().length >= 2) return t.slice(0, 4000);
    } catch (e) {}
  }
  // PDF: pdftotext primeiro; pypdf de reserva
  if (a.tipo === 'application/pdf' || /\.pdf$/i.test(nome)) {
    const r1 = spawnSync('pdftotext', ['-layout', caminho, '-'], opcoes);
    if (r1.status === 0 && String(r1.stdout || '').trim().length >= 10) return String(r1.stdout).trim().slice(0, 4000);
    const r2 = spawnSync('python3', ['-c', 'from pypdf import PdfReader; import sys; print(" ".join((p.extract_text() or "") for p in PdfReader(sys.argv[1]).pages))', caminho], opcoes);
    if (r2.status === 0 && String(r2.stdout || '').trim().length >= 10) return String(r2.stdout).trim().slice(0, 4000);
    return '';
  }
  // Word .docx
  if (/\.docx$/i.test(nome) || /wordprocessingml/.test(a.tipo)) {
    const r3 = spawnSync('python3', ['-c', 'import docx, sys; d = docx.Document(sys.argv[1]); print(" ".join(p.text for p in d.paragraphs if p.text.strip()))', caminho], opcoes);
    if (r3.status === 0 && String(r3.stdout || '').trim().length >= 2) return String(r3.stdout).trim().slice(0, 4000);
  }
  return '';
}
// ================== fim do leitor ==================

// ================== 🎤 VOZ DA CASA (14/10/2026) ==================
// Falar: grátis e sem chave — edge-tts (voz neural) → gTTS (Google) → espeak-ng (offline).
// Ouvir: transcrição offline pelo Vosk (modelo pequeno pt-BR; o chat baixa uma vez por turno).
const TRIPLA = String.fromCharCode(96, 96, 96);

// Áudio recebido (voz do dono) — até 6 MB; aceita o que os celulares mandam.
function extraiAudio(bruto) {
  const mB = bruto.match(/content-type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n;]+)"?/i);
  if (!mB) return null;
  const sep = '--' + mB[1].replace(/^--/, '');
  for (const p of bruto.split(sep)) {
    const iCab = p.search(/\r?\n\r?\n/);
    if (iCab < 0) continue;
    const cab = p.slice(0, iCab);
    if (!/content-type:\s*audio\//i.test(cab)) continue;
    const tipo = (cab.match(/content-type:\s*(audio\/[a-z0-9.+-]+)/i) || [])[1].toLowerCase();
    const corpo = p.slice(iCab).replace(/^\r?\n\r?\n/, '').replace(/[^A-Za-z0-9+/=]/g, '');
    if (corpo.length < 400 || corpo.length > 8000000) continue;
    return { tipo, b64: corpo, bytes: Math.floor(corpo.length * 3 / 4) };
  }
  return null;
}

// Deixa o texto "falável": tira código, markdown, links e emojis.
function limpaPraFalar(t) {
  return String(t || '')
    .split(TRIPLA).join(' ')
    .replace(/[\x60*_#>|]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{FE0E}]/gu, ' ')
    .split(NL).map(l => l.trim()).filter(Boolean).join('. ')
    .split(' — ').join(', ')
    .split(/\s{2,}/).join(' ')
    .trim().slice(0, 700);
}

async function fala(texto) {
  const falaTexto = limpaPraFalar(texto);
  if (falaTexto.length < 3) return null;
  const spawnSync = require('child_process').spawnSync;
  const fsLocal = require('fs');
  fsLocal.writeFileSync('/tmp/fala-casa.txt', falaTexto);
  const tentativas = [
    ['edge-tts', ['--voice', 'pt-BR-FranciscaNeural', '--file', '/tmp/fala-casa.txt', '--write-media', '/tmp/fala-casa.mp3'], '/tmp/fala-casa.mp3', 'rebocl-voz.mp3'],
    ['python3', ['-m', 'edge_tts', '--voice', 'pt-BR-FranciscaNeural', '--file', '/tmp/fala-casa.txt', '--write-media', '/tmp/fala-casa.mp3'], '/tmp/fala-casa.mp3', 'rebocl-voz.mp3'],
    ['edge-tts', ['--voice', 'pt-BR-AntonioNeural', '--file', '/tmp/fala-casa.txt', '--write-media', '/tmp/fala-casa.mp3'], '/tmp/fala-casa.mp3', 'rebocl-voz.mp3'],
    ['gtts-cli', ['--file', '/tmp/fala-casa.txt', '--lang', 'pt', '--output', '/tmp/fala-casa-g.mp3'], '/tmp/fala-casa-g.mp3', 'rebocl-voz.mp3'],
    ['python3', ['-m', 'gtts.cli', '--file', '/tmp/fala-casa.txt', '--lang', 'pt', '--output', '/tmp/fala-casa-g.mp3'], '/tmp/fala-casa-g.mp3', 'rebocl-voz.mp3'],
    ['espeak-ng', ['-v', 'pt-br', '-s', '160', '-f', '/tmp/fala-casa.txt', '-w', '/tmp/fala-casa.wav'], '/tmp/fala-casa.wav', 'rebocl-voz.wav'],
  ];
  for (const t of tentativas) {
    try { if (fsLocal.existsSync(t[2])) fsLocal.unlinkSync(t[2]); } catch (e) {}
    try { spawnSync(t[0], t[1], { timeout: 90000, stdio: 'ignore' }); } catch (e) {}
    try {
      if (fsLocal.existsSync(t[2]) && fsLocal.statSync(t[2]).size > 2500) {
        return { buf: fsLocal.readFileSync(t[2]), nome: t[3], via: t[0] };
      }
    } catch (e) {}
  }
  return null;
}

async function ouve(anexo) {
  const fsLocal = require('fs');
  const spawnSync = require('child_process').spawnSync;
  const ext = ({ 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/opus': 'opus', 'audio/oga': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/flac': 'flac' })[anexo.tipo] || 'bin';
  const caminho = '/tmp/voz-recebida.' + ext;
  try { fsLocal.writeFileSync(caminho, Buffer.from(anexo.b64, 'base64')); } catch (e) { return ''; }
  const modelo = '/tmp/vosk-model-small-pt-0.3';
  if (!fsLocal.existsSync(modelo)) {
    try {
      console.log('🎧 baixando o modelo de escuta (31 MB, uma vez por turno)...');
      const r = await fetch('https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip', { signal: AbortSignal.timeout(240000) });
      if (r.ok) {
        fsLocal.writeFileSync('/tmp/vosk-pt.zip', Buffer.from(await r.arrayBuffer()));
        spawnSync('unzip', ['-q', '-o', '/tmp/vosk-pt.zip', '-d', '/tmp'], { timeout: 180000 });
      }
    } catch (e) { console.log('modelo do ouvido falhou:', e.message); }
  }
  if (!fsLocal.existsSync(modelo)) return '';
  const r = spawnSync('python3', ['tools/transcreve.py', caminho], { timeout: 240000, encoding: 'utf8' });
  try {
    const j = JSON.parse(String(r.stdout || '').trim().split(NL).pop());
    return String(j.texto || '').trim();
  } catch (e) { return ''; }
}

// O dono pediu resposta falada?
function pedeAudio(txt) {
  const t = String(txt || '');
  if (/(manda|mandar|envia|enviar|quero|queria|pode|poderia|consegue)\s+(um\s+|o\s+|uma\s+)?(áudio|audio|voz)/i.test(t)) return true;
  if (/(em|por)\s+(áudio|audio|voz)\b/i.test(t)) return true;
  if (/(áudio|audio)\s+(de|com)\s+(bom\s+dia|boa\s+tarde|boa\s+noite)/i.test(t)) return true;
  return false;
}
// ================== fim da voz ==================

// 🧾 v12.5: falhas por e-mail nesta sessão (o escutador chama processOnce em loop no mesmo processo)
const falhasPorUid = new Map();
async function processOnce() {
  if (!USER || !PASS) { console.error('sem credenciais'); return 0; }
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  let respondidos = 0;
  try {
    // v12.5: UID (não número de sequência) e ordem de chegada; quem falhou 2x nesta sessão fica para o próximo turno
    const uids = await client.search({ seen: false }, { uid: true });
    const alvo = (uids || []).slice().sort((a, b) => a - b).filter(u => (falhasPorUid.get(u) || 0) < 2).slice(0, 5);
    for (const uid of alvo) {
      try {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!msg || !msg.envelope) continue;
        const de = (msg.envelope.from || []).map(f => f.address).join(',').toLowerCase();
        const assunto = (msg.envelope.subject || '(sem assunto)');
        if (!de || de.includes(USER.toLowerCase())) { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); continue; }
        const bruto = (msg.source || '').toString();
        const corpoMsg = pegaTexto(bruto, assunto);
        const anexos = extraiAnexos(bruto);
        const imagem = anexos[0] || null;
        const audioAnexo = (imagem ? null : extraiAudio(bruto));
        if (imagem || audioAnexo || /filename=|Content-Disposition:\s*attachment/i.test(bruto)) await esperaFerramentas();
        let transcrito = '';
        if (audioAnexo) {
          transcrito = await ouve(audioAnexo);
          console.log(transcrito ? '🎧 ouvi o áudio: ' + transcrito.slice(0, 90) : '🎧 não consegui ouvir o áudio (' + audioAnexo.tipo + ')');
        }
        // 📎 14/10: documento é extraído MESMO quando vem foto ou áudio junto (antes, a foto mandava e o arquivo era ignorado)
        const docAnexo = extraiAnexoTexto(bruto);
        let textoDoc = '', imagemDoPdf = null;
        if (docAnexo) {
          textoDoc = await docTexto(docAnexo);
          if (!textoDoc && /pdf/i.test(String(docAnexo.nome) + ' ' + docAnexo.tipo)) {
            imagemDoPdf = await renderPdf(docAnexo);
            console.log(imagemDoPdf ? '🖨️ PDF sem texto → renderizei a 1ª página e mandei para a visão' : '🖨️ PDF sem texto e não consegui renderizar');
          }
          if (textoDoc) console.log('📄 li o arquivo ' + docAnexo.nome + ' (' + Math.round(docAnexo.bytes / 1024) + 'KB → ' + textoDoc.length + ' caracteres)');
        }
        const chave = limpaAssunto(assunto);
        const citado = citacaoDoEmail(bruto);
        const lembrado = memoria.has(chave) ? memoria.get(chave) : '';
        const contexto = [citado, lembrado].filter(Boolean).join(NL + '---' + NL).slice(0, 1600);
        const blocoCtx = contexto ? (NL + NL + 'Contexto de mensagens anteriores desta conversa (use somente se ajudar; pode ignorar):' + NL + contexto) : '';
        console.log('📨 de', de, '| assunto:', assunto.slice(0, 60), imagem ? '| 📷 foto ' + imagem.tipo + ' ~' + Math.round(imagem.bytes / 1024) + 'KB' : (audioAnexo ? '| 🎤 áudio ' + audioAnexo.tipo + ' ~' + Math.round(audioAnexo.bytes / 1024) + 'KB' : (docAnexo ? '| 📄 doc ' + docAnexo.nome + ' ~' + Math.round(docAnexo.bytes / 1024) + 'KB' : '')));
        const imagemVisao = imagem || imagemDoPdf;
        // 🎯 v11→v12.2: o olho mede ANTES dos motores; no prompt só vai o que ajuda (rostos, quando a pergunta é sobre pessoas)
        let dicaOlho = '';
        let pistasOlho = '';
        if (imagemVisao) {
          pistasOlho = await olhoPistas(imagemVisao);
          // 🙈 v12.2: medidas ricas no prompt deixavam motor CEGO "descrever" a foto (rodada 13) — agora só vai a
          // contagem de rostos, e só quando a pergunta é sobre pessoas. O resto do olho fica para o fallback honesto.
          const mRost = pistasOlho.match(/detectei (\d+) rosto/);
          if (mRost && /pessoa|gente|rosto|quant[oa]s|quem|crian[çc]a|homem|mulher|fam[íi]lia/i.test(corpoMsg + ' ' + assunto)) dicaOlho = NL + NL + 'Um detector local de rostos (pode errar) contou ' + mRost[1] + ' rosto(s) provável(is) na imagem — confira com o que você vê.';
        }
        // 🔤 v12: leitor de texto LOCAL (sem internet) roda em toda foto; o texto só entra no prompt com SINAL
        // de texto (olho mediu texto, o dono pediu leitura, ou confiança alta) — rabisco de paisagem não entra.
        let ocrFoto = '', ocrAceito = '', ocrIncerto = '', lupaFoto = null;   // v12.8: lupaFoto guarda a leitura da lupa (não chamar duas vezes)
        if (imagemVisao) {
          const info = await leTextoLocalInfo(imagemVisao);
          if (info && info.texto) {
            const palavras = (info.texto.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
            const conf = (info.confianca == null ? 0 : info.confianca);
            const olhoViuTexto = /TEXTO|documento|print/i.test(pistasOlho);
            const pedeLeitura = /leia|leitura|\bler\b|escrit|texto|bilhete|placa|document|recibo|receita|boleto|etiqueta|r[óo]tulo|cart[ãa]o/i.test(corpoMsg + ' ' + assunto);
            if (conf >= 55) ocrIncerto = info.texto;
            if (palavras >= 2 && (conf >= 80 || ((olhoViuTexto || pedeLeitura) && conf >= 75))) {
              ocrAceito = info.texto;
              ocrFoto = NL + NL + 'Um leitor de texto LOCAL (tesseract, sem internet) leu isto na imagem (confiança ' + conf + '%) — use como apoio para ler o texto; quando ele divergir do que você VÊ, confie na imagem:' + NL + info.texto.slice(0, 2500);
              console.log('🔤 texto do OCR local entrou no prompt (' + palavras + ' palavras · confiança ' + conf + '%)');
            } else console.log('🔤 OCR local ignorado (pouco sinal de texto: ' + palavras + ' palavras · confiança ' + conf + '%)');
          }
        }
        const pergunta = imagemVisao
          ? 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + CAPS + (imagem ? ' O dono mandou uma FOTO por e-mail' : ' O dono mandou um PDF DIGITALIZADO (a 1ª página foi renderizada aqui)') + '; descreva com precisão o que você vê e responda a pergunta dele, em português claro (máx 15 linhas). Se houver texto visível, leia o texto.\n\nPergunta dele: ' + (corpoMsg || assunto) + (textoDoc ? NL + NL + 'O dono TAMBÉM anexou um ARQUIVO ("' + docAnexo.nome + '"); texto extraído dele (pode estar truncado):' + NL + textoDoc + NL + 'Leve o arquivo em conta na resposta.' : '') + blocoCtx + dicaOlho + ocrFoto
          : 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + CAPS + ' Responda este e-mail em português claro (máx 15 linhas):\n\n' + assunto + '\n\n' + corpoMsg + (transcrito ? NL + NL + 'O dono TAMBÉM mandou um ÁUDIO; transcrição (motor pequeno — pode errar nomes): "' + transcrito + '". Responda ao conteúdo do áudio e mostre que ouviu.' : '') + (textoDoc ? NL + NL + 'O dono TAMBÉM mandou um ARQUIVO ("' + docAnexo.nome + '"); texto extraído dele (pode estar truncado):' + NL + textoDoc + NL + 'Responda ao conteúdo do arquivo, citando o que está nele.' : '') + blocoCtx;
        let respostaFerramenta = null, anexoVoz = null;
        const mVoz = (!imagem && !audioAnexo) ? corpoMsg.trim().match(/^voz\s*:\s*([\s\S]{1,700})$/) : null;
        if (mVoz) {
          anexoVoz = await fala(mVoz[1].trim());
          console.log(anexoVoz ? '🎙️ áudio gerado (' + anexoVoz.via + ', ' + Math.round(anexoVoz.buf.length / 1024) + 'KB)' : '🎙️ não consegui gerar o áudio');
        }
        if (!imagem && !audioAnexo && !docAnexo && !mVoz) respostaFerramenta = await ferramenta(corpoMsg);
        if (respostaFerramenta) console.log('🧰 respondido por ferramenta (sem motor)');
        // 🎯 v12: resposta curta demais para uma foto = UMA nova tentativa exigindo concretude
        let respostaMotor = null;
        // ⚡ v12.7: a visão local já começa a olhar a foto, em paralelo com os motores da internet
        let localEmCurso = null, localPronto = null;
        if (imagemVisao && !mVoz && !respostaFerramenta) {
          localEmCurso = iniciaVisaoLocal(imagemVisao, docAnexo ? '' : (corpoMsg || assunto));   // v12.8: com documento junto, a visão só descreve a foto
          localEmCurso.promessa.then(v => { localPronto = v; });
        }
        if (!mVoz && !respostaFerramenta) {
          const testeLocal = !!imagemVisao && /\[VISAO-LOCAL\]/i.test(assunto);
          if (testeLocal) console.log('🧪 teste: visão da internet pulada de propósito ([VISAO-LOCAL] no assunto)');
          respostaMotor = testeLocal ? null : await cerebro(pergunta, imagemVisao, { desistirSe: () => !!localPronto });
          if (imagemVisao && respostaMotor && String(respostaMotor.texto || '').trim().length < 45) {
            console.log('⚠️ resposta curta para a foto (' + String(respostaMotor.texto || '').trim().length + ' caracteres) — tentando de novo');
            const deNovo = await cerebro(pergunta + NL + NL + 'Seja concreto: diga o que aparece (objetos, cores, pessoas, texto). Onde não tiver certeza, repita o que o olho local mediu em vez de inventar.', imagemVisao);
            if (deNovo && String(deNovo.texto || '').trim().length > String(respostaMotor.texto || '').trim().length) respostaMotor = deNovo;
          }
        }
        // 👁️‍🗨️ v12.6: os motores de visão da internet falharam → a VISÃO LOCAL olha a foto e um motor de texto redige
        if (localEmCurso && respostaMotor) localEmCurso.para();   // ⚡ v12.7: a internet respondeu — libera a CPU
        if (imagemVisao && !respostaMotor && !mVoz && !respostaFerramenta) {
          const vl = localEmCurso ? await localEmCurso.promessa : null;
          if (vl) {
            console.log('👁️‍🗨️ visão local (' + vl.modelo + ', ' + vl.segundos + ' s) olhou a foto');
            const pedidoTexto = 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + CAPS + ' Os motores de visão da internet estão fora agora, então a casa olhou a ' + (imagem ? 'FOTO' : 'página do PDF') + ' com a VISÃO LOCAL (um modelo pequeno que roda aqui mesmo e pode errar detalhes). Ela descreveu assim:' + NL + '«' + vl.texto + '»' + (ocrAceito ? NL + 'O leitor de texto local (confiança alta) leu: «' + ocrAceito.slice(0, 800) + '»' : '') + (textoDoc ? NL + NL + 'O dono TAMBÉM anexou um ARQUIVO ("' + docAnexo.nome + '"); texto extraído (pode estar truncado):' + NL + textoDoc : '') + NL + NL + 'Pergunta do dono: ' + (corpoMsg || assunto) + NL + NL + 'Responda em português claro (máx 12 linhas) usando SOMENTE o que está descrito acima (não invente detalhes) e diga, numa frase curta no fim, que a descrição veio da visão local da casa porque os motores da internet estavam fora.';
            const redigida = await cerebro(pedidoTexto, null);
            if (redigida && String(redigida.texto || '').trim().length > 20) respostaMotor = { texto: redigida.texto, via: 'visão local (' + vl.modelo + ') + ' + redigida.via, modelo: redigida.modelo };
            else respostaMotor = { texto: 'Os motores de visão da internet estão fora agora, mas a minha visão local (roda aqui mesmo) olhou a sua ' + (imagem ? 'foto' : 'página') + ':' + NL + NL + vl.texto + NL + NL + '(descrição automática local — pode errar detalhes; se quiser a leitura completa, me reenvia daqui a pouco)', via: 'visão local (' + vl.modelo + ')', modelo: vl.modelo };
          }
        }
        // 🧩 v12.8: nem a internet nem a visão local viram a foto → ainda dá para responder o que é TEXTO (o arquivo
        // anexado, o texto lido na foto) com um motor de texto, dizendo com franqueza que a foto não pôde ser vista
        if (imagemVisao && !respostaMotor && !mVoz && !respostaFerramenta) {
          let lidoFoto = ocrAceito ? ocrAceito.slice(0, 800) : '';
          if (!lidoFoto) { lupaFoto = await leTextoDaFoto(imagemVisao); lidoFoto = lupaFoto || ''; }
          if (textoDoc || lidoFoto) {
            const vistoOlho = await olhoDaFoto(imagemVisao);
            const pedidoSemVisao = 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + CAPS + ' Os motores de visão estão fora agora e a casa NÃO conseguiu ver a ' + (imagem ? 'foto' : 'página') + ' em detalhe.' + (lidoFoto ? ' Um leitor de texto leu isto na imagem: «' + lidoFoto + '».' : '') + (vistoOlho ? ' Uma análise simples de pixels (só cores e formas, sem entender a cena) indicou: ' + vistoOlho.slice(0, 500) + '.' : '') + (textoDoc ? NL + NL + 'O dono TAMBÉM anexou um ARQUIVO ("' + docAnexo.nome + '"); texto extraído (pode estar truncado):' + NL + textoDoc : '') + NL + NL + 'Pergunta do dono: ' + (corpoMsg || assunto) + NL + NL + 'Responda em português claro (máx 12 linhas): responda tudo o que der com base no texto acima (principalmente o arquivo) e diga com franqueza, numa frase, que a foto não pôde ser vista em detalhe agora. Não invente o conteúdo da foto.';
            const semVisao = await cerebro(pedidoSemVisao, null);
            if (semVisao && String(semVisao.texto || '').trim().length > 20) { respostaMotor = { texto: semVisao.texto, via: 'sem visão (texto) + ' + semVisao.via, modelo: semVisao.modelo }; console.log('🧩 foto não vista, mas o texto (arquivo/leitura) foi respondido por um motor de texto'); }
          }
        }
        const r = mVoz
          ? { texto: anexoVoz ? '🎙️ Aí vai, falado (voz da casa):' + NL + NL + '« ' + mVoz[1].trim() + ' »' + NL + NL + 'O áudio vai em anexo — é só dar o play.' : 'quis te mandar um áudio, mas os motores de voz estão fora agora — tenta de novo em instantes (casa Rebocl).', via: anexoVoz ? 'voz' : 'voz-falhou' }
          : (respostaFerramenta ? { texto: respostaFerramenta, via: 'ferramenta' } : respostaMotor);
        const transporte = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS } });
        let resposta;
        if (r) resposta = r.texto;
        else if (audioAnexo) resposta = 'recebi seu áudio, mas não consegui ouvi-lo agora (os motores de escuta estão fora). Me escreve o que você queria que eu respondo na hora — ou manda o áudio de novo em alguns minutos (casa Rebocl).';
        else if (docAnexo && textoDoc) resposta = 'os motores estão oscilando agora, mas eu LI o seu arquivo "' + docAnexo.nome + '" — e o texto dele começa assim:' + NL + NL + '« ' + textoDoc.slice(0, 500) + ' »' + NL + NL + 'Me reenvia o pedido em instantes que eu comento o resto (casa Rebocl).';
        else if (docAnexo) resposta = 'recebi seu arquivo ("' + docAnexo.nome + '"), mas não consegui ler o texto dele — se ele for digitalizado (uma foto/scan), me manda como IMAGEM que eu leio pela visão; se for um formato diferente, me diz que eu vejo o que faço (casa Rebocl).';
        else if (imagemVisao) {
          let lido = ocrAceito ? ocrAceito.slice(0, 800) : '';
          let viaLeitura = lido ? 'pelo leitor local (sem internet)' : '';
          if (!lido) { lido = (lupaFoto !== null ? lupaFoto : await leTextoDaFoto(imagemVisao)); if (lido) viaLeitura = 'pela lupa de texto'; }
          if (!lido && ocrIncerto) { lido = ocrIncerto.slice(0, 800); viaLeitura = 'pelo leitor local (leitura incerta)'; }
          const visto = await olhoDaFoto(imagemVisao);
          const pedacos = [];
          if (lido) pedacos.push('li o texto ' + viaLeitura + ': « ' + lido + ' »');
          if (visto) pedacos.push('meu olho local (análise de pixels) viu: ' + visto);
          if (pedacos.length) resposta = 'recebi sua ' + (imagem ? 'foto' : 'página do PDF') + '. Os motores de VISÃO estão oscilando agora, mas ' + pedacos.map((p, i) => i ? p.charAt(0).toUpperCase() + p.slice(1) : p).join('. ') + '. Se quiser a leitura completa (detalhes, cenário), me reenvia em alguns minutos que eu tento de novo.';
          else resposta = 'recebi sua foto, mas não consegui abrir ela agora — manda de novo em instantes (casa Rebocl).';
        }
        else {
          const st = await ferramenta('status:');
          resposta = 'estou vivo, mas os cérebros estão oscilando agora — reenvie em instantes que eu respondo.' + (st ? NL + NL + st : '');
        }
        if (!anexoVoz && r && !mVoz && pedeAudio(corpoMsg + ' ' + transcrito)) {
          anexoVoz = await fala(resposta);
          if (anexoVoz) console.log('🎙️ resposta falada a pedido (' + anexoVoz.via + ')');
        }
        if (resposta) resposta = resposta.charAt(0).toUpperCase() + resposta.slice(1);   // v12.3: começa com maiúscula
        const opcoes = { from: '"Assistente Rebocl" <' + USER + '>', to: de, subject: 'Re: ' + assunto, text: (resposta.indexOf('Assistente Rebocl') >= 0 ? resposta : resposta + '\n\n— Assistente Rebocl (casa Rebocl Brank)'), inReplyTo: msg.envelope.messageId, references: msg.envelope.messageId };
        if (anexoVoz) opcoes.attachments = [{ filename: anexoVoz.nome, content: anexoVoz.buf }];
        await transporte.sendMail(opcoes);
        console.log('✉️ respondido via', r ? r.via + (r.modelo ? ' · ' + r.modelo : '') : 'sem cérebro');
        try { require('fs').appendFileSync('email-log.md', '- ' + new Date().toISOString().slice(0, 16) + ' UTC — ' + mascaraEndereco(de) + ' | "' + assuntoPublico(assunto) + '" → respondido via ' + (r ? r.via + (r.modelo ? ' (' + r.modelo + ')' : '') : 'fallback') + (anexoVoz ? ' + áudio' : '') + '\n'); } catch (e) {}
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        memoria.set(chave, 'Pergunta: ' + String(corpoMsg || assunto).slice(0, 400) + NL + 'Resposta: ' + String(resposta).slice(0, 800));
        if (memoria.size > 25) { const k0 = memoria.keys().next().value; memoria.delete(k0); }
        respondidos++;
        await sleep(2000);
      } catch (e) {
        const n = (falhasPorUid.get(uid) || 0) + 1;
        falhasPorUid.set(uid, n);
        console.error('⚠️ e-mail uid ' + uid + ' falhou (' + n + 'ª vez): ' + String(e && e.message || e).slice(0, 160) + (n >= 2 ? ' — fica para o próximo turno, sigo com os outros' : ''));
      }
    }
  } finally { lock.release(); await client.logout(); }
  return respondidos;
}
module.exports = { processOnce, extraiAnexos, pegaTexto, cerebro, ferramenta, limpaAssunto, citacaoDoEmail, memoria, extraiAudio, fala, ouve, pedeAudio, limpaPraFalar, extraiAnexoTexto, docTexto, olhoDaFoto, olhoPistas, leTextoLocal, leTextoLocalInfo, pareceCego, SO_TEXTO, mascaraEndereco, assuntoPublico, falhasPorUid, visaoLocal, iniciaVisaoLocal, esperaFerramentas, renderPdf, buscaRota, corre };
if (require.main === module) { processOnce().then(n => console.log('ciclo único:', n, 'respondidos')).catch(e => { console.error('ERRO:', e.message); process.exit(0); }); }
