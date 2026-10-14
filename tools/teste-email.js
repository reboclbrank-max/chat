// 🧪 TESTE DO CHAT POR E-MAIL — autoavaliação da casa (14/10/2026).
// A própria casa envia e-mails de teste para o endereço do chat (remetente = alias +teste,
// que cai no MESMO inbox), espera as respostas e grava um relatório em provas/.
// Uso: node tools/teste-email.js          (envia e avalia de verdade — só no Actions, por causa das credenciais)
//      node tools/teste-email.js --seco   (só mostra as mensagens que seriam enviadas)
const fs = require('fs');
const path = require('path');

const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 14);
const SECO = process.argv.includes('--seco');
const ARROBA = USER.indexOf('@');
const ALIAS = ARROBA > 0 ? USER.slice(0, ARROBA) + '+teste' + USER.slice(ARROBA) : 'teste@exemplo.com';
const MARCA = '[TESTE-REBOCL]';
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dataUTC = () => new Date().toUTCString();

const CASOS = [
  { n: 1, assunto: 'apresentação', esperado: 'Apresentação de si mesma (Assistente Rebocl), o que faz no canal e limitações ditas com honestidade.',
    corpo: 'Oi, chat! Aqui é o teste automático da casa — ninguém humano está do outro lado deste e-mail. Se apresente como se fosse a primeira vez que nos falamos: quem é você, o que você faz por aqui e o que você NÃO consegue fazer. Seja honesta, sem enfeite.' },
  { n: 2, assunto: 'lógica', esperado: 'Número 6, com explicação correta (cada uma aperta 3 mãos × 4 pessoas ÷ 2 = 6).',
    corpo: 'Teste de raciocínio: numa sala há 4 pessoas e cada uma aperta a mão de todas as outras exatamente uma vez. Quantos apertos de mão acontecem no total? Responda com o número e explique em 2 linhas.' },
  { n: 3, assunto: 'vida real', esperado: 'Resposta prática e local: calor, chuva de primavera chegando, dica de plantio/solo para feijão-caupi em Tobias Barreto (SE).',
    corpo: 'Vou plantar feijão-caupi em Tobias Barreto (SE) em outubro. O que eu devo esperar do clima daqui e qual dica prática você me dá? Resposta curta, de quem entende do campo.' },
  { n: 4, assunto: 'ferramenta status', esperado: 'Lista REAL do estado da casa (itens com ✅), vinda da ferramenta, não do cérebro.',
    corpo: 'status:' },
  { n: 5, assunto: 'ferramenta câmbio', esperado: 'Valor real do dólar em reais, com data de atualização (ferramenta).',
    corpo: 'cambio: dolar' },
  { n: 6, assunto: 'foto do laboratório', foto: true, esperado: 'quadrado azul, círculo vermelho, triângulo verde e o texto "CASA REBOCL 14/10/2026".',
    corpo: 'Anexei uma foto feita no laboratório da casa. Descreva exatamente o que você vê: as formas, as cores e todo o texto que aparece.' },
  { n: 7, assunto: 'verdade sobre limites', esperado: 'Limitações reais e honestas (visão pode falhar, memória curta entre e-mails distantes, sem WhatsApp, motores gratuitos oscilam).',
    corpo: 'Última pergunta, e quero a verdade sem enfeite: quais são HOJE as suas limitações como chat por e-mail? O que você ainda não consegue fazer direito?' }
];

function montaMensagem(caso, imgB64) {
  const id = '<teste-' + caso.n + '-' + Date.now() + '@rebocl.local>';
  const cab = [
    'From: "Teste da Casa" <' + ALIAS + '>',
    'To: ' + USER,
    'Subject: ' + MARCA + ' ' + caso.n + ' — ' + caso.assunto,
    'Date: ' + dataUTC(),
    'Message-ID: ' + id,
    'MIME-Version: 1.0',
    'Auto-Submitted: auto-generated'
  ];
  if (!imgB64) {
    return cab.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', caso.corpo]).join(CRLF);
  }
  const b = 'fronteira-teste-' + caso.n;
  const partes = [
    '--' + b,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    caso.corpo,
    '--' + b,
    'Content-Type: image/png; name="teste-visao.png"',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="teste-visao.png"',
    '',
    imgB64.match(/.{1,76}/g).join(CRLF),
    '--' + b + '--',
    ''
  ];
  return cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF);
}

function corpoDaResposta(bruto) {
  const p = String(bruto).split(CRLF + CRLF);
  for (let i = 1; i < p.length; i++) {
    if (p[i - 1].toLowerCase().indexOf('text/plain') >= 0) {
      let x = p[i];
      const corte = x.indexOf('--');
      if (corte > 0) x = x.slice(0, corte);
      return x.trim().slice(0, 3000);
    }
  }
  return p.slice(1).join(CRLF + CRLF).trim().slice(0, 3000);
}

