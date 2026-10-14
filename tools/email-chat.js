// 📧 CHAT POR EMAIL — módulo: processa 1 varredura da caixa (responde não-lidos com 3 rotas de cérebro)
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

function pegaTexto(bruto, assunto) {
  const mB = bruto.match(/content-type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n;]+)"?/i);
  if (mB) {
    const sep = '--' + mB[1].replace(/^--/, '');
    for (const p of bruto.split(sep)) {
      const iCab = p.search(/\r?\n\r?\n/);
      if (iCab < 0) continue;
      if (!/content-type:\s*text\/plain/i.test(p.slice(0, iCab))) continue;
      return limpaTexto(qpDecode(p.slice(iCab).replace(/^\r?\n\r?\n/, '')));
    }
  }
  const partes = bruto.split(/\r?\n\r?\n/);
  let corpoMsg = partes.slice(1).join('\n\n') || assunto;
  return limpaTexto(qpDecode(corpoMsg));
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

async function cerebro(pergunta, imagem) {
  const rotas = [];
  if (imagem) rotas.push(['visão (auto)', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: [{ type: 'text', text: pergunta }, { type: 'image_url', image_url: { url: 'data:' + imagem.tipo + ';base64,' + imagem.b64 } }] }], max_tokens: 600 }, true]);
  if (imagem) rotas.push(['visão (omni)', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: [{ type: 'text', text: pergunta }, { type: 'image_url', image_url: { url: 'data:' + imagem.tipo + ';base64,' + imagem.b64 } }] }], max_tokens: 600 }, true]);
  if (!imagem) rotas.push(
    ['frota', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true],
    ['reserva', 'https://text.pollinations.ai/openai/chat/completions', { model: 'openai-fast', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, false],
    ['llm7', 'https://api.llm7.io/v1/chat/completions', { model: 'DeepSeek-V4-Flash-0731', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true],
    ['omni', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: pergunta }], max_tokens: 500 }, true]
  );
  for (let rodada = 0; rodada < 3; rodada++) {
    for (const [nome, url, corpo, bearer] of rotas) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (bearer) headers['Authorization'] = 'Bearer unused';
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(corpo), signal: AbortSignal.timeout(60000) });
        if (!r.ok) continue;
        const j = await r.json();
        const t = ((((j.choices || [])[0] || {}).message || {}).content) || '';
        if (textoUtil(t)) return { texto: t.trim().slice(0, 2500), via: nome };
      } catch (e) {}
    }
    if (!rodada) await sleep(8000);
  }
  return null;
}
// 🔎 LUPA DE TEXTO (rede de segurança da visão): OCR grátis da api.ocr.space (chave pública de
// demonstração 'helloworld', sem cadastro). Usada só quando os motores de visão oscilam — assim o
// dono nunca fica sem resposta: pelo menos o TEXTO da foto é lido e devolvido.
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

