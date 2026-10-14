// 🔁 TURNO 24H — fica acordado 5h45 varrendo a caixa a cada 75s; o cron do workflow o reconvoca 4x/dia
const { processOnce } = require('./email-chat.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 🛡 vigia: despacha o vigia da casa a cada 40 min (o cron do GitHub não é confiável para workflow novo)
async function pedeVigia() {
  const tok = process.env.GITHUB_TOKEN || '';
  if (!tok) return;
  try {
    const r = await fetch('https://api.github.com/repos/reboclbrank-max/chat/actions/workflows/vigia.yml/dispatches', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'email-casa' }, body: JSON.stringify({ ref: 'main' }) });
    console.log('🛡 vigia despachado (' + r.status + ')');
  } catch (e) { console.log('vigia dispatch falhou:', e.message); }
}
const FIM = Date.now() + (5 * 60 + 45) * 60 * 1000;
(async () => {
  let varreduras = 0, respondidos = 0;
  let proximoVigia = Date.now() + 5 * 60 * 1000;
  while (Date.now() < FIM) {
    try { const n = await processOnce(); varreduras++; respondidos += n; if (n) console.log('📬 respondeu', n, 'email(s)'); }
    catch (e) { console.error('ciclo com erro (segue vivo):', e.message); }
    await sleep(75000);
    if (Date.now() >= proximoVigia) { await pedeVigia(); proximoVigia = Date.now() + 40 * 60 * 1000; }
  }
  console.log('turno encerrado:', varreduras, 'varreduras,', respondidos, 'emails respondidos');
})();
