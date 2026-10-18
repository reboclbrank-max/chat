// 🌐 TESTE CONTROLADO DE PONTA A PONTA — comando navegar: por e-mail.
// Envia UMA solicitação sintética pelo alias interno e só passa se o resumo público
// voltar na mesma conversa, correlacionado por In-Reply-To. Não usa URL privada,
// não imprime/endossa endereço, Message-ID, referência opaca, nem corpo das mensagens.
'use strict';
const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { pegaTexto } = require('./email-chat.js');

const USER = String(process.env.GMAIL_CHAT_ADDR || '').trim();
const PASS = String(process.env.GMAIL_CHAT_PASS || '').trim();
const ESPERA_PEDIDA = Number(process.env.ESPERA_MIN || 25);
const ESPERA_MIN = Number.isFinite(ESPERA_PEDIDA) ? Math.max(8, Math.min(35, ESPERA_PEDIDA)) : 25;
const MARCA = '[TESTE-REBOCL]';
const URL_PUBLICA = 'https://example.com/';
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const comTeto = (p, ms, nome) => {
  Promise.resolve(p).catch(() => {});
  return Promise.race([p, new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('teto: ' + nome)), ms))]);
};

function aliasInterno(endereco) {
  const i = endereco.indexOf('@');
  return i > 0 ? endereco.slice(0, i) + '+teste' + endereco.slice(i) : 'teste@exemplo.invalid';
}
function nomeRelatorio() {
  return 'teste-navegador-pareado-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.md';
}
function gravaRelatorio(dados) {
  const passou = !!dados.passou;
  const L = [];
  L.push('# 🌐 Teste controlado do navegador pareado por e-mail — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('- veredito: **' + (passou ? 'PASS' : 'FALHOU') + '**');
  L.push('- escopo: alias interno + URL pública sintética `https://example.com/`; não houve pessoa usuária, login, conteúdo privado ou URL com segredo.');
  L.push('- correlação exigida: cada resposta do Chat precisa ter `In-Reply-To` da mensagem sintética de origem; assunto sozinho não conta.');
  L.push('- privacidade: este relatório omite endereços, Message-IDs, referências opacas, cabeçalhos e corpos das mensagens.');
  L.push('');
  L.push('## Caminho verificado');
  L.push('');
  L.push('- e-mail sintético autorizado → validação/filamento do Chat: ' + (dados.inicial ? 'sim' : 'não'));
  L.push('- navegador público isolado → estado sanitizado → devolução na mesma conversa: ' + (dados.final ? 'sim' : 'não'));
  L.push('- resumo retornado reconheceu a página pública esperada (`Example Domain`): ' + (dados.conteudo ? 'sim' : 'não'));
  L.push('- respostas correlacionadas à thread exata: ' + (dados.correlacao ? 'sim' : 'não'));
  if (typeof dados.latencia === 'number') L.push('- latência total observada: ' + dados.latencia.toFixed(1) + ' min.');
  else L.push('- latência total observada: indisponível (não houve retorno final verificável na janela).');
  L.push('');
  L.push('## Limite honesto');
  L.push('');
  L.push('Esta é evidência controlada de ponta a ponta do canal e do pareamento assíncrono. Não mede satisfação humana, uso espontâneo, disponibilidade contínua nem SLA.');
  L.push('');
  L.push('---');
  L.push('_Gerado por `tools/teste-navegador-pareado.js` via `teste-email.yml`._');
  const destino = path.join(__dirname, '..', 'provas', nomeRelatorio());
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  return destino;
}
function montaMensagem(assunto, corpo, id, de, para) {
  return [
    'From: "Teste controlado da casa" <' + de + '>',
    'To: ' + para,
    'Subject: ' + assunto,
    'Date: ' + new Date().toUTCString(),
    'Message-ID: ' + id,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    corpo,
    ''
  ].join(CRLF);
}
function listaCaixas(pastas) {
  const resultado = ['INBOX'];
  for (const p of pastas || []) {
    const nome = String(p.path || '');
    if (!nome || resultado.includes(nome)) continue;
    if (p.specialUse === '\\Sent' || p.specialUse === '\\All' || /enviad|sent|todos|all mail/i.test(nome)) resultado.push(nome);
  }
  return resultado;
}
function inReplyToExato(valor, origem) {
  if (Array.isArray(valor)) return valor.some(x => String(x || '').trim() === origem);
  return String(valor || '').trim() === origem;
}

(async () => {
  if (!USER || !PASS) throw new Error('credenciais ausentes no runner de teste');
  const alias = aliasInterno(USER);
  const nonce = Date.now().toString(36) + '-' + Math.floor(Math.random() * 0x1000000).toString(36);
  const assunto = MARCA + ' N1 — navegador pareado ' + nonce;
  const origem = '<nav-pareado-' + nonce + '@rebocl.local>';
  const corpo = 'navegar: ' + URL_PUBLICA;
  let client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  const vistas = new Map();
  let caixas = ['INBOX'];
  let enviadoEm = 0;

  async function reconecta() {
    try { client.close(); } catch (e) {}
    client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
    await comTeto(client.connect(), 30000, 'reconexão IMAP');
    caixas = listaCaixas(await comTeto(client.list(), 30000, 'lista de caixas'));
  }
  async function varre() {
    let caixasLidas = 0;
    for (const caixa of caixas) {
      let lock = null;
      try {
        lock = await comTeto(client.getMailboxLock(caixa), 30000, 'trava IMAP');
        const uids = await comTeto(client.search({ header: { subject: assunto } }, { uid: true }), 30000, 'busca IMAP');
        for (const uid of uids || []) {
          const m = await comTeto(client.fetchOne(uid, { source: true, envelope: true, internalDate: true }, { uid: true }), 30000, 'leitura IMAP');
          if (!m || !m.envelope) continue;
          const id = String(m.envelope.messageId || caixa + '|' + uid);
          const texto = pegaTexto((m.source || '').toString(), String(m.envelope.subject || ''));
          const quando = new Date(m.internalDate || m.envelope.date || Date.now()).getTime();
          const anterior = vistas.get(id);
          if (!anterior || texto.length > anterior.texto.length) vistas.set(id, {
            texto,
            quando: Number.isFinite(quando) ? quando : Date.now(),
            inReplyTo: m.envelope.inReplyTo || ''
          });
        }
        caixasLidas++;
      } finally { if (lock) { try { lock.release(); } catch (e) {} } }
    }
    if (!caixasLidas) throw new Error('nenhuma caixa IMAP pôde ser lida');
  }
  function respostas() {
    return [...vistas.values()].filter(x => inReplyToExato(x.inReplyTo, origem));
  }
  function estado() {
    const rs = respostas();
    const inicial = rs.some(x => /mande[iy] abrir\s+example\.com|navegador p[úu]blico isolado/i.test(x.texto));
    const final = rs.find(x => /resultado da p[áa]gina p[úu]blica que voc[eê] pediu/i.test(x.texto));
    const conteudo = !!(final && /example domain/i.test(final.texto) && /example\.com/i.test(final.texto));
    return { inicial, final: !!final, conteudo, correlacao: rs.length > 0 && (inicial || !!final), latencia: final ? Math.max(0, (final.quando - enviadoEm) / 60000) : null };
  }

  try {
    await reconecta();
    let lock = null;
    try {
      lock = await comTeto(client.getMailboxLock('INBOX'), 30000, 'trava de envio');
      await comTeto(client.append('INBOX', Buffer.from(montaMensagem(assunto, corpo, origem, alias, USER))), 60000, 'envio sintético');
      enviadoEm = Date.now();
    } finally { if (lock) lock.release(); }
    console.log('📤 pedido sintético do navegador colocado na caixa');

    const limite = Date.now() + ESPERA_MIN * 60 * 1000;
    let s = { inicial: false, final: false, conteudo: false, correlacao: false, latencia: null };
    while (Date.now() < limite) {
      try { await varre(); }
      catch (e) { console.log('⚠️ coleta IMAP transitória; reconecto sem expor dados'); await reconecta(); continue; }
      s = estado();
      console.log('… confirmação inicial:', s.inicial ? 'sim' : 'não', '· retorno pareado:', s.final ? 'sim' : 'não');
      if (s.inicial && s.final && s.conteudo && s.correlacao) break;
      await sleep(20000);
    }
    try { await varre(); } catch (e) {}
    s = estado();
    const passou = s.inicial && s.final && s.conteudo && s.correlacao;
    const destino = gravaRelatorio(Object.assign({}, s, { passou }));
    console.log((passou ? '✔' : '✘') + ' relatório sanitizado salvo em ' + destino);
    try { await comTeto(client.logout(), 15000, 'logout'); } catch (e) {}
    process.exit(passou ? 0 : 1);
  } catch (e) {
    const destino = gravaRelatorio({ passou: false, inicial: false, final: false, conteudo: false, correlacao: false, latencia: null });
    console.error('✘ teste controlado interrompido; relatório sanitizado salvo em ' + destino);
    try { await comTeto(client.logout(), 15000, 'logout'); } catch (e2) {}
    process.exit(1);
  }
})();