async function processOnce() {
  if (!USER || !PASS) { console.error('sem credenciais'); return 0; }
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  let respondidos = 0;
  try {
    const uids = await client.search({ seen: false });
    const alvo = (uids || []).slice(-5);
    for (const uid of alvo) {
      const msg = await client.fetchOne(uid, { source: true, envelope: true });
      if (!msg || !msg.envelope) continue;
      const de = (msg.envelope.from || []).map(f => f.address).join(',').toLowerCase();
      const assunto = (msg.envelope.subject || '(sem assunto)');
      if (!de || de.includes(USER.toLowerCase())) { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); continue; }
      const bruto = (msg.source || '').toString();
      const corpoMsg = pegaTexto(bruto, assunto);
      const anexos = extraiAnexos(bruto);
      const imagem = anexos[0] || null;
      const audioAnexo = (imagem ? null : extraiAudio(bruto));
      let transcrito = '';
      if (audioAnexo) {
        transcrito = await ouve(audioAnexo);
        console.log(transcrito ? '🎧 ouvi o áudio: ' + transcrito.slice(0, 90) : '🎧 não consegui ouvir o áudio (' + audioAnexo.tipo + ')');
      }
      const docAnexo = (imagem || audioAnexo) ? null : extraiAnexoTexto(bruto);
      let textoDoc = '';
      if (docAnexo) {
        textoDoc = await docTexto(docAnexo);
        console.log(textoDoc ? '📄 li o arquivo ' + docAnexo.nome + ' (' + Math.round(docAnexo.bytes / 1024) + 'KB → ' + textoDoc.length + ' caracteres)' : '📄 não consegui ler o arquivo ' + docAnexo.nome);
      }
      const chave = limpaAssunto(assunto);
      const citado = citacaoDoEmail(bruto);
      const lembrado = memoria.has(chave) ? memoria.get(chave) : '';
      const contexto = [citado, lembrado].filter(Boolean).join(NL + '---' + NL).slice(0, 1600);
      const blocoCtx = contexto ? (NL + NL + 'Contexto de mensagens anteriores desta conversa (use somente se ajudar; pode ignorar):' + NL + contexto) : '';
      console.log('📨 de', de, '| assunto:', assunto.slice(0, 60), imagem ? '| 📷 foto ' + imagem.tipo + ' ~' + Math.round(imagem.bytes / 1024) + 'KB' : (audioAnexo ? '| 🎤 áudio ' + audioAnexo.tipo + ' ~' + Math.round(audioAnexo.bytes / 1024) + 'KB' : (docAnexo ? '| 📄 doc ' + docAnexo.nome + ' ~' + Math.round(docAnexo.bytes / 1024) + 'KB' : '')));
      const pergunta = imagem
        ? 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + CAPS + ' O dono mandou uma FOTO por e-mail; descreva com precisão o que você vê nela e responda a pergunta dele, em português claro (máx 15 linhas). Se houver texto na foto, leia o texto.\n\nPergunta dele: ' + (corpoMsg || assunto) + blocoCtx
        : 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + CAPS + ' Responda este e-mail em português claro (máx 15 linhas):\n\n' + assunto + '\n\n' + corpoMsg + (transcrito ? NL + NL + 'O dono TAMBÉM mandou um ÁUDIO; transcrição (motor pequeno — pode errar nomes): "' + transcrito + '". Responda ao conteúdo do áudio e mostre que ouviu.' : '') + (textoDoc ? NL + NL + 'O dono TAMBÉM mandou um ARQUIVO ("' + docAnexo.nome + '"); texto extraído dele (pode estar truncado):' + NL + textoDoc + NL + 'Responda ao conteúdo do arquivo, citando o que está nele.' : '') + blocoCtx;
      let respostaFerramenta = null, anexoVoz = null;
      const mVoz = (!imagem && !audioAnexo) ? corpoMsg.trim().match(/^voz\s*:\s*([\s\S]{1,700})$/) : null;
      if (mVoz) {
        anexoVoz = await fala(mVoz[1].trim());
        console.log(anexoVoz ? '🎙️ áudio gerado (' + anexoVoz.via + ', ' + Math.round(anexoVoz.buf.length / 1024) + 'KB)' : '🎙️ não consegui gerar o áudio');
      }
      if (!imagem && !audioAnexo && !docAnexo && !mVoz) respostaFerramenta = await ferramenta(corpoMsg);
      if (respostaFerramenta) console.log('🧰 respondido por ferramenta (sem motor)');
      const r = mVoz
        ? { texto: anexoVoz ? '🎙️ Aí vai, falado (voz da casa):' + NL + NL + '« ' + mVoz[1].trim() + ' »' + NL + NL + 'O áudio vai em anexo — é só dar o play.' : 'quis te mandar um áudio, mas os motores de voz estão fora agora — tenta de novo em instantes (casa Rebocl).', via: anexoVoz ? 'voz' : 'voz-falhou' }
        : (respostaFerramenta ? { texto: respostaFerramenta, via: 'ferramenta' } : await cerebro(pergunta, imagem));
      const transporte = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS } });
      let resposta;
      if (r) resposta = r.texto;
      else if (audioAnexo) resposta = 'recebi seu áudio, mas não consegui ouvi-lo agora (os motores de escuta estão fora). Me escreve o que você queria que eu respondo na hora — ou manda o áudio de novo em alguns minutos (casa Rebocl).';
      else if (docAnexo && textoDoc) resposta = 'os motores estão oscilando agora, mas eu LI o seu arquivo "' + docAnexo.nome + '" — e o texto dele começa assim:' + NL + NL + '« ' + textoDoc.slice(0, 500) + ' »' + NL + NL + 'Me reenvia o pedido em instantes que eu comento o resto (casa Rebocl).';
      else if (docAnexo) resposta = 'recebi seu arquivo ("' + docAnexo.nome + '"), mas não consegui ler o texto dele — se ele for digitalizado (uma foto/scan), me manda como IMAGEM que eu leio pela visão; se for um formato diferente, me diz que eu vejo o que faço (casa Rebocl).';
      else if (imagem) {
        const lido = await leTextoDaFoto(imagem);
        if (lido) resposta = 'recebi sua foto. Os motores de VISÃO estão oscilando agora, mas passei a minha lupa de texto e li isso na imagem:' + NL + NL + '« ' + lido + ' »' + NL + NL + 'Se quiser a descrição completa (formas, cores, cenário), me reenvia a foto em alguns minutos que eu tento de novo.';
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
      const opcoes = { from: '"Assistente Rebocl" <' + USER + '>', to: de, subject: 'Re: ' + assunto, text: (resposta.indexOf('Assistente Rebocl') >= 0 ? resposta : resposta + '\n\n— Assistente Rebocl (casa Rebocl Brank)'), inReplyTo: msg.envelope.messageId, references: msg.envelope.messageId };
      if (anexoVoz) opcoes.attachments = [{ filename: anexoVoz.nome, content: anexoVoz.buf }];
      await transporte.sendMail(opcoes);
      console.log('✉️ respondido via', r ? r.via : 'sem cérebro');
      try { require('fs').appendFileSync('email-log.md', '- ' + new Date().toISOString().slice(0, 16) + ' UTC — ' + de + ' | "' + assunto.slice(0, 40) + '" → respondido via ' + (r ? r.via : 'fallback') + (anexoVoz ? ' + áudio' : '') + '\n'); } catch (e) {}
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      memoria.set(chave, 'Pergunta: ' + String(corpoMsg || assunto).slice(0, 400) + NL + 'Resposta: ' + String(resposta).slice(0, 800));
      if (memoria.size > 25) { const k0 = memoria.keys().next().value; memoria.delete(k0); }
      respondidos++;
      await sleep(2000);
    }
  } finally { lock.release(); await client.logout(); }
  return respondidos;
}
module.exports = { processOnce, extraiAnexos, pegaTexto, cerebro, ferramenta, limpaAssunto, citacaoDoEmail, memoria, extraiAudio, fala, ouve, pedeAudio, limpaPraFalar, extraiAnexoTexto, docTexto };
if (require.main === module) { processOnce().then(n => console.log('ciclo único:', n, 'respondidos')).catch(e => { console.error('ERRO:', e.message); process.exit(0); }); }
