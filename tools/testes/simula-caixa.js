// 🧪 SIMULADOR DE CAIXA (15/10/2026) — testa o processOnce SEM tocar no Gmail: IMAP, SMTP e motor de IA falsos.
// Uso: node simula-caixa.js /caminho/email-chat.js
// Cenário: 7 e-mails não lidos com UIDs ESPARSOS (como numa caixa que já teve coisa arquivada) e números de
// sequência diferentes; o UID 205 é "problemático" (a leitura falha sempre).
const path = require('path');
const Module = require('module');
const alvoChat = path.resolve(process.argv[2]);
const chamadas = [], enviados = [], todosEnviados = [];   // todosEnviados = pasta de enviados (a auditoria olha)
// v12.14: e-mail com foto(s) — várias (SIMULA_FOTOS=a,b,c), tipo pelo nome (HEIC também), formato do Gmail
// (SIMULA_FORMATO=gmail: texto dentro de multipart/alternative, fronteiras em hexadecimal minúsculo como as reais)
function montaFotoSim(m, ent) {
  const fs = require('fs'), path = require('path');
  const arquivos = (process.env.SIMULA_FOTOS ? process.env.SIMULA_FOTOS.split(',') : [process.env.SIMULA_FOTO || '']).filter(Boolean);
  const tipo = a => /\.jpe?g$/i.test(a) ? 'image/jpeg' : (/\.hei[cf]$/i.test(a) ? 'image/heic' : 'image/png');
  const pergunta = process.env.SIMULA_PERGUNTA || 'O que tem nesta imagem? Liste formas, cores e o texto.';
  const A = '000000000000a1b2c3d4e5f60718', B = '000000000000f9e8d7c6b5a40312';
  const cab = 'From: dono@exemplo.com\r\nTo: casa@exemplo.com\r\nSubject: ' + m.assunto + '\r\nMessage-ID: <m' + ent[0] + '@x>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="' + A + '"\r\n\r\n';
  const texto = process.env.SIMULA_FORMATO === 'gmail'
    ? '--' + A + '\r\nContent-Type: multipart/alternative; boundary="' + B + '"\r\n\r\n--' + B + '\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n' + pergunta + '\r\n\r\n--' + B + '\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n<div dir="ltr">' + pergunta + '</div>\r\n\r\n--' + B + '--\r\n'
    : '--' + A + '\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n' + pergunta + '\r\n';
  const fotos = arquivos.map(a => '--' + A + '\r\nContent-Type: ' + tipo(a) + '; name="' + path.basename(a) + '"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="' + path.basename(a) + '"\r\n\r\n' + fs.readFileSync(a).toString('base64').match(/.{1,76}/g).join('\r\n') + '\r\n').join('');
  const pdf = process.env.SIMULA_PDF ? '--' + A + '\r\nContent-Type: application/pdf; name="anexo-prova.pdf"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="anexo-prova.pdf"\r\n\r\n' + fs.readFileSync(process.env.SIMULA_PDF).toString('base64').match(/.{1,76}/g).join('\r\n') + '\r\n' : '';
  return cab + texto + fotos + pdf + '--' + A + '--\r\n';
}
// v12.14: conversa guardada no "Todos os e-mails" (memória pela thread do Gmail)
const CONVERSA = { 9001: { de: 'dono@exemplo.com', assunto: 'palavra-chave da horta', texto: 'Guarde esta palavra-chave: JATOBÁ. Depois eu pergunto.', quando: Date.now() - 50 * 60 * 1000 },
                   9002: { de: 'casa@exemplo.com', assunto: 'Re: palavra-chave da horta', texto: 'Combinado! Guardei a palavra-chave.', quando: Date.now() - 49 * 60 * 1000 } };
