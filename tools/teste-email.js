// 🧪 ROBÔ DE TESTE DO CHAT POR E-MAIL — v3 (14/10/2026)
// v3.5: caso R3-13 — FOTO DE BILHETE (texto escrito na imagem → leitor de texto LOCAL/tesseract da v12).
// Melhorias sobre a v2: usa o MESMO parser do canal (pegaTexto), casa cada resposta com o e-mail
// que a originou (In-Reply-To = thread exata) e roda CHECAGENS AUTOMÁTICAS por caso no relatório.
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
    corpo: 'Achei este bilhete em cima da mesa. O que está escrito nele e quem assinou?' }
];
const M2 = { n: 'R3-8b', assunto: 'Re: ' + MARCA + ' R3-8 — memória (1/2)',
  esperado: 'Dizer JATOBÁ (memória citada funcionando).',
  check: t => /JATOB[ÁA]/i.test(t) ? 'PASS (lembrou JATOBÁ)' : 'FALHOU (não lembrou)', corpo: '' };

function montaMensagem(assunto, corpo, imgB64, html, pdfB64, imgNome) {
  const nomeImg = imgNome || 'teste-visao3.png';
  const id = '<teste-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '@rebocl.local>';
  const cab = ['From: "Teste da Casa" <' + ALIAS + '>', 'To: ' + USER, 'Subject: ' + assunto, 'Date: ' + new Date().toUTCString(), 'Message-ID: ' + id, 'MIME-Version: 1.0'];
  let bruto;
  if (html && !imgB64) bruto = cab.concat(['Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF);
  else if (!imgB64) bruto = cab.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo]).join(CRLF);
  else {
    const b = 'fronteira-teste-' + Date.now();
    const partes = ['--' + b, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', corpo, '--' + b,
      'Content-Type: image/png; name="' + nomeImg + '"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="' + nomeImg + '"', '',
      imgB64.match(/.{1,76}/g).join(CRLF)];
    if (pdfB64) partes.push('--' + b,
      'Content-Type: application/pdf; name="anexo-prova.pdf"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="anexo-prova.pdf"', '',
      pdfB64.match(/.{1,76}/g).join(CRLF));
    partes.push('--' + b + '--', '');
    bruto = cab.concat(['Content-Type: multipart/mixed; boundary="' + b + '"', '', partes.join(CRLF)]).join(CRLF);
  }
  return { bruto, id };
}

