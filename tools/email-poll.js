// 🔁 TURNO 24H — fica acordado 5h45 varrendo a caixa a cada 50s; o cron do workflow o reconvoca 4x/dia
// e, para não depender do cron do GitHub (que neste repositório não disparou nenhuma vez),
// cada turno deixa o PRÓXIMO TURNO na fila — o grupo 'email-casa' garante que só um roda por vez.
// v4.4 (16/10/2026): 📲 CHAT NO TELEGRAM — liga o tools/telegram-chat.js junto com o e-mail (mesmo turno).
// v4.7 (19/10/2026): 🧵 um sucessor manual já pendente é preservado nos pulsos de 40 min;
// só troca de código aprovada o substitui, reduzindo cancelamentos sem quebrar a corrente.
// v4.6 (19/10/2026): 🧯 três falhas totais consecutivas de ciclo encerram o turno com erro visível;
// uma oscilação isolada ainda segue viva e um ciclo saudável zera o contador. Não há re-dispatch cego.
// v4.5 (16/10/2026): 🛡️ TURNO À PROVA DE QUEDA — rejeição ou exceção inesperada (e-mail, Telegram ou biblioteca)
// é registrada no log e o turno SEGUE VIVO; antes, uma rejeição sem catch derrubava o processo inteiro.
// v4.3 (16/10/2026): ⚡ AVISO IMEDIATO DO GMAIL (IMAP IDLE) — uma conexão escuta a caixa e acorda o ciclo assim que
// chega e-mail (antes, até 50 s de espera); rajada segue sem pausa; 🚦 BARREIRA DE TESTES — código novo só entra no ar
// se os "testes rápidos" do commit passaram (reprovado = fica a versão atual; sem resultado em 30 min = troca assim mesmo).
// v4.2 (15/10/2026): o preparo de foto (tools/prepara-foto.py) também conta como código do turno.
// v4.1 (15/10/2026): a visão local (tools/visao-local.py) também conta como código do turno.
// v4 (15/10/2026): 🔄 TROCA DE TURNO COM CÓDIGO NOVO — a cada 10 min ele confere se o código do chat mudou no
// main desde que este turno começou; se mudou, deixa o próximo turno na fila e encerra com calma (o log é salvo).
// Antes, código novo esperava até 6 h para entrar no ar.
// 🛡️ v4.5: última rede — os laços (e-mail, escuta, Telegram) já têm try/catch próprio; isto segura o que escapar
process.on('unhandledRejection', e => console.error('🛡️ rejeição contida — o turno segue:', String((e && e.message) || e).slice(0, 200)));
process.on('uncaughtException', e => console.error('🛡️ exceção contida — o turno segue:', String((e && e.message) || e).slice(0, 200)));
const { processOnce } = require('./email-chat.js');
const { LIMITE_FALHAS_CONSECUTIVAS, proximaFalhasConsecutivas, deveEncerrarTurno } = require('./turno-liveness.js');
const { decisaoDeProximoTurno } = require('./fila-turno.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REPO = 'reboclbrank-max/chat';
const TEM_CREDENCIAIS_EMAIL = Boolean(String(process.env.GMAIL_CHAT_ADDR || '').trim() && String(process.env.GMAIL_CHAT_PASS || '').trim());
async function api(caminho, opcoes) {
  const tok = process.env.GITHUB_TOKEN || '';
  if (!tok) return null;
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + caminho, Object.assign({
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json', 'User-Agent': 'email-casa' },
      signal: AbortSignal.timeout(30000) }, opcoes || {}));
    return r;
  } catch (e) { return null; }
}
async function despacha(arquivo, rotulo) {
  const r = await api('/actions/workflows/' + arquivo + '/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
  console.log(rotulo + (r ? ' (' + r.status + ')' : ': sem token/sem rede, não despachei'));
}
const pedeVigia = () => despacha('vigia.yml', '🛡 vigia despachado');
async function proximoTurno(opcoes = {}) {
  // A corrente antes despachava a cada pulso de 40 min e substituía a própria execução pendente.
  // Conservamos um workflow_dispatch pendente; uma reserva schedule não vale como turno longo.
  let runs = null;
  if (!opcoes.substituir) {
    const r = await api('/actions/workflows/email.yml/runs?per_page=15');
    if (r && r.ok) {
      try {
        const j = await r.json();
        if (Array.isArray(j.workflow_runs)) runs = j.workflow_runs;
      } catch (e) {}
    }
  }
  const decisao = decisaoDeProximoTurno(runs, { consultaDisponivel: Array.isArray(runs), substituir: Boolean(opcoes.substituir) });
  if (decisao === 'preservar') {
    console.log('🔗 próximo turno manual já está na fila; preservo o sucessor');
    return;
  }
  if (decisao === 'despachar-sem-confirmacao') console.log('🔗 não consegui confirmar a fila; preservo a continuidade com um pedido de sucessor');
  await despacha('email.yml', decisao === 'substituir' ? '🔄 próximo turno atualizado para o código novo' : '🔗 próximo turno na fila');
}

// 🔄 v4: o que conta como CÓDIGO do turno (robô de teste, relatórios e README não derrubam o turno)
const SHA_INICIO = process.env.GITHUB_SHA || '';
const CODIGO = /^tools\/(email-chat\.js|email-poll\.js|fila-turno\.js|falhas-mensagem\.js|turno-liveness\.js|geografia-brasil\.js|olho\.py|ocr-local\.py|transcreve\.py|visao-local\.py|prepara-foto\.py|telegram-chat\.js)$|^\.github\/workflows\/email\.yml$/;
async function codigoMudou() {   // → { arquivos: [código mudado desde que o turno começou], commits: Set(sha dos commits novos) }
  if (!SHA_INICIO) return { arquivos: [], commits: new Set() };
  const r = await api('/compare/' + SHA_INICIO + '...main');
  if (!r || !r.ok) return { arquivos: [], commits: new Set() };
  const j = await r.json();
  return { arquivos: (j.files || []).map(f => f.filename).filter(n => CODIGO.test(n)), commits: new Set((j.commits || []).map(c => c.sha)) };
}
// 🚦 v4.3: resultado dos testes rápidos do código NOVO (a rodada mais recente de um dos commits novos)
async function testesDoCodigoNovo(commits) {
  const r = await api('/actions/workflows/testes-rapidos.yml/runs?branch=main&per_page=10');
  if (!r || !r.ok) return 'nenhum';
  const j = await r.json();
  const run = (j.workflow_runs || []).find(x => commits.has(x.head_sha));
  if (!run) return 'nenhum';
  if (run.status !== 'completed') return 'rodando';
  return run.conclusion === 'success' ? 'passou' : 'reprovou';
}

// ⚡ v4.3: AVISO IMEDIATO — uma conexão fica escutando a caixa (IMAP IDLE) e acorda o ciclo quando chega e-mail
let acorda = null, chegouDuranteCiclo = false;
function dorme(ms) {
  return new Promise(res => {
    const t = setTimeout(() => { acorda = null; res('tempo'); }, ms);
    acorda = () => { clearTimeout(t); acorda = null; res('chegou'); };
  });
}
async function escuta() {
  let ImapFlow = null;
  try { ImapFlow = require('imapflow').ImapFlow; } catch (e) { console.log('⚡ escuta imediata indisponível (sem imapflow)'); return; }
  const USER = process.env.GMAIL_CHAT_ADDR, PASS = process.env.GMAIL_CHAT_PASS;
  if (!USER || !PASS) return;
  for (let tentativa = 1; ; tentativa++) {
    let c = null;
    try {
      c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false, maxIdleTime: 4 * 60 * 1000 });
      c.on('exists', () => { if (acorda) acorda(); else chegouDuranteCiclo = true; });
      const fechou = new Promise(res => { c.on('close', () => res('fechou')); c.on('error', e => res('erro: ' + String(e && e.message || e).slice(0, 60))); });
      await c.connect();
      await c.mailboxOpen('INBOX');
      if (tentativa === 1) console.log('⚡ escuta imediata ligada (IMAP IDLE) — e-mail novo acorda o ciclo na hora');
      const motivo = await fechou;
      console.log('⚡ escuta imediata caiu (' + motivo + ') — reconecto em 30 s; a varredura de 50 s continua');
    } catch (e) { console.log('⚡ escuta imediata falhou (' + String(e.message || e).slice(0, 60) + ') — tento de novo em 30 s'); }
    try { if (c) await c.logout(); } catch (e) {}
    await sleep(30000);
  }
}