(async () => {
  const imgPath = path.join(__dirname, 'teste-visao.png');
  const imgB64 = fs.existsSync(imgPath) ? fs.readFileSync(imgPath).toString('base64') : null;

  if (SECO) {
    for (const c of CASOS) {
      const raw = montaMensagem(c, c.foto ? imgB64 : null);
      console.log('===== caso', c.n, '·', c.assunto, c.foto ? '(com foto)' : '', '·', raw.length, 'bytes =====');
      console.log(raw.split(CRLF).slice(0, 8).join(NL));
      console.log('(...)');
    }
    console.log('teste a seco ok · foto presente?', !!imgB64);
    return;
  }

  if (!USER || !PASS) { console.error('sem credenciais (rode no Actions)'); process.exit(1); }
  const { ImapFlow } = require('imapflow');
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const t0 = Date.now();
  const enviados = [];
  const recebidas = new Map();
  try {
    for (const caso of CASOS) {
      const raw = montaMensagem(caso, caso.foto ? imgB64 : null);
      await client.append('INBOX', Buffer.from(raw));
      enviados.push({ n: caso.n, assunto: caso.assunto, corpo: caso.corpo, esperado: caso.esperado, foto: !!caso.foto, enviadoEm: Date.now() });
      console.log('📤 teste', caso.n, '—', caso.assunto, caso.foto ? '(com foto)' : '');
      await sleep(1500);
    }

    const limite = Date.now() + ESPERA_MIN * 60 * 1000;
    while (Date.now() < limite) {
      const uids = await client.search({ since: new Date(t0 - 86400000) });
      for (const uid of (uids || [])) {
        const msg = await client.fetchOne(uid, { source: true, envelope: true });
        if (!msg || !msg.envelope) continue;
        const de = (msg.envelope.from || []).map(f => (f.address || '').toLowerCase()).join(',');
        if (!de.includes(USER.toLowerCase())) continue;
        const assunto = String(msg.envelope.subject || '');
        const m = assunto.match(/\[TESTE-REBOCL\]\s*(\d+)/i);
        if (!m || recebidas.has(m[1])) continue;
        const quando = msg.envelope.date ? new Date(msg.envelope.date).getTime() : Date.now();
        if (quando < t0 - 120000) continue;
        const texto = corpoDaResposta((msg.source || '').toString());
        recebidas.set(m[1], { texto, quando });
        console.log('📥 resposta', m[1], 'em', ((quando - t0) / 60000).toFixed(1), 'min →', texto.slice(0, 90).split(NL).join(' '));
        try { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); } catch (e) {}
      }
      if (recebidas.size >= CASOS.length) break;
      console.log('…', recebidas.size + '/' + CASOS.length, 'respostas · faltam', Math.max(0, Math.round((limite - Date.now()) / 60000)), 'min');
      await sleep(25000);
    }
  } finally {
    lock.release();
    try { await client.logout(); } catch (e) {}
  }

  const lat = enviados.map(c => { const r = recebidas.get(String(c.n)); return r ? (r.quando - c.enviadoEm) / 60000 : null; }).filter(x => x !== null);
  const L = [];
  L.push('# 🧪 Teste do chat por e-mail — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('Autoavaliação feita pela própria casa: ' + CASOS.length + ' e-mails enviados de ' + ALIAS + ' para ' + USER + ', respostas capturadas por IMAP.');
  L.push('');
  L.push('- enviados: ' + CASOS.length + ' · respondidos: ' + recebidas.size + ' · sem resposta: ' + (CASOS.length - recebidas.size));
  if (lat.length) L.push('- latência: ' + Math.min.apply(null, lat).toFixed(1) + ' a ' + Math.max.apply(null, lat).toFixed(1) + ' min (média ' + (lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1) + ' min)');
  L.push('');
  for (const c of enviados) {
    const r = recebidas.get(String(c.n));
    L.push('## ' + c.n + ' — ' + c.assunto + (c.foto ? ' 📷' : ''));
    L.push('');
    L.push('**Pergunta enviada:** ' + c.corpo.split(NL).join(' ').slice(0, 300));
    L.push('');
    L.push('**O que se espera:** ' + c.esperado);
    L.push('');
    if (r) {
      L.push('**Resposta do chat** (em ' + ((r.quando - c.enviadoEm) / 60000).toFixed(1) + ' min):');
      L.push('');
      L.push('```');
      L.push(r.texto.slice(0, 2000));
      L.push('```');
    } else {
      L.push('**SEM RESPOSTA na janela de ' + ESPERA_MIN + ' min** ❌');
    }
    L.push('');
  }
  L.push('---');
  L.push('_Gerado por `tools/teste-email.js` (workflow `teste-email.yml`). As respostas estão literais, como chegaram._');
  const rel = L.join(NL);
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-email-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, rel);
  console.log(NL + '================ RELATÓRIO ================' + NL + rel);
  console.log(NL + '💾 salvo em', destino);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
