// 🔁 TURNO 24H — fica acordado 5h45 varrendo a caixa a cada 75s; o cron do workflow o reconvoca 4x/dia
// e, para não depender do cron do GitHub (que neste repositório não disparou nenhuma vez),
// cada turno deixa o PRÓXIMO TURNO na fila — o grupo 'email-casa' garante que só um roda por vez.
const { processOnce } = require('./email-chat.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REPO = 'reboclbrank-max/chat';
async function despacha(arquivo, rotulo) {
  const tok = process.env.GITHUB_TOKEN || '';
  if (!tok) { console.log(rotulo + ': sem token, não despachei'); return; }
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + arquivo + '/dispatches', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json', 'User-Agent': 'email-casa' },
      body: JSON.stringify({ ref: 'main' })
    });
    console.log(rotulo + ' (' + r.status + ')');
  } catch (e) { console.log(rotulo + ' falhou:', e.message); }
}
const pedeVigia = () => despacha('vigia.yml', '🛡 vigia despachado');
const proximoTurno = () => despacha('email.yml', '🔗 próximo turno na fila');
const FIM = Date.now() + (5 * 60 + 45) * 60 * 1000;
(async () => {
  let varreduras = 0, respondidos = 0;
  let proximoAviso = Date.now() + 5 * 60 * 1000;
  while (Date.now() < FIM) {
    try { const n = await processOnce(); varreduras++; respondidos += n; if (n) console.log('📬 respondeu', n, 'email(s)'); }
    catch (e) { console.error('ciclo com erro (segue vivo):', e.message); }
    await sleep(75000);
    if (Date.now() >= proximoAviso) { await pedeVigia(); await proximoTurno(); proximoAviso = Date.now() + 40 * 60 * 1000; }
  }
  console.log('turno encerrado:', varreduras, 'varreduras,', respondidos, 'emails respondidos');
})();
