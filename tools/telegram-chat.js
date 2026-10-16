// 📲 CHAT NO TELEGRAM v1 (16/10/2026) — o mesmo chat da casa no bot @ceifalume_bot. O turno lê as mensagens PRIVADAS
// do bot (getUpdates com espera longa) e responde com os mesmos motores do e-mail: texto, foto, nota de voz, documento
// (PDF, planilha, Word), vídeo, lembretes, pesquisa, planilha/PDF gerados e as ferramentas (clima, câmbio…).
// Só o DONO é atendido: ele se apresenta UMA vez com "/parear <código>" (segredo TELEGRAM_PAREAR) e o ID dele fica
// guardado na própria caixa do Gmail (pasta Rebocl-Config) — sobrevive à troca de turno. Quem mais escrever ao bot (é o
// bot do canal do jogo Ceifalume) recebe uma resposta curta com o canal e o Discord. Grupos e canais são ignorados.
const NL = '\n';
const PASTA_CONFIG = 'Rebocl-Config';
const CANAL = 'https://t.me/ceifalume', DISCORD = 'https://discord.gg/AnJr5nqx4K';

function paraTelegramHtml(texto) {   // markdown dos modelos → HTML que o Telegram aceita (b, i, code, pre)
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const partes = String(texto || '').split(/```[a-z]*\r?\n?/i);
  return partes.map((p, i) => {
    if (i % 2 === 1) return '<pre>' + esc(p.replace(/\s+$/, '')) + '</pre>';
    return esc(p).split(NL).map(l => l.replace(/^\s*#{1,6}\s+(.+)$/, '<b>$1</b>').replace(/^\s*[-*]\s+/, '• '))
      .join(NL).replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>').replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }).join('');
}
function pedacos(texto, max) {      // o Telegram aceita até 4096 caracteres por mensagem
  const out = [];
  let resto = String(texto || '');
  while (resto.length > max) {
    let corte = resto.lastIndexOf(NL + NL, max);
    if (corte < max * 0.5) corte = resto.lastIndexOf(NL, max);
    if (corte < max * 0.5) corte = max;
    out.push(resto.slice(0, corte));
    resto = resto.slice(corte).replace(/^\s+/, '');
  }
  if (resto.trim()) out.push(resto);
  return out;
}

function criaTelegram(opcoes) {
  opcoes = opcoes || {};
  const chat = opcoes.chat || require('./email-chat.js');
  const TOKEN = String(opcoes.token || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CODIGO = String(opcoes.codigo || process.env.TELEGRAM_PAREAR || '').trim();
  const log = opcoes.log || (s => console.log(s));
  const api = opcoes.api || (async (metodo, corpo, espera) => {
    const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/' + metodo, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo || {}), signal: AbortSignal.timeout((espera || 30) * 1000) });
    const j = await r.json().catch(() => ({ ok: false, description: 'resposta inválida (' + r.status + ')' }));
    if (!j.ok) { const e = new Error(String(j.description || r.status)); e.codigo = j.error_code || r.status; throw e; }
    return j.result;
  });
  const baixa = opcoes.baixa || (async fileId => {
    const f = await api('getFile', { file_id: fileId });
    const r = await fetch('https://api.telegram.org/file/bot' + TOKEN + '/' + f.file_path, { signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error('download ' + r.status);
    return { buf: Buffer.from(await r.arrayBuffer()), caminho: f.file_path };
  });
  const enviaDoc = opcoes.enviaDoc || (async (chatId, nome, buf, legenda) => {
    const fd = new FormData();
    fd.append('chat_id', String(chatId));
    if (legenda) fd.append('caption', legenda.slice(0, 1000));
    fd.append('document', new Blob([buf]), nome);
    const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendDocument', { method: 'POST', body: fd, signal: AbortSignal.timeout(120000) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error('sendDocument: ' + String(j.description || r.status).slice(0, 80));
  });
  const lerDono = opcoes.lerDono || (async () => chat.comCaixaSeparada(async c => {
    if (!(await c.list()).find(p => p.path === PASTA_CONFIG)) return null;
    const lock = await c.getMailboxLock(PASTA_CONFIG);
    try {
      const u = await c.search({ all: true }, { uid: true });
      let id = null;
      if (u && u.length) for await (const m of c.fetch(u, { headers: ['x-rebocl-telegram-dono'] }, { uid: true })) {
        const v = (String(m.headers || '').match(/x-rebocl-telegram-dono:\s*(-?\d+)/i) || [])[1];
        if (v) id = Number(v);
      }
      return id;
    } finally { lock.release(); }
  }));
  const gravarDono = opcoes.gravarDono || (async id => chat.comCaixaSeparada(async c => {
    try { await c.mailboxCreate(PASTA_CONFIG); } catch (e) {}
    const corpo = ['From: "Config da casa" <' + process.env.GMAIL_CHAT_ADDR + '>', 'To: ' + process.env.GMAIL_CHAT_ADDR, 'Subject: telegram-dono',
      'Date: ' + new Date().toUTCString(), 'X-Rebocl-Telegram-Dono: ' + id, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '',
      'Conversa do dono no Telegram (pareada em ' + new Date().toISOString() + ').'].join('\r\n');
    await c.append(PASTA_CONFIG, Buffer.from(corpo), ['\\Seen']);
  }));
  const estado = { dono: undefined, tentativas: new Map(), avisados: new Set(), historico: [] };

  async function envia(chatId, texto, extra) {
    const blocos = pedacos(texto, 3800);
    for (const b of blocos) {
      try { await api('sendMessage', Object.assign({ chat_id: chatId, text: paraTelegramHtml(b), parse_mode: 'HTML', disable_web_page_preview: true }, extra || {})); }
      catch (e) { await api('sendMessage', Object.assign({ chat_id: chatId, text: chat.semMarcacao(b), disable_web_page_preview: true }, extra || {})); }
    }
  }
  function contexto() {
    return estado.historico.length ? NL + NL + 'Conversa recente no Telegram (use se ajudar):' + NL + estado.historico.slice(-6).map(h => (h.dono ? 'Dono: ' : 'Assistente: ') + h.texto.slice(0, 300)).join(NL) : '';
  }
  async function responde(m) {   // o dono escreveu: monta a resposta com os motores do chat
    const chatId = m.chat.id;
    let texto = String(m.text || m.caption || '').trim();
    const avisos = [];
    let imagem = null, textoDoc = '', nomeDoc = '', transcrito = '';
    // anexos
    if (m.photo && m.photo.length) {
      const maior = m.photo[m.photo.length - 1];
      const b = await baixa(maior.file_id);
      imagem = { tipo: 'image/jpeg', b64: b.buf.toString('base64'), bytes: b.buf.length };
    } else if (m.voice || m.audio) {
      const a = m.voice || m.audio;
      const b = await baixa(a.file_id);
      transcrito = await chat.ouve({ tipo: a.mime_type || 'audio/ogg', b64: b.buf.toString('base64'), bytes: b.buf.length });
      if (!transcrito) avisos.push('Recebi o áudio, mas não consegui entender agora — pode mandar de novo ou escrever?');
    } else if (m.video || m.video_note || (m.document && /^video\//.test(m.document.mime_type || ''))) {
      const v = m.video || m.video_note || m.document;
      const b = await baixa(v.file_id);
      const pv = chat.processaVideo({ tipo: v.mime_type || 'video/mp4', b64: b.buf.toString('base64'), bytes: b.buf.length });
      const fala = pv.audio ? await chat.ouve(pv.audio) : '';
      if (pv.quadros.length) imagem = pv.quadros.length > 1 ? await chat.montaFotos(pv.quadros.slice(0, 4)) : pv.quadros[0];
      texto = (texto || 'O que acontece neste vídeo?') + ' (Atenção: é um VÍDEO; ' + (imagem && imagem.varias ? 'estes são ' + imagem.varias + ' quadros dele, numerados na ordem do tempo' : 'este é um quadro dele') + '.' + (fala ? ' O áudio diz: "' + fala.slice(0, 600) + '".' : '') + ')';
      if (!pv.quadros.length) avisos.push('Recebi o vídeo, mas não consegui abri-lo aqui.');
    } else if (m.document) {
      const d = m.document;
      const b = await baixa(d.file_id);
      if (/^image\//.test(d.mime_type || '') || /\.(jpe?g|png|webp|heic|heif)$/i.test(d.file_name || '')) {
        imagem = { tipo: d.mime_type || 'image/jpeg', b64: b.buf.toString('base64'), bytes: b.buf.length };
      } else {
        nomeDoc = d.file_name || 'arquivo';
        textoDoc = await chat.docTexto({ nome: nomeDoc, tipo: d.mime_type || '', b64: b.buf.toString('base64'), bytes: b.buf.length });
        if (!textoDoc && /pdf/i.test(nomeDoc + ' ' + (d.mime_type || ''))) {
          const pags = await chat.renderPdfPaginas({ b64: b.buf.toString('base64') }, 4);
          const lidos = [];
          for (let i = 0; i < pags.length; i++) { const t = await chat.leTextoLocal(pags[i]); if (t) lidos.push('[página ' + (i + 1) + '] ' + t); }
          if (lidos.length) textoDoc = '(PDF digitalizado, lido pelo leitor local)' + NL + lidos.join(NL);
          else if (pags.length) imagem = pags.length > 1 ? await chat.montaFotos(pags) : pags[0];
        }
        if (!textoDoc && !imagem) avisos.push('Recebi o arquivo "' + nomeDoc + '", mas não consegui ler o texto dele.');
      }
    }
    if (transcrito) texto = (texto ? texto + NL : '') + transcrito;
    // comandos e ferramentas (só texto puro)
    if (texto && !imagem && !textoDoc) {
      const cmd = (await chat.comandosDaCasa(texto, 'tg:' + chatId, 'tg-' + m.message_id, 'Telegram').catch(() => null)) || (await chat.ferramenta(texto).catch(() => null));
      if (cmd) return { texto: cmd, via: 'comando/ferramenta' };
    }
    const pedeArquivo = chat.pedidoDeArquivo(texto, !!(imagem || textoDoc));
    const notaArquivo = pedeArquivo === 'planilha' ? NL + NL + 'IMPORTANTE: o dono pediu uma PLANILHA. Responda curto e inclua a tabela completa em CSV (separador ponto e vírgula; 1ª linha com os títulos) entre ```csv e ```.' : '';
    const base = 'Você é a Assistente Rebocl, do Brasil, direta e calorosa.' + chat.CAPS + ' Agora você está respondendo pelo TELEGRAM (mensagens curtas, máx 12 linhas).';
    let r = null;
    if (imagem) {
      const img = await chat.preparaFoto(imagem);
      const pergunta = base + ' O dono mandou uma IMAGEM; descreva com precisão o que você vê e responda. Se houver texto visível, leia.' + NL + NL + 'Mensagem dele: ' + (texto || 'O que tem nesta imagem?') + contexto();
      r = await chat.cerebro(pergunta, img);
      if (!r) {
        const vl = await chat.visaoLocal(img, texto || 'O que tem nesta imagem?');
        if (vl) r = { texto: vl.texto + NL + NL + '(Descrição feita pela visão local da casa — os motores de visão da internet estavam fora.)', via: 'visão local (' + vl.modelo + ')' };
      }
    } else if (texto || textoDoc) {
      const pergunta = base + NL + NL + 'Mensagem dele: ' + (texto || '(sem texto)') + (textoDoc ? NL + NL + 'Ele mandou o ARQUIVO "' + nomeDoc + '"; texto extraído (pode estar truncado):' + NL + textoDoc.slice(0, 12000) : '') + notaArquivo + contexto();
      r = await chat.cerebro(pergunta, null);
      if (!r) {
        const l = await chat.cerebroLocal(pergunta);
        if (l) r = { texto: l.texto + NL + NL + '(Resposta do cérebro local da casa — os motores de texto da internet estavam fora.)', via: 'cérebro local (' + l.modelo + ')' };
      }
    }
    if (!r && !avisos.length) avisos.push('Estou com os motores oscilando agora — me manda de novo em alguns minutos?');
    let resposta = r ? chat.limpaVazamento(r.texto) : '';
    const anexos = [];
    if (pedeArquivo === 'planilha' && resposta) {
      const mCsv = resposta.match(/```(?:csv)?[ \t]*\r?\n([\s\S]*?)```/i);
      const xlsx = mCsv ? chat.csvParaXlsx(mCsv[1]) : null;
      if (xlsx) { anexos.push({ nome: 'planilha.xlsx', buf: xlsx }); resposta = resposta.replace(mCsv[0], '(A planilha vai em anexo.)'); }
    } else if (pedeArquivo === 'pdf' && resposta) {
      const pdf = chat.textoParaPdf(resposta);
      if (pdf) anexos.push({ nome: 'resposta.pdf', buf: pdf });
    }
    if (avisos.length) resposta = (resposta ? resposta + NL + NL : '') + avisos.join(' ');
    return { texto: resposta, via: r ? r.via : 'aviso', anexos };
  }
  async function trataAtualizacao(u) {
    const m = u.message || u.edited_message;
    if (!m || !m.chat || m.chat.type !== 'private') return 'ignorado';           // grupos e canais: nada
    const chatId = m.chat.id;
    const texto = String(m.text || '').trim();
    if (estado.dono === undefined) estado.dono = await lerDono().catch(() => null);
    const par = texto.match(/^\/parear(?:@\w+)?\s+(\d{4,8})$/i);
    if (par) {
      const n = (estado.tentativas.get(chatId) || 0) + 1;
      estado.tentativas.set(chatId, n);
      if (estado.dono && estado.dono !== chatId) { await envia(chatId, 'Este bot já está pareado com o dono da casa.'); return 'pareamento recusado (já tem dono)'; }
      if (n > 5) return 'pareamento bloqueado (tentativas demais)';
      if (CODIGO && par[1] === CODIGO) {
        await gravarDono(chatId);
        estado.dono = chatId;
        log('📲 Telegram: dono pareado (conversa ...' + String(chatId).slice(-3) + ')');
        await envia(chatId, 'Pronto! 🌙 A partir de agora eu atendo você aqui também — do mesmo jeito que por e-mail: pergunte, mande foto, áudio, documento ou vídeo. Experimente: "lembrete: amanhã às 7h regar a horta".');
        return 'pareado';
      }
      await envia(chatId, 'Código não confere. Confira e mande de novo: /parear <código>');
      return 'código errado';
    }
    if (!estado.dono || chatId !== estado.dono) {
      if (!estado.avisados.has(chatId)) {
        estado.avisados.add(chatId);
        await envia(chatId, 'Olá! 🌙 Eu sou o bot do canal Ceifalume (avisos do jogo): ' + CANAL + ' — para falar com a equipe, use o Discord: ' + DISCORD);
      }
      return 'desconhecido';
    }
    const digitando = setInterval(() => { api('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {}); }, 4500);
    api('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
    try {
      const r = await responde(m);
      if (r.texto) await envia(chatId, r.texto, { reply_to_message_id: m.message_id, allow_sending_without_reply: true });
      for (const a of (r.anexos || [])) await enviaDoc(chatId, a.nome, a.buf, a.nome === 'planilha.xlsx' ? 'Planilha pedida' : 'Resposta em PDF');
      estado.historico.push({ dono: true, texto: String(m.text || m.caption || '(anexo)') }, { dono: false, texto: String(r.texto || '') });
      if (estado.historico.length > 12) estado.historico.splice(0, estado.historico.length - 12);
      log('📲 Telegram: respondido via ' + r.via + ((r.anexos || []).length ? ' + ' + r.anexos.map(a => a.nome).join(', ') : ''));
      return 'respondido';
    } finally { clearInterval(digitando); }
  }
  async function laco(fim) {   // espera longa: o Telegram segura a conexão até chegar mensagem (até 50 s)
    let offset = 0, erros = 0;
    log('📲 Telegram ligado (@' + ((await api('getMe').catch(() => ({}))).username || '?') + ') — só o dono pareado é atendido');
    while (Date.now() < fim) {
      try {
        const lote = await api('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'edited_message'] }, 70);
        erros = 0;
        for (const u of lote) {
          offset = u.update_id + 1;
          try { await trataAtualizacao(u); } catch (e) { log('📲 Telegram: mensagem falhou (' + String(e.message || e).slice(0, 80) + ')'); }
        }
      } catch (e) {
        erros++;
        const espera = e.codigo === 409 ? 30000 : Math.min(60000, 5000 * erros);   // 409 = outro turno lendo (troca de turno)
        if (erros === 1 || erros % 10 === 0) log('📲 Telegram: leitura falhou (' + String(e.message || e).slice(0, 60) + ') — tento de novo em ' + Math.round(espera / 1000) + ' s');
        await new Promise(r => setTimeout(r, espera));
      }
    }
  }
  return { trataAtualizacao, laco, estado, paraTelegramHtml, pedacos };
}

function inicia(fim) {
  if (!String(process.env.TELEGRAM_BOT_TOKEN || '').trim()) { console.log('📲 Telegram desligado (sem o segredo TELEGRAM_BOT_TOKEN)'); return null; }
  const tg = criaTelegram();
  tg.laco(fim || (Date.now() + 6 * 3600 * 1000)).catch(e => console.log('📲 Telegram parou: ' + String(e.message || e).slice(0, 80)));
  return tg;
}

module.exports = { criaTelegram, inicia, paraTelegramHtml, pedacos };
