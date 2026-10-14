// 🧪 ROBÔ DE TESTE DO CHAT POR E-MAIL — v2 (corrigido 14/10/2026, madrugada)
// Correções da v1: (a) captura por ASSUNTO (a busca por data do Gmail era furada);
// (b) decodifica quoted-printable (as respostas vinham com =C3=A9 etc.);
// (c) procura em INBOX + Enviados + Todos + Spam; (d) tabela de inventário no relatório;
// (e) par de mensagens para testar a MEMÓRIA de conversa.
// Uso: node tools/teste-email.js (envia e avalia de verdade — só no Actions).
const fs = require('fs');
const path = require('path');

const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 16);
const ARROBA = USER.indexOf('@');
const ALIAS = ARROBA > 0 ? USER.slice(0, ARROBA) + '+teste' + USER.slice(ARROBA) : 'teste@exemplo.com';
const MARCA = '[TESTE-REBOCL]';
const CRLF = String.fromCharCode(13, 10);
const NL = String.fromCharCode(10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mascarar = a => { const s = String(a || ''); const i = s.indexOf('@'); return i < 3 ? '***' : s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i); };

const CASOS = [
  { n: 'R2-1', assunto: MARCA + ' R2-1 — apresentação', esperado: 'Apresentação honesta de si mesma, o que faz no canal e limites.',
    corpo: 'Oi, chat! Teste automático da casa (ninguém humano do outro lado). Se apresente como se fosse a primeira vez: quem é você, o que faz por aqui e o que NÃO consegue fazer. Sem enfeite.' },
  { n: 'R2-2', assunto: MARCA + ' R2-2 — lógica', esperado: 'Número 6, com a conta certa.',
    corpo: 'Teste de raciocínio: numa sala há 4 pessoas e cada uma aperta a mão de todas as outras exatamente uma vez. Quantos apertos de mão no total? Responda com o número e explique em 2 linhas.' },
  { n: 'R2-3', assunto: MARCA + ' R2-3 — vida real', esperado: 'Dica prática e local para plantar feijão-caupi em Tobias Barreto (SE) em outubro.',
    corpo: 'Vou plantar feijão-caupi em Tobias Barreto (SE) em outubro. O que devo esperar do clima e qual dica prática você dá? Curto, de quem entende do campo.' },
  { n: 'R2-4', assunto: MARCA + ' R2-4 — foto do laboratório', foto: true, esperado: 'quadrado azul, círculo vermelho, triângulo verde e o texto "CASA REBOCL 14/10/2026".',
    corpo: 'Anexei uma foto do laboratório da casa. Descreva exatamente o que você vê: formas, cores e todo o texto.' },
  { n: 'R2-5', assunto: MARCA + ' R2-5 — verdade sobre limites', esperado: 'Limites reais: visão pode falhar, memória curta, sem WhatsApp, motores gratuitos oscilam.',
    corpo: 'Quero a verdade sem enfeite: quais são HOJE as suas limitações como chat por e-mail? O que ainda não consegue fazer direito?' },
  { n: 'R2-6', assunto: MARCA + ' R2-6 — ajuda', esperado: 'Lista completa dos comandos (clima, cambio, hora, noticias, status, ajuda) + foto.',
    corpo: 'ajuda' },
  { n: 'R2-7', assunto: MARCA + ' R2-7 — memória', esperado: 'Resposta curta "guardado" aceitando guardar o código 7-4-2.',
    corpo: 'Guarde este detalhe para a próxima mensagem desta conversa: o código do portão da casa é 7-4-2. Responda só "guardado".' }
];

const M2_CASO = { n: 'R2-7b', assunto: 'Re: ' + MARCA + ' R2-7 — memória', esperado: 'Dizer o código 7-4-2, provando que usou a memória/contexto da conversa.' };

function decodificaQP(txt) {
  let t = String(txt);
  t = t.split('=' + CRLF).join('').split('=' + NL).join('').split(CRLF + '=').join('').split(NL + '=').join('');
  const bytes = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(t.slice(i + 1, i + 3))) { bytes.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(t.charCodeAt(i) & 0xff);
  }
  return Buffer.from(bytes).toString('utf8');
}
function corpoTexto(bruto, cb) {
  const p = String(bruto).split(CRLF + CRLF);
  let escolhido = null;
  for (let i = 1; i < p.length; i++) {
    const cab = p[i - 1].toLowerCase();
    if (cab.indexOf('text/plain') >= 0) {
      let x = p[i];
      const corte = x.indexOf(CRLF + '--');
      if (corte > 0) x = x.slice(0, corte);
      escolhido = x;
      if (cab.indexOf('quoted-printable') >= 0) return decodificaQP(escolhido).trim().slice(0, 2500);
      if (cb) return decodificaQP(escolhido).trim().slice(0, 2500);
      return escolhido.trim().slice(0, 2500);
    }
  }
  return (p.slice(1).join(CRLF + CRLF) || '').trim().slice(0, 2500);
}
function montaMensagem(assunto, corpo, imgB64) {
  const id = '<teste-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0'];
  if (!imgB64) return cab.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF);
  const b = 'fronteira-teste-' + Date.now();
  const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo, '--' + b,
    'Content-Type: image/png; name="teste-visao.png"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="teste-visao.png"', '',
    imgB64.match(/.{1,76}/g).join(CRLF), '--' + b + '--', ''];
  return cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF);
}

