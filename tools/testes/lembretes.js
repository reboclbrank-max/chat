// 🧪 lembretes: o chat entende QUANDO (horário de Brasília) e O QUÊ — "agora" fixo: quinta, 15/10/2026, 21:00
const s = require('fs').readFileSync(process.argv[2], 'utf8');
eval(s.slice(s.indexOf('function entendeQuando'), s.indexOf('// ⏰ v12.16: LEMBRETES guardados')));
const AGORA = new Date(Date.UTC(2026, 9, 16, 0, 0));
const br = d => { const x = new Date(d.getTime() - 3 * 3600e3).toISOString(); return x.slice(8, 10) + '/' + x.slice(5, 7) + ' ' + x.slice(11, 16); };
const casos = [
  ['lembrete: amanhã às 7h regar a horta', '16/10 07:00', 'regar a horta'],
  ['me lembra daqui a 2 horas de ligar pro pedreiro', '15/10 23:00', 'ligar pro pedreiro'],
  ['lembrete: em 30 minutos tirar o bolo do forno', '15/10 21:30', 'tirar o bolo do forno'],
  ['me lembre sexta às 10 da manhã de pagar a conta de luz', '16/10 10:00', 'pagar a conta de luz'],
  ['lembrete: dia 20 às 9h30 consulta no dentista', '20/10 09:30', 'consulta no dentista'],
  ['lembrete: dia 2/11 às 14h finados — visitar a família', '02/11 14:00', 'finados — visitar a família'],
  ['lembrete: às 7 da noite fechar o portão', '16/10 19:00', 'fechar o portão'],
  ['lembrete: hoje às 22:15 desligar a bomba', '15/10 22:15', 'desligar a bomba'],
  ['lembrete: depois de amanhã comprar cimento', '17/10 08:00', 'comprar cimento'],
  ['lembrete: ao meio-dia almoço com a Dona Marta', '16/10 12:00', 'almoço com a Dona Marta'],
  ['lembrete: daqui a meia hora ver o feijão', '15/10 21:30', 'ver o feijão'],
  ['lembrete: comprar 20 tijolos', null, null],
  ['lembrete: hoje às 18h (já passou)', null, null],
];
let ok = 0;
for (const [frase, quando, resto] of casos) {
  const r = entendeQuando(frase, AGORA);
  const certo = (r ? br(r.quando) : null) === quando && (!r || r.resto === resto);
  if (certo) ok++; else console.log('✘ ' + frase + ' → ' + (r ? br(r.quando) + ' "' + r.resto + '"' : 'não entendi'));
}
console.log(ok + '/' + casos.length + ' certos');
if (ok !== casos.length) process.exitCode = 1;
