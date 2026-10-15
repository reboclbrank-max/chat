// 🔁 TURNO 24H — fica acordado 5h45 varrendo a caixa a cada 50s; o cron do workflow o reconvoca 4x/dia
// e, para não depender do cron do GitHub (que neste repositório não disparou nenhuma vez),
// cada turno deixa o PRÓXIMO TURNO na fila — o grupo 'email-casa' garante que só um roda por vez.
// v4.1 (15/10/2026): a visão local (tools/visao-local.py) também conta como código do turno.
// v4 (15/10/2026): 🔄 TROCA DE TURNO COM CÓDIGO NOVO — a cada 10 min ele confere se o código do chat mudou no
// main desde que este turno começou; se mudou, deixa o próximo turno na fila e encerra com calma (o log é salvo).
// Antes, código novo esperava até 6 h para entrar no ar.
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

// 🔄 v4: o que conta como CÓDIGO do turno (robô de teste, relatórios e README não derrubam o turno)
const SHA_INICIO = process.env.GITHUB_SHA || '';
const CODIGO = /^tools\/(email-chat\.js|email-poll\.js|olho\.py|ocr-local\.py|transcreve\.py|visao-local\.py)$|^\.github\/workflows\/email\.yml$/;
async function codigoMudou() {
  const tok = process.env.GITHUB_TOKEN || '';
  if (!tok || !SHA_INICIO) return [];
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/compare/' + SHA_INICIO + '...main', {
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json', 'User-Agent': 'email-casa' },
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.files || []).map(f => f.filename).filter(n => CODIGO.test(n));
  } catch (e) { return []; }
}

const FIM = Date.now() + (5 * 60 + 45) * 60 * 1000; // 5h45 com varredura a cada 50s (14/10: era 75s — pega o e-mail mais cedo)
(async () => {
  let varreduras = 0, respondidos = 0, motivo = 'fim do horário';
  let proximoAviso = Date.now() + 5 * 60 * 1000;
  let proximaChecagem = Date.now() + 10 * 60 * 1000;
  while (Date.now() < FIM) {
    try { const n = await processOnce(); varreduras++; respondidos += n; if (n) console.log('📬 respondeu', n, 'email(s)'); }
    catch (e) { console.error('ciclo com erro (segue vivo):', e.message); }
    await sleep(50000);
    if (Date.now() >= proximoAviso) { await pedeVigia(); await proximoTurno(); proximoAviso = Date.now() + 40 * 60 * 1000; }
    if (Date.now() >= proximaChecagem) {
      proximaChecagem = Date.now() + 10 * 60 * 1000;
      const mudados = await codigoMudou();
      if (mudados.length) {
        console.log('🔄 código novo no main (' + mudados.join(', ') + ') — deixo o próximo turno na fila e encerro este com calma');
        await proximoTurno();
        motivo = 'código novo';
        break;
      }
    }
  }
  console.log('turno encerrado (' + motivo + '):', varreduras, 'varreduras,', respondidos, 'emails respondidos');
})();