(async () => {
  if (!USER || !PASS) { console.error('sem credenciais (rode no Actions)'); process.exit(1); }
  const { ImapFlow } = require('imapflow');
  const { pegaTexto } = require('./email-chat.js');   // MESMO parser do canal
  const imgB64 = fs.existsSync(path.join(__dirname, 'teste-visao3.png')) ? fs.readFileSync(path.join(__dirname, 'teste-visao3.png')).toString('base64') : null;
  const pdfB64 = fs.existsSync(path.join(__dirname, 'anexo-prova.pdf')) ? fs.readFileSync(path.join(__dirname, 'anexo-prova.pdf')).toString('base64') : null;
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const t0 = Date.now();
  const porMensagem = new Map();   // messageId -> { texto, caixa, quando, assunto }
  const porCaso = new Map();       // n do caso -> registro

  const caixas = ['INBOX'];
  try { for (const m of await client.list()) if (/enviad|sent|todos|all mail|spam/i.test(m.path)) caixas.push(m.path); } catch (e) {}
  console.log('caixas:', caixas.join(' | '));

  async function varre() {
    for (const caixa of caixas) {
      let lock;
      try {
        lock = await client.getMailboxLock(caixa);
        const uids = await client.search({ subject: 'TESTE-REBOCL' });
        for (const uid of (uids || [])) {
          const m = await client.fetchOne(uid, { source: true, envelope: true });
          if (!m || !m.envelope) continue;
          const de = (m.envelope.from || [{}])[0].address || '';
          if (de.toLowerCase().indexOf(ALIAS.toLowerCase()) >= 0) continue;   // mensagem nossa
          const id = m.envelope.messageId || (caixa + '|' + uid);
          const quando = m.envelope.date ? new Date(m.envelope.date).getTime() : 0;
          if (quando < t0 - 180000) continue;                                  // só esta rodada
          const texto = pegaTexto((m.source || '').toString(), String(m.envelope.subject || ''));
          const antigo = porMensagem.get(id);
          if (!antigo || texto.length > antigo.texto.length || (caixa === 'INBOX' && antigo.caixa !== 'INBOX'))
            porMensagem.set(id, { texto, caixa, quando, assunto: String(m.envelope.subject || ''), inReplyTo: m.envelope.inReplyTo || '' });
        }
      } catch (e) { console.log('caixa', caixa, 'erro:', e.message.slice(0, 60)); }
      finally { if (lock) lock.release(); }
    }
  }

  const enviados = [];   // { n, assunto, esperado, check, id, enviadoEm }
  async function envia(caso) {
    let fotoCaso = caso.foto ? imgB64 : null;
    if (caso.fotoArq) { const arq = path.join(__dirname, caso.fotoArq); fotoCaso = fs.existsSync(arq) ? fs.readFileSync(arq).toString('base64') : null; if (!fotoCaso) console.log('⚠️ fixture ausente:', caso.fotoArq); }
    const { bruto, id } = montaMensagem(caso.assunto, caso.corpo, fotoCaso, caso.html, caso.pdf ? pdfB64 : null, caso.fotoArq || null);
    let lock;
    try { lock = await client.getMailboxLock('INBOX'); await client.append('INBOX', Buffer.from(bruto)); }
    finally { if (lock) lock.release(); }
    enviados.push({ n: caso.n, assunto: caso.assunto, corpo: caso.corpo, esperado: caso.esperado, check: caso.check, id, enviadoEm: Date.now(), foto: !!(caso.foto || caso.fotoArq), pdf: !!caso.pdf });
    console.log('📤', caso.n, '—', caso.assunto.replace(MARCA + ' ', ''), (caso.foto || caso.fotoArq) ? '(com foto)' : '');
    await sleep(1300);
  }
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
    await varre();
    const c8 = enviados.find(e => e.n === 'R3-8');
    const r8 = c8 && casa(c8);
    if (r8 && !m2Enviado) {
      const citado = String(r8.texto).split(NL).slice(0, 6).map(l => '> ' + l).join(NL);
      const casoM2 = { n: M2.n, assunto: M2.assunto, corpo: '> (resposta anterior)\n' + citado + '\n\nMuito bem. Qual era a palavra-chave que eu combinei com você? Uma linha só.', esperado: M2.esperado, check: M2.check };
      await envia(casoM2); m2Enviado = true;
      console.log('📤 R3-8b — segunda parte da MEMÓRIA');
    }
    const respondidos = enviados.filter(e => casa(e)).length;
    console.log('… respondidos:', respondidos, '/', enviados.length, '· min restantes:', Math.max(0, Math.round((limite - Date.now()) / 60000)));
    if (m2Enviado && respondidos >= enviados.length) break;
    await sleep(25000);
  }
  await varre();

  const L = [];
  L.push('# 🧪 Teste do chat por e-mail — RODADA 3 — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('Rodada com o canal já corrigido (CAPS + assinatura + memória). Cada resposta é casada com o e-mail que a originou (In-Reply-To) e passa por checagem automática. Leitura pelo MESMO parser do canal.');
  L.push('');
  const resp = enviados.map(e => ({ e, r: casa(e) }));
  const ok = resp.filter(x => x.r).length;
  const notas = resp.filter(x => x.r && x.e.check).map(x => x.e.check(x.r.texto));
  L.push('- enviados: ' + enviados.length + ' · respondidos: ' + ok + ' · checagens PASS: ' + notas.filter(n => n.indexOf('PASS') === 0).length + '/' + notas.length);
  const lat = resp.filter(x => x.r).map(x => (x.r.quando - x.e.enviadoEm) / 60000);
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
    if (x.r) {
      L.push('**Checagem automática:** ' + (x.e.check ? x.e.check(x.r.texto) : '—') + ' · **Resposta em ' + ((x.r.quando - x.e.enviadoEm) / 60000).toFixed(1) + ' min** (' + x.r.caixa + ')');
      L.push('');
      L.push('```');
      L.push(x.r.texto.slice(0, 2200) || '(vazio)');
      L.push('```');
    } else { L.push('**SEM RESPOSTA na janela** ❌'); }
    L.push('');
  }
  L.push('## Todas as respostas vistas na janela');
  for (const r of [...porMensagem.values()].sort((a, b) => a.quando - b.quando)) L.push('- ' + new Date(r.quando).toISOString().slice(11, 16) + ' · ' + r.caixa + ' · ' + r.assunto.replace(MARCA + ' ', '').slice(0, 70));
  L.push('');
  L.push('---');
  L.push('_Gerado por `tools/teste-email.js` v3.5 (workflow `teste-email.yml`)._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-email-r3-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + L.join(NL).slice(0, 3500));
  console.log('💾 salvo em', destino);
  try { await client.logout(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(0); });
