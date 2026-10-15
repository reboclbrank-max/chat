// v4.2 (15/10/2026): o endereço do dono vem do segredo CHAT_DONO — saiu do código público.
// 🩺 VIGIA DA CASA (v1, 14/10/2026) — roda no repositório PÚBLICO: minutos ILIMITADOS e grátis.
// Olha o sistema inteiro DE FORA, cura o que dá (re-dispara turno/exame) e avisa o dono
// por e-mail SÓ quando o estado muda. Anti-alarme-falso: uma falha só vale após 2 rodadas seguidas.
const fs = require('fs');
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) {}

const PARA = String(process.env.VIGIA_PARA || '').trim();   // v4.2: o endereço do dono vem do segredo CHAT_DONO (saiu do código público)
console.log('📧 avisos para: ' + (PARA ? PARA.replace(/^(.{3})[^@]*/, '$1***') : '(ninguém — falta o segredo CHAT_DONO)'));
const USER = process.env.GMAIL_CHAT_ADDR, PASS = process.env.GMAIL_CHAT_PASS;
const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'reboclbrank-max/chat';
const ESTADO = 'vigia-estado.json';
const TESTE = String(process.env.VIGIA_TESTE || process.argv[2] || '').toLowerCase() === 'sim';
const agora = new Date().toISOString();
const h = ms => ms / 36e5;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function buscaJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function verifica(nome, fn) {
  try { return { nome, ok: true, detalhe: await fn() }; }
  catch (e) { return { nome, ok: false, detalhe: String((e && e.message) || e).slice(0, 140) }; }
}

async function acao(rotulo, arquivo) {
  if (!TOKEN) return rotulo + ': sem token para curar';
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + arquivo + '/dispatches', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }), signal: AbortSignal.timeout(30000)
    });
    return rotulo + ': ' + (r.status === 204 ? 'reconvocado ✅' : 'dispatch HTTP ' + r.status);
  } catch (e) { return rotulo + ': dispatch falhou (' + String(e.message || e).slice(0, 70) + ')'; }
}

