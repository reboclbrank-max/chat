// 📥 COLETA FINAL do teste de e-mail (interno) — v2
// Usa o MESMO parser do chat (pegaTexto) para ler as respostas com fidelidade total.
// Varre INBOX + Enviados + Spam; espera a resposta da memória se ainda não chegou; grava o relatório.
const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { pegaTexto } = require('./email-chat.js');
const USER = process.env.GMAIL_CHAT_ADDR || '';
const PASS = process.env.GMAIL_CHAT_PASS || '';
const ARROBA = USER.indexOf('@');
const ALIAS = ARROBA > 0 ? USER.slice(0, ARROBA) + '+teste' + USER.slice(ARROBA) : 'x@y';
const ESPERA_MIN = Number(process.env.ESPERA_MIN || 6);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mascarar = a => { const s = String(a || ''); const i = s.indexOf('@'); return i < 3 ? '***' : s.slice(0, 3) + '***' + (s.indexOf('+') >= 0 ? '+alias' : '') + s.slice(i); };
const NL = String.fromCharCode(10);
const CAIXAS = ['INBOX', '[Gmail]/E-mails enviados', '[Gmail]/Spam'];

(async () => {
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  const vistas = new Map(); // messageId -> registro

  async function varre() {
    let novos = 0;
    for (const caixa of CAIXAS) {
      let lock;
      try {
        lock = await client.getMailboxLock(caixa);
        const uids = await client.search({ subject: 'TESTE-REBOCL' });
        for (const uid of (uids || [])) {
          const m = await client.fetchOne(uid, { source: true, envelope: true });
          if (!m || !m.envelope) continue;
          const de = (m.envelope.from || [{}])[0].address || '';
          if (de.toLowerCase().indexOf(ALIAS.toLowerCase()) >= 0) continue;
          const id = m.envelope.messageId || (caixa + '|' + uid);
          const assunto = String(m.envelope.subject || '');
          if (assunto.indexOf('TESTE-REBOCL') < 0) continue;
          const texto = pegaTexto((m.source || '').toString(), assunto);
          const quando = m.envelope.date ? new Date(m.envelope.date).getTime() : 0;
          const antigo = vistas.get(id);
          if (!antigo || texto.length > antigo.texto.length || (caixa === 'INBOX' && antigo.caixa !== 'INBOX')) {
            vistas.set(id, { assunto, texto, caixa, quando, de: mascarar(de) });
            if (!antigo) novos++;
          }
        }
      } catch (e) { console.log('caixa', caixa, 'erro:', e.message.slice(0, 70)); }
      finally { if (lock) lock.release(); }
    }
    return novos;
  }

  console.log('=== 1) primeira varredura ===');
  await varre();
  console.log('respostas vistas:', vistas.size);

  // espera a resposta da memória (R2-7b) se ainda não estiver entre elas
  const t0 = Date.now();
  const limite = t0 + ESPERA_MIN * 60 * 1000;
  const temMemoria = () => [...vistas.values()].some(v => /R2-7b/i.test(v.assunto) || (/R2-7/i.test(v.assunto) && /(7-4-2)/.test(v.texto) && /port[ãa]o/i.test(v.texto)));
  while (!temMemoria() && Date.now() < limite) {
    console.log('… aguardando a resposta da memória · min restantes:', Math.round((limite - Date.now()) / 60000));
    await sleep(25000);
    await varre();
  }

  console.log(NL + '=== 2) inventário completo ===');
  const lista = [...vistas.values()].sort((a, b) => a.quando - b.quando);
  for (const v of lista) console.log('·', new Date(v.quando).toISOString().slice(11, 16), '·', v.caixa, '·', v.assunto.replace('[TESTE-REBOCL] ', '').slice(0, 70), '·', v.texto.length, 'chars');

  const L = [];
  L.push('# 📥 Coleta final — respostas do chat por e-mail — ' + new Date().toISOString().slice(0, 16) + ' UTC');
  L.push('');
  L.push('Todas as respostas do chat ao teste da casa, lidas com o MESMO parser do canal (`pegaTexto`), de INBOX/Enviados/Spam. Endereços mascarados; conteúdo = só as mensagens de teste.');
  L.push('');
  L.push('- respostas encontradas: ' + lista.length);
  L.push('');
  for (const v of lista) {
    L.push('## ' + v.assunto.replace('[TESTE-REBOCL] ', '').replace('Re: ', '') + ' · ' + new Date(v.quando).toISOString().slice(11, 16) + ' UTC · ' + v.caixa);
    L.push('');
    L.push('```');
    L.push(v.texto.slice(0, 3000) || '(vazio)');
    L.push('```');
    L.push('');
  }
  L.push('---');
  L.push('_Gerado por `tools/coleta-respostas.js` v2 (workflow `coleta-email.yml`)._');
  const ts = new Date().toISOString().slice(0, 16).split(':').join('').split('T').join('-');
  const destino = path.join(__dirname, '..', 'provas', 'teste-email-final-' + ts + '.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, L.join(NL));
  console.log(NL + '💾 salvo em', destino);
  try { await client.logout(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
