// 🔁 TURNO 24H — fica acordado 5h45 varrendo a caixa a cada 75s; o cron do workflow o reconvoca 4x/dia
const { processOnce } = require('./email-chat.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FIM = Date.now() + (5 * 60 + 45) * 60 * 1000;
(async () => {
  let varreduras = 0, respondidos = 0;
  while (Date.now() < FIM) {
    try { const n = await processOnce(); varreduras++; respondidos += n; if (n) console.log('📬 respondeu', n, 'email(s)'); }
    catch (e) { console.error('ciclo com erro (segue vivo):', e.message); }
    await sleep(75000);
  }
  console.log('turno encerrado:', varreduras, 'varreduras,', respondidos, 'emails respondidos');
})();