(async () => {
  const itens = [];

  itens.push(await verifica('Página do chat', async () => {
    const r = await fetch('https://reboclbrank-max.github.io/chat/', { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const t = await r.text();
    if (t.length < 100000) throw new Error('página suspeita (curta)');
    return 'no ar (' + Math.round(t.length / 1024) + ' KB)';
  }));

  itens.push(await verifica('Site oficial', async () => {
    const r = await fetch('https://reboclbrank-max.github.io/site/', { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return 'no ar';
  }));

  itens.push(await verifica('Casa postando (site)', async () => {
    const j = await buscaJSON('https://api.github.com/repos/reboclbrank-max/site/commits?per_page=1');
    const idade = h(Date.now() - new Date(j[0].commit.committer.date).getTime());
    if (idade > 9) throw new Error('sem commit há ' + idade.toFixed(1) + 'h');
    return 'último commit há ' + idade.toFixed(1) + 'h';
  }));

  // 🔎 consulta POR WORKFLOW (a lista genérica pode "perder" runs antigos no meio de muitas páginas)
  const runsEmail = await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/workflows/email.yml/runs?per_page=15').catch(() => null);
  const runsExame = await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/workflows/evolucao.yml/runs?per_page=10').catch(() => null);

  itens.push(await verifica('Chat por e-mail (24h)', async () => {
    if (!runsEmail) throw new Error('API de execuções indisponível');
    const meus = runsEmail.workflow_runs;
    const vivos = meus.filter(r => r.status === 'in_progress');
    const naFila = meus.filter(r => r.status === 'queued' || r.status === 'pending');
    if (vivos.length > 1) {
      // 🛡 turnos duplicados (achado da auditoria de 14/10): mantém o mais antigo e cancela os extras
      // (14/10, manhã: só RODANDO conta como duplicado — o turno seguinte na fila é a corrente, não defeito)
      const manter = vivos[vivos.length - 1];
      let n = 0;
      for (const r of vivos) {
        if (r.id === manter.id || !TOKEN) continue;
        try {
          const rr = await fetch('https://api.github.com/repos/' + REPO + '/actions/runs/' + r.id + '/cancel', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json' },
            signal: AbortSignal.timeout(30000)
          });
          if (rr.status === 202) n++;
        } catch (e) {}
      }
      return 'turno ACORDADO agora · 🛡 duplicados cancelados: ' + n + '/' + (vivos.length - 1);
    }
    if (vivos.length) return 'turno ACORDADO agora' + (naFila.length ? ' · 🔗 próximo já na fila' : '');
    // fila com NADA rodando: aí sim pode ser travamento (na corrente, esperar atrás de um turno vivo é normal)
    if (naFila.length) {
      const maisVelho = Math.max.apply(null, naFila.map(r => Date.now() - new Date(r.created_at).getTime()));
      const min = maisVelho / 60000;
      if (min > 30) throw new Error('turno na fila há ' + min.toFixed(0) + 'min SEM nada rodando');
      return 'turno na fila há ' + min.toFixed(0) + 'min (nada rodando ainda)';
    }
    const ult = meus[0];
    if (!ult) throw new Error('nenhuma execução encontrada');
    const idade = h(Date.now() - new Date(ult.created_at).getTime());
    // 14/10: corrente nova — sem NADA vivo nem na fila, 45 min já é sinal de corrente quebrada (antes: 7h)
    if (idade > 0.75) throw new Error('nenhum turno vivo há ' + idade.toFixed(1) + 'h');
    return 'turno recente há ' + (idade * 60).toFixed(0) + 'min';
  }));

  itens.push(await verifica('Bateria do cérebro', async () => {
    if (!runsExame) throw new Error('API de execuções indisponível');
    const meus = runsExame.workflow_runs;
    const ult = meus[0];
    if (!ult) throw new Error('nenhuma execução encontrada');
    const idade = h(Date.now() - new Date(ult.created_at).getTime());
    if (idade > 26) throw new Error('último exame há ' + idade.toFixed(1) + 'h');
    return 'último exame há ' + idade.toFixed(1) + 'h';
  }));

  for (const par of [['itch Ceifalume', 'https://rebocl-brank.itch.io/ceifalume'], ['itch Prancheta', 'https://rebocl-brank.itch.io/prancheta']]) {
    itens.push(await verifica(par[0], async () => {
      const r = await fetch(par[1], { signal: AbortSignal.timeout(25000), redirect: 'follow' });
      // 429 = o próprio itch limitou a checagem (a página está no ar, só não quer conversa agora)
      if (r.status === 429) return 'no ar (itch limitou a checagem agora — 429, sem alarme)';
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return 'no ar';
    }));
  }

  // 📬 CAIXA: e-mail parado sem resposta é o problema mais importante da casa (o vigia não pode dormir nele)
  itens.push(await verifica('Caixa de e-mail', async () => {
    if (!USER || !PASS) throw new Error('sem credenciais nesta execução');
    let imap = null;
    try { imap = require('imapflow'); } catch (e) { throw new Error('imapflow ausente nesta execução'); }
    const cli = new imap.ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
    await cli.connect();
    try {
      const lock = await cli.getMailboxLock('INBOX');
      try {
        const uids = await cli.search({ seen: false });
        const alvo = uids || [];
        if (!alvo.length) return 'nada sem resposta';
        const m = await cli.fetchOne(alvo[0], { envelope: true });
        const quando = (m && m.envelope && m.envelope.date) ? new Date(m.envelope.date).getTime() : Date.now();
        const min = (Date.now() - quando) / 60000;
        if (min < 12) return alvo.length + ' e-mail(s) recém-chegado(s) — o turno pega em instantes';
        throw new Error(alvo.length + ' e-mail(s) SEM RESPOSTA, o mais antigo há ' + min.toFixed(0) + ' min');
      } finally { lock.release(); }
    } finally { try { await cli.logout(); } catch (e) {} }
  }));

  // ---- estado + anti-alarme-falso (falha só conta após 2 rodadas seguidas) ----
  let antigo = { itens: {} };
  try { antigo = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch (e) {}
  const novos = {};
  let mudou = false;
  const linhas = [];
  for (const it of itens) {
    const prev = (antigo.itens || {})[it.nome] || { ok: true, falhas: 0 };
    const falhas = it.ok ? 0 : (prev.falhas || 0) + 1;
    const efetivoAntes = prev.ok || (prev.falhas || 0) < 2;
    const efetivoAgora = it.ok || falhas < 2;
    if (efetivoAntes !== efetivoAgora) mudou = true;
    novos[it.nome] = { ok: it.ok, falhas };
    linhas.push((efetivoAgora ? '✅' : '❌') + ' ' + it.nome + ' — ' + it.detalhe + (it.ok ? '' : ' (falha ' + falhas + '/2)'));
  }

  // ---- cura: turno do e-mail morto → reconvoca; bateria atrasada → dispara ----
  const cura = [];
  const t = itens.find(i => i.nome === 'Chat por e-mail (24h)');
  if (t && !t.ok) cura.push(await acao('E-mail (turno)', 'email.yml'));
  const b = itens.find(i => i.nome === 'Bateria do cérebro');
  if (b && !b.ok) cura.push(await acao('Bateria (exame)', 'evolucao.yml'));
  const cb = itens.find(i => i.nome === 'Caixa de e-mail');
  if (cb && !cb.ok) cura.push(await acao('Caixa (turno)', 'email.yml'));

  // grava o estado SÓ quando algo muda (com a corrente de 20 min seria 1 commit por rodada — ruído à toa)
  const textoAntigo = JSON.stringify((antigo && antigo.itens) || {});
  if (textoAntigo !== JSON.stringify(novos)) {
    fs.writeFileSync(ESTADO, JSON.stringify({ verificado_em: agora, itens: novos }, null, 1));
  }
  console.log(linhas.join('\n'));
  if (cura.length) console.log('cura:', cura.join(' · '));

  // ---- aviso ao dono: só quando muda (ou no teste) ----
  if (mudou || TESTE) {
    const ruins = linhas.filter(l => l.startsWith('❌'));
    const assunto = TESTE ? '🩺 Vigia da casa — teste' : (ruins.length ? '🩺 Vigia da casa: ' + ruins.length + ' problema(s)' : '🩺 Vigia da casa: tudo voltou ao normal');
    const corpo = (TESTE ? 'Este é o teste do vigia da casa — ele roda de graça e sem limite no repositório público.\n\n' : '') +
      'Checagem de ' + agora + ' (UTC):\n\n' + linhas.join('\n') +
      (cura.length ? '\n\nCuras tentadas:\n- ' + cura.join('\n- ') : '') +
      '\n\n— Vigia da casa (Rebocl Brank) · este aviso só chega quando algo muda';
    if (!PARA) {
      console.log('📧 sem destinatário (segredo CHAT_DONO ausente) — aviso só neste log');
    } else if (nodemailer && USER && PASS) {
      const tr = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS } });
      await tr.sendMail({ from: '"Vigia da Casa" <' + USER + '>', to: PARA, subject: assunto, text: corpo });
      console.log('📧 aviso enviado:', assunto);
    } else {
      console.log('📧 (sem credenciais de e-mail nesta execução — aviso não enviado)');
    }
  } else {
    console.log('(sem mudança — nenhum aviso enviado)');
  }
  // 🔗 CORRENTE DO VIGIA: cada rodada dorme e chama a PRÓXIMA — sem depender de cron.
  // 🛡 GUARDA ANTI-MULTIPLICAÇÃO: no despertar, se existir outra rodada VIVA mais nova que a minha,
  //    ela é quem segue (senão cada turno/pulso criaria uma corrente nova e elas se multiplicariam).
  if (String(process.env.VIGIA_CADEIA || 'sim').toLowerCase() !== 'nao' && TOKEN) {
    const min = Math.max(5, Number(process.env.VIGIA_CADEIA_MIN || 17));
    console.log('🔗 corrente: próxima rodada em ' + min + ' min');
    await new Promise(r => setTimeout(r, min * 60 * 1000));
    let seguir = true;
    try {
      const lista = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/vigia.yml/runs?per_page=15', {
        headers: { 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json' }, signal: AbortSignal.timeout(30000)
      });
      const meu = String(process.env.GITHUB_RUN_ID || '');
      const j = await lista.json();
      for (const r of (j.workflow_runs || [])) {
        if (String(r.id) === meu) continue;
        const viva = (r.status === 'queued' || r.status === 'in_progress' || r.status === 'pending');
        if (viva && String(r.id) > meu) { seguir = false; console.log('🔗 há rodada viva mais nova (#' + r.run_number + ') — ela segue, eu paro'); break; }
      }
    } catch (e) { console.log('🔗 guarda da corrente não conseguiu checar (sigo):', String(e.message || e).slice(0, 80)); }
    if (seguir) {
      try {
        const rr = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/vigia.yml/dispatches', {
          method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: 'main' }), signal: AbortSignal.timeout(30000)
        });
        console.log('🔗 próxima rodada despachada (' + rr.status + ')');
      } catch (e) { console.log('🔗 dispatch da corrente falhou:', e.message); }
    }
  }
})().catch(e => { console.error('ERRO no vigia:', e.message); process.exit(0); });
