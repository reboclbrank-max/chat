// 🧪 chat no Telegram (sem Telegram de verdade): pareamento, dono, desconhecido, grupo, formatação e divisão
const path = require('path');
const { criaTelegram, paraTelegramHtml, pedacos } = require(path.join(path.dirname(path.resolve(process.argv[2])), 'telegram-chat.js'));
const enviados = [];
let dono = null;
const chatFalso = {
  semMarcacao: s => String(s).replace(/\*\*/g, ''), limpaVazamento: s => s, CAPS: ' ',
  comandosDaCasa: async t => /^lembrete:/i.test(t) ? 'Combinado! Vou te lembrar.' : null, ferramenta: async () => null, pedidoDeArquivo: () => null,
  cerebro: async (p, img) => ({ texto: img ? 'Na foto vejo um **quadrado azul**.' : 'A resposta é **4**.', via: 'motor-falso' }), cerebroLocal: async () => null,
  preparaFoto: async i => i, visaoLocal: async () => null, ouve: async () => 'quanto é dois mais dois', docTexto: async () => 'texto do documento'
};
const tg = criaTelegram({ chat: chatFalso, token: 'falso', codigo: '123456', log: () => {},
  api: async (metodo, corpo) => { if (metodo === 'sendMessage') enviados.push(corpo); return {}; },
  baixa: async () => ({ buf: Buffer.from('arquivo-falso') }), lerDono: async () => dono, gravarDono: async id => { dono = id; },
  enviaDoc: async (id, nome) => { enviados.push({ doc: nome }); } });
const msg = (id, extra, tipo) => ({ update_id: Math.floor(Math.random() * 1e9), message: Object.assign({ message_id: 1, chat: { id, type: tipo || 'private' }, from: { id } }, extra) });
let ok = 0, total = 0;
function confere(nome, cond) { total++; if (cond) ok++; console.log((cond ? '✔ ' : '✘ ') + nome); }
(async () => {
  let r = await tg.trataAtualizacao(msg(555, { text: 'oi' }));
  confere('desconhecido recebe só o aviso (canal + Discord)', r === 'desconhecido' && /discord\.gg/.test(enviados.pop().text));
  r = await tg.trataAtualizacao(msg(555, { text: 'oi de novo' }));
  confere('desconhecido é avisado uma vez só', r === 'desconhecido' && enviados.length === 0);
  r = await tg.trataAtualizacao(msg(555, { text: '/parear 000000' }));
  confere('código errado não pareia', r === 'código errado' && dono === null && /não confere/.test(enviados.pop().text));
  r = await tg.trataAtualizacao(msg(555, { text: '/parear 123456' }));
  confere('código certo pareia e guarda o dono', r === 'pareado' && dono === 555 && /Pronto!/.test(enviados.pop().text));
  r = await tg.trataAtualizacao(msg(555, { text: 'quanto é 2+2?' }));
  const e1 = enviados.pop();
  confere('dono recebe resposta formatada (HTML do Telegram)', r === 'respondido' && e1.parse_mode === 'HTML' && /<b>4<\/b>/.test(e1.text));
  r = await tg.trataAtualizacao(msg(555, { photo: [{ file_id: 'p1' }, { file_id: 'p2' }], caption: 'o que tem aqui?' }));
  confere('foto do dono passa pela visão', r === 'respondido' && /quadrado azul/.test(enviados.pop().text));
  r = await tg.trataAtualizacao(msg(555, { voice: { file_id: 'v1', mime_type: 'audio/ogg' } }));
  confere('nota de voz do dono é transcrita e respondida', r === 'respondido' && /<b>4<\/b>/.test(enviados.pop().text));
  r = await tg.trataAtualizacao(msg(555, { text: 'lembrete: amanhã às 7h regar a horta' }));
  confere('lembrete pelo Telegram vai para os comandos da casa', r === 'respondido' && /Vou te lembrar/.test(enviados.pop().text));
  r = await tg.trataAtualizacao(msg(777, { text: '/parear 123456' }));
  confere('outra pessoa não consegue parear depois do dono', r === 'pareamento recusado (já tem dono)');
  enviados.length = 0;
  r = await tg.trataAtualizacao(msg(-100123, { text: 'mensagem num grupo' }, 'group'));
  confere('grupos e canais são ignorados', r === 'ignorado' && enviados.length === 0);
  confere('formatação: negrito, código, lista, bloco e escape', paraTelegramHtml('**a** e `b`\n- item\n```\ncode <x>\n```') === '<b>a</b> e <code>b</code>\n• item\n<pre>code &lt;x&gt;</pre>');
  const p = pedacos('x'.repeat(5000) + '\n\n' + 'y'.repeat(3000), 3800);
  confere('mensagem longa é dividida (≤ 3800 por parte)', p.length >= 2 && p.every(s => s.length <= 3800));
  console.log(ok + '/' + total + ' certos');
  if (ok !== total) process.exitCode = 1;
})();