(async () => {
  if (!USER || !PASS) { console.error('sem credenciais (rode no Actions)'); process.exit(1); }
  const { ImapFlow } = require('imapflow');
  const imgB64 = fs.existsSync(path.join(__dirname, 'teste-visao.png')) ? fs.readFileSync(path.join(__dirname, 'teste-visao.png')).toString('base64') : null;
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const t0 = Date.now();
  const respostas = new Map();
  const inventario = [];

  // caixas disponíveis (nomes podem estar em português)
  const caixas = ['INBOX'];
  try {
    const lista = await client.list();
    for (const m of lista) {
      const p = m.path;
      if (/enviad|sent/i.test(p) || /todos|all mail/i.test(p) || /spam|lixo/i.test(p)) caixas.push(p);
    }
  } catch (e) { console.log('list de caixas falhou:', e.message); }
  console.log('caixas a varrer:', caixas.join(' | '));

  async function varre(rotulo) {
    for (const caixa of caixas) {
      let lock;
      try {
        lock = await client.getMailboxLock(caixa);
        const uids = await client.search({ subject: 'TESTE-REBOCL' });
        for (const uid of (uids || [])) {
          const m = await client.fetchOne(uid, { source: true, envelope: true, flags: true });
          if (!m || !m.envelope) continue;
          const de = (m.envelope.from || [{}])[0].address || '';
          if (de.toLowerCase().indexOf(ALIAS.toLowerCase()) >= 0) continue; // é mensagem nossa, não resposta
          const assunto = String(m.envelope.subject || '');
          if (assunto.indexOf('TESTE-REBOCL') < 0) continue;
          const chave = m.envelope.messageId || (uid + '|' + assunto);
          if (respostas.has(chave)) continue;
          const quando = m.envelope.date ? new Date(m.envelope.date).getTime() : Date.now();
          if (quando < t0 - 180000) continue;
          const texto = corpoTexto((m.source || '').toString());
          respostas.set(chave, { assunto, quando, texto, caixa, de: mascarar(de) });
          console.log('📥 resposta em', caixa, '·', assunto.slice(0, 60), '·', new Date(quando).toISOString().slice(11, 16));
        }
      } catch (e) { console.log('caixa', caixa, 'erro:', e.message.slice(0, 60)); }
      finally { if (lock) lock.release(); }
    }
    if (rotulo) console.log('·', rotulo, '· respostas até agora:', respostas.size);
  }

  // inventário + sonda (só leitura, nada de dado do dono)
  {
    let lock;
    try {
      lock = await client.getMailboxLock('INBOX');
      const a = await client.search({ since: new Date(t0 - 86400000) });
      const b = await client.search({ subject: 'TESTE-REBOCL' });
      const c = await client.search({ all: true });
      inventario.push('sonda: search({since})= ' + (a || []).length + ' · search({subject})= ' + (b || []).length + ' · search({all})= ' + (c || []).length);
      if (a && a.length) {
        const amostra = a.slice(-3);
        for (const uid of amostra) {
          const m = await client.fetchOne(uid, { envelope: true });
          if (m && m.envelope) inventario.push('  amostra since uid ' + uid + ' → ' + String(m.envelope.subject || '').slice(0, 60));
        }
      }
    } catch (e) { inventario.push('sonda erro: ' + e.message.slice(0, 80)); }
    finally { if (lock) lock.release(); }
  }

  // envio da rodada 2
  const enviados = [];
  {
    let lock;
    try {
      lock = await client.getMailboxLock('INBOX');
      for (const c of CASOS) {
        await client.append('INBOX', Buffer.from(montaMensagem(c.assunto, c.corpo, c.foto ? imgB64 : null)));
        enviados.push({ n: c.n, assunto: c.assunto, corpo: c.corpo, esperado: c.esperado, foto: !!c.foto, enviadoEm: Date.now() });
        console.log('📤', c.n, '—', c.assunto.replace(MARCA + ' ', ''), c.foto ? '(com foto)' : '');
        await sleep(1400);
      }
    } finally { if (lock) lock.release(); }
  }

  // espera pelas respostas (e depois dispara o M2 de memória)
  let m2Enviado = false;
  const limite = Date.now() + ESPERA_MIN * 60 * 1000;
  while (Date.now() < limite) {
    await varre('');
    const achadas = [...respostas.values()];
    const temR27 = achadas.some(r => r.assunto.indexOf('R2-7') >= 0 && r.assunto.indexOf('R2-7b') < 0);
    if (temR27 && !m2Enviado) {
      const r7 = achadas.find(r => r.assunto.indexOf('R2-7') >= 0 && r.assunto.indexOf('R2-7b') < 0);
      const citado = String(r7.texto).split(NL).slice(0, 8).map(l => '> ' + l).join(CRLF);
      const corpoM2 = ['> (resposta anterior dela)', citado.split(CRLF).join(NL), '', 'Seguindo a nossa conversa: qual é o código do portão da casa? Responda em uma linha.'].join(NL);
      let lock;
      try {
        lock = await client.getMailboxLock('INBOX');
        await client.append('INBOX', Buffer.from(montaMensagem(M2_CASO.assunto, corpoM2, null)));
        m2Enviado = true;
        enviados.push({ n: M2_CASO.n, assunto: M2_CASO.assunto, corpo: '> (citou a resposta anterior) + "qual é o código do portão?"', esperado: M2_CASO.esperado, foto: false, enviadoEm: Date.now() });
        console.log('📤 R2-7b — segunda parte do teste de MEMÓRIA (citando a resposta dela)');
      } finally { if (lock) lock.release(); }
    }
    const faltam = enviados.length - respostas.size;
    console.log('… respostas:', respostas.size, '· enviados:', enviados.length, '· faltam:', Math.max(0, faltam), '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (respostas.size >= enviados.length && m2Enviado) break;
    await sleep(25000);
  }

  // relatório
  const porCaso = [];
  for (const c of enviados) {
    const num = c.n;
    const r = [...respostas.values()].find(x => x.assunto.indexOf(num + ' —') >= 0 || x.assunto.indexOf(num + ' ') >= 0 || x.assunto.indexOf('R2-7b') >= 0 && num === 'R2-7b');
    porCaso.push({ caso: c, r: r || null });
  }
  const lat = porCaso.filter(x => x.r).map(x => (x.r.quando - x.caso.enviadoEm) / 60000);
  const L = [];
  L.push('# 🧪 Teste do chat por e-mail — RODADA 2 — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('Autoavaliação da casa: ' + enviados.length + ' e-mails enviados para ' + mascarar(USER) + ' (remetente ' + mascarar(ALIAS) + '), respostas capturadas por IMAP em INBOX/Enviados/Todos/Spam.');
  L.push('');
  L.push('- enviados: ' + enviados.length + ' · respondidos: ' + porCaso.filter(x => x.r).length);
  if (lat.length) L.push('- latência: ' + Math.min.apply(null, lat).toFixed(1) + '–' + Math.max.apply(null, lat).toFixed(1) + ' min (média ' + (lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1) + ')');
  L.push('');
  L.push('## Inventário/sonda (por que a v1 falhou)');
  inventario.forEach(x => L.push('- ' + x));
  L.push('');
  L.push('## Respostas, uma por uma');
  for (const x of porCaso) {
    L.push('### ' + x.caso.n + ' — ' + x.caso.assunto.replace(MARCA + ' ', '').replace('Re: ', '') + (x.caso.foto ? ' 📷' : ''));
    L.push('');
    L.push('**Pergunta:** ' + x.caso.corpo.split(NL).join(' ').slice(0, 240));
    L.push('');
    L.push('**Espera-se:** ' + x.caso.esperado);
    L.push('');
    if (x.r) {
      L.push('**Resposta** (' + ((x.r.quando - x.caso.enviadoEm) / 60000).toFixed(1) + ' min · capturada em ' + x.r.caixa + '):');
      L.push('');
      L.push('```');
      L.push(x.r.texto.slice(0, 1800));
      L.push('```');
    } else L.push('**SEM RESPOSTA na janela** ❌');
    L.push('');
  }
  L.push('## Todas as respostas vistas (inventário)');
  for (const r of [...respostas.values()].sort((a, b) => a.quando - b.quando)) L.push('- ' + new Date(r.quando).toISOString().slice(11, 16) + ' · ' + r.caixa + ' · ' + r.assunto.replace(MARCA + ' ', '').slice(0, 70));
  L.push('');
  L.push('---');
  L.push('_Gerado por `tools/teste-email.js` v2 (workflow `teste-email.yml`). Textos decodificados (quoted-printable → UTF-8)._');
  const rel = L.join(NL);
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-email-r2-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, rel);
  console.log(NL + rel.slice(0, 4000));
  console.log('💾 salvo em', destino);
  try { await client.logout(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