const FIM = Date.now() + (5 * 60 + 45) * 60 * 1000;   // 5h45; varredura a cada 50 s + aviso imediato do Gmail (v4.3)
(async () => {
  // O turno principal não deve aparentar saúde se nem pode abrir a caixa. Não mostra
  // valores de segredo; apenas devolve erro para que o workflow e o vigia sejam honestos.
  if (!TEM_CREDENCIAIS_EMAIL) {
    console.error('🛑 canal de e-mail não iniciou: credenciais ausentes');
    process.exitCode = 1;
    return;
  }
  escuta();   // ⚡ em paralelo, para sempre (reconecta sozinha)
  try { require('./telegram-chat.js').inicia(FIM); } catch (e) { console.log('📲 Telegram não iniciou: ' + String(e.message || e).slice(0, 80)); }   // 📲 v4.4
  let varreduras = 0, respondidos = 0, motivo = 'fim do horário';
  let falhasConsecutivas = 0, falhaFatalDoCiclo = false;
  let proximoAviso = Date.now() + 5 * 60 * 1000;
  let proximaChecagem = Date.now() + 10 * 60 * 1000;
  let esperaTestesDesde = 0, reprovadoAvisado = '';
  while (Date.now() < FIM) {
    let n = 0;
    try {
      n = await processOnce();
      if (falhasConsecutivas) console.log('🟢 ciclo voltou após ' + falhasConsecutivas + ' falha(s) consecutiva(s)');
      falhasConsecutivas = proximaFalhasConsecutivas(falhasConsecutivas, true);
      varreduras++;
      respondidos += n;
      if (n) console.log('📬 respondeu', n, 'email(s)');
    } catch (e) {
      falhasConsecutivas = proximaFalhasConsecutivas(falhasConsecutivas, false);
      console.error('⚠️ ciclo de e-mail falhou (' + falhasConsecutivas + '/' + LIMITE_FALHAS_CONSECUTIVAS + ')');
      if (deveEncerrarTurno(falhasConsecutivas)) {
        // Não despacha nem reprocessa às cegas: deixa a falha explícita para o vigia e a próxima
        // execução agendada, em vez de manter um processo vivo que não consegue ler a caixa.
        motivo = 'falhas consecutivas do ciclo';
        falhaFatalDoCiclo = true;
        break;
      }
    }
    // ⚡ rajada: ciclo cheio (5) ou e-mail chegou durante o ciclo → quase nenhuma pausa
    const pausa = (n >= 5 || chegouDuranteCiclo) ? 2000 : 50000;
    chegouDuranteCiclo = false;
    await dorme(pausa);
    if (Date.now() >= proximoAviso) { await pedeVigia(); await proximoTurno(); proximoAviso = Date.now() + 40 * 60 * 1000; }
    if (Date.now() >= proximaChecagem) {
      proximaChecagem = Date.now() + 10 * 60 * 1000;
      const mud = await codigoMudou();
      if (mud.arquivos.length) {
        const t = await testesDoCodigoNovo(mud.commits);
        if (t === 'nenhum' && !esperaTestesDesde) esperaTestesDesde = Date.now();
        const semResultado = t === 'nenhum' && Date.now() - esperaTestesDesde > 30 * 60 * 1000;
        if (t === 'passou' || semResultado) {
          console.log('🔄 código novo no main (' + mud.arquivos.join(', ') + ') — ' + (t === 'passou' ? 'testes rápidos APROVADOS' : 'sem resultado dos testes em 30 min') + ' — deixo o próximo turno na fila e encerro este com calma');
          await proximoTurno({ substituir: true });
          motivo = 'código novo';
          break;
        }
        if (t === 'reprovou') {
          const chave = [...mud.commits].join(',');
          if (reprovadoAvisado !== chave) { console.log('🚫 código novo REPROVADO nos testes rápidos — fico na versão atual até chegar uma correção'); reprovadoAvisado = chave; }
        } else {
          console.log('🚦 código novo no main — esperando os testes rápidos (' + t + ')');
          proximaChecagem = Date.now() + 2 * 60 * 1000;
        }
      }
    }
  }
  console.log('turno encerrado (' + motivo + '):', varreduras, 'varreduras,', respondidos, 'emails respondidos');
  process.exit(falhaFatalDoCiclo ? 1 : 0);
})();