const caixa = new Map();   // uid -> { seq, assunto, problema }
const UIDS = [101, 140, 205, 207, 300, 301, 450];
UIDS.forEach((u, i) => caixa.set(u, { seq: i + 1, assunto: 'Pergunta ' + (i + 1), problema: u === 205, lido: false }));
if (process.env.SIMULA_CONVERSA) caixa.set(800, { seq: 22, assunto: 'Re: palavra-chave da horta', problema: false, lido: false, thread: 'T800', corpo: '[SEM-MEMORIA] Sem citar nada: qual era a palavra-chave que eu combinei com você?' });
if (process.env.SIMULA_PERDIDO) caixa.set(600, { seq: 20, assunto: 'Pergunta perdida (chegou como lida)', problema: false, lido: true, quando: Date.now() - 30 * 60 * 1000 });
if (process.env.SIMULA_AUTOMATICO) caixa.set(700, { seq: 21, assunto: 'Aviso automatico de entrega', problema: false, lido: false, cab: 'Auto-Submitted: auto-generated' });
if (process.env.SIMULA_FOTO) caixa.set(500, { seq: 8, assunto: process.env.SIMULA_FOTO_ASSUNTO || '[TESTE-REBOCL] R3-15 visao local [VISAO-LOCAL]', problema: false, lido: false, foto: require('fs').readFileSync(process.env.SIMULA_FOTO).toString('base64') });
class ImapFalso {
  async connect() {}
  async getMailboxLock(pasta) { this.atual = pasta || 'INBOX'; return { release() {} }; }
  async list() { return [{ path: 'INBOX' }, { path: '[Gmail]/E-mails enviados', specialUse: '\\Sent' }, { path: '[Gmail]/Todos os e-mails', specialUse: '\\All' }]; }
  async *fetch(uids, q, o) {   // leitura em lote (a auditoria usa)
    for (const u of uids) {
      if (this.atual === '[Gmail]/Todos os e-mails') { const c = CONVERSA[u]; const m0 = caixa.get(u); if (c) yield { uid: u, envelope: { from: [{ address: c.de }], subject: c.assunto, messageId: '<c' + u + '@x>', date: new Date(c.quando) }, internalDate: new Date(c.quando), source: Buffer.from('From: ' + c.de + '\r\nSubject: ' + c.assunto + '\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n' + c.texto + '\r\n') }; else if (m0) yield { uid: u, envelope: { from: [{ address: 'dono@exemplo.com' }], subject: m0.assunto, messageId: '<m' + u + '@x>', date: new Date() }, internalDate: new Date(), source: Buffer.from('Subject: x\r\n\r\n' + (m0.corpo || '')) }; continue; }
      if (this.atual !== 'INBOX') { const e = todosEnviados[u - 1]; if (e) yield { uid: u, envelope: { inReplyTo: e.inReplyTo, subject: e.subject } }; continue; }
      const m = caixa.get(u); if (!m) continue;
      yield { uid: u, envelope: { from: [{ address: 'dono@exemplo.com' }], subject: m.assunto, messageId: '<m' + u + '@x>', date: new Date(m.quando || Date.now() - 20 * 60 * 1000) },
              labels: new Set(m.etiquetas || []), internalDate: new Date(m.quando || Date.now() - 20 * 60 * 1000), headers: Buffer.from(m.cab ? m.cab + '\r\n' : '') };
    }
  }
  async messageFlagsRemove(id, flags, o) { chamadas.push(['desmarca', id]); const m = caixa.get(id); if (m) m.lido = false; }
  async search(q, o) {
    chamadas.push(['search', JSON.stringify(o || {})]);
    if (this.atual === '[Gmail]/Todos os e-mails') return (q && q.threadId === 'T800') ? [9001, 9002, 800] : [];
    if (this.atual && this.atual !== 'INBOX') return todosEnviados.map((e, i) => i + 1);
    if (q && q.seen === true) return [...caixa.entries()].filter(([u, m]) => m.lido).map(([u]) => u);
    const lista = [...caixa.entries()].filter(([u, m]) => !m.lido);
    return (o && o.uid) ? lista.map(([u]) => u) : lista.map(([u, m]) => m.seq);   // sem {uid:true} devolve SEQUÊNCIA
  }
  async fetchOne(id, q, o) {
    chamadas.push(['fetchOne', id, JSON.stringify(o || {})]);
    const ent = (o && o.uid) ? [id, caixa.get(id)] : [...caixa.entries()].find(([u, m]) => m.seq === id);
    if (!ent || !ent[1]) return null;
    const m = ent[1];
    if (m.problema) throw new Error('anexo corrompido (simulado)');
    const src = 'From: dono@exemplo.com\r\nTo: casa@exemplo.com\r\n' + (m.cab ? m.cab + '\r\n' : '') + 'Subject: ' + m.assunto + '\r\nMessage-ID: <m' + ent[0] + '@x>\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nOi, ' + m.assunto + ': quanto é 2+2?\r\n';
    const srcFoto = m.foto ? montaFotoSim(m, ent) : null;
    return { envelope: { from: [{ address: m.de || 'dono@exemplo.com' }], subject: m.assunto, messageId: '<m' + ent[0] + '@x>' }, threadId: m.thread, source: Buffer.from(srcFoto || (m.corpo ? src.replace(/\r\n\r\nOi, [\s\S]*$/, '\r\n\r\n' + m.corpo + '\r\n') : src)) };
  }
  async messageFlagsAdd(id, flags, o) {
    chamadas.push(['marca', id, JSON.stringify(o || {})]);
    const m = (o && o.uid) ? caixa.get(id) : [...caixa.values()].find(x => x.seq === id);
    if (m && o && o.useLabels) { (m.etiquetas = m.etiquetas || []).push(...flags); return; }   // etiqueta do Gmail
    if (m) m.lido = true;
  }
  async logout() {}
}
const carregaOriginal = Module._load;
Module._load = function (pedido) {
  if (pedido === 'imapflow') return { ImapFlow: ImapFalso };
  if (pedido === 'nodemailer') return { createTransport: () => ({ sendMail: async o => { enviados.push(o); todosEnviados.push(o); } }) };
  return carregaOriginal.apply(this, arguments);
};
global.fetch = async (url, op) => {
  const corpo = String((op && op.body) || '');
  const temImagem = corpo.indexOf('image_url') >= 0;
  if (temImagem) { const i = corpo.indexOf('base64,'); const f = corpo.indexOf('"', i); if (i > 0) console.log('🛰️ motor da internet recebeu foto de ~' + Math.round((f - i - 7) * 3 / 4 / 1024) + ' KB'); }
  if (!temImagem && process.env.SIMULA_TEXTO_FORA) { await new Promise(r => setTimeout(r, 200)); return { ok: false, status: 503, json: async () => ({}) }; }   // v12.15: motores de texto fora
  if (temImagem && process.env.SIMULA_PERGUNTA) console.log('🛰️ a pergunta do corpo chegou ao motor de visão: ' + (corpo.indexOf(process.env.SIMULA_PERGUNTA.slice(0, 30)) >= 0 ? 'SIM' : 'NÃO'));
  if (temImagem && process.env.SIMULA_VISAO_FORA) { await new Promise(r => setTimeout(r, 300)); return { ok: false, status: 502, json: async () => ({}) }; }
  if (!temImagem && corpo.indexOf('JATOB') >= 0 && corpo.indexOf('palavra-chave') >= 0) return { ok: true, status: 200, json: async () => ({ model: 'motor-falso', choices: [{ message: { content: 'A palavra-chave que você combinou comigo é **JATOBÁ**.' } }] }) };
  const semVisao = corpo.indexOf('NÃO conseguiu ver a') >= 0;
  const comArquivo = corpo.indexOf('12 pes de couve') >= 0;
  const texto = temImagem ? ((corpo.indexOf('numeradas de 1 a') >= 0 ? 'Foto 1: formas coloridas. Foto 2: um bilhete. Foto 3: uma horta. — ' : '') + 'Na foto vejo um quadrado azul, um círculo vermelho e um triângulo verde; o texto diz CASA REBOCL 14/10/2026.') : (semVisao ? ('[sem visão] ' + (comArquivo ? 'O arquivo diz que a horta tem 12 pés de couve. ' : '') + 'A foto não pôde ser vista em detalhe agora.') : (comArquivo ? '[visão local + arquivo] O PDF diz 12 pés de couve; a visão local descreveu a foto.' : 'Dois mais dois são quatro — resposta completa de teste da casa.'));
  return { ok: true, status: 200, json: async () => ({ model: temImagem ? 'visao-falsa' : 'motor-falso', choices: [{ message: { content: texto } }] }) };
};
if (process.env.SIMULA_MARCADOR) { process.env.FERRAMENTAS_MARCADOR = process.env.SIMULA_MARCADOR; try { require('fs').unlinkSync(process.env.SIMULA_MARCADOR); } catch (e) {} setTimeout(() => require('fs').writeFileSync(process.env.SIMULA_MARCADOR, 'ok'), Number(process.env.SIMULA_MARCADOR_SEG || 3) * 1000); }
process.env.GMAIL_CHAT_ADDR = 'casa@exemplo.com';
process.env.GMAIL_CHAT_PASS = 'x';
// pasta de trabalho com tools/ ao lado (como na raiz do repositório no turno)
const pastaSim = path.join(require('os').tmpdir(), 'sim-caixa');
require('fs').mkdirSync(pastaSim, { recursive: true });
try { require('fs').symlinkSync(path.dirname(alvoChat), path.join(pastaSim, 'tools')); } catch (e) {}
process.chdir(pastaSim);
const chat = require(alvoChat);
(async () => {
  for (let ciclo = 1; ciclo <= 3; ciclo++) {
    let n; const t0c = Date.now();
    try { n = await chat.processOnce(); } catch (e) { n = 'ERRO (' + e.message + ')'; }
    const durc = ((Date.now() - t0c) / 1000).toFixed(1);
    const lote = enviados.splice(0);
    for (const o of lote) if (!/^Re: Pergunta /.test(o.subject)) console.log('📷 resposta da foto:', String(o.text).slice(0, 600).replace(/\n/g, ' / '));
    const ordem = lote.map(o => o.subject.replace('Re: Pergunta ', '#').replace(/^Re: (?!#).*$/, 'FOTO'));
    console.log('ciclo ' + ciclo + ' (' + durc + ' s): respondeu ' + n + ' → ' + (ordem.join(' ') || '(nada)') + (lote.length ? ' · com HTML: ' + lote.filter(o => o.html && /<div/.test(o.html)).length + '/' + lote.length : ''));
  }
  const usouSeq = chamadas.filter(c => (c[0] === 'search' || c[0] === 'fetchOne') && !/uid/.test(c[c.length - 1])).length;
  const naoLidos = [...caixa.entries()].filter(([u, m]) => !m.lido).map(([u]) => u);
  console.log('chamadas sem {uid:true} em busca/leitura:', usouSeq);
  console.log('ainda não lidos:', JSON.stringify(naoLidos), '· falhas registradas:', JSON.stringify([...(chat.falhasPorUid || new Map()).entries()]));
  await new Promise(r => setTimeout(r, 1500));
  const resto = String(require('child_process').spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' }).stdout).split('\n').filter(l => /llama-mtmd-cli$/.test(l.trim().split(' ')[0])).length;
  console.log('processos de visão local ainda rodando:', resto || '0');
  process.exit(0);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
