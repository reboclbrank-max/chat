// 🩺 VIGIA DA CASA (v1, 14/10/2026) — roda no repositório PÚBLICO: minutos ILIMITADOS e grátis.
// Olha o sistema inteiro DE FORA, cura o que dá (re-dispara turno/exame) e avisa o dono
// por e-mail SÓ quando o estado muda. Anti-alarme-falso: uma falha só vale após 2 rodadas seguidas.
const fs = require('fs');
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) {}

const PARA = process.env.VIGIA_PARA || 'reboclbrank@gmail.com';
const USER = process.env.GMAIL_CHAT_ADDR, PASS = process.env.GMAIL_CHAT_PASS;
const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'reboclbrank-max/chat';
const ESTADO = 'vigia-estado.json';
const TESTE = String(process.env.VIGIA_TESTE || process.argv[2] || '').toLowerCase() === 'sim';
const agora = new Date().toISOString();
const h = ms => ms / 36e5;

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

  const runs = await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/runs?per_page=30').catch(() => null);

  itens.push(await verifica('Chat por e-mail (24h)', async () => {
    if (!runs) throw new Error('API de execuções indisponível');
    const meus = runs.workflow_runs.filter(r => r.name.includes('email'));
    const vivos = meus.filter(r => r.status === 'in_progress' || r.status === 'queued');
    if (vivos.length > 1) {
      // 🛡 turnos duplicados (achado da auditoria de 14/10): mantém o mais antigo e cancela os extras
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
    if (vivos.length) return 'turno ACORDADO agora';
    const ult = meus[0];
    if (!ult) throw new Error('nenhuma execução encontrada');
    const idade = h(Date.now() - new Date(ult.created_at).getTime());
    if (idade > 7) throw new Error('último turno há ' + idade.toFixed(1) + 'h');
    return 'turno recente há ' + idade.toFixed(1) + 'h';
  }));

  itens.push(await verifica('Bateria do cérebro', async () => {
    if (!runs) throw new Error('API de execuções indisponível');
    const meus = runs.workflow_runs.filter(r => /Evolu/.test(r.name));
    const ult = meus[0];
    if (!ult) throw new Error('nenhuma execução encontrada');
    const idade = h(Date.now() - new Date(ult.created_at).getTime());
    if (idade > 26) throw new Error('último exame há ' + idade.toFixed(1) + 'h');
    return 'último exame há ' + idade.toFixed(1) + 'h';
  }));

  for (const par of [['itch Ceifalume', 'https://rebocl-brank.itch.io/ceifalume'], ['itch Prancheta', 'https://rebocl-brank.itch.io/prancheta']]) {
    itens.push(await verifica(par[0], async () => {
      const r = await fetch(par[1], { signal: AbortSignal.timeout(25000), redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return 'no ar';
    }));
  }

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

  fs.writeFileSync(ESTADO, JSON.stringify({ verificado_em: agora, itens: novos }, null, 1));
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
    if (nodemailer && USER && PASS) {
      const tr = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS } });
      await tr.sendMail({ from: '"Vigia da Casa" <' + USER + '>', to: PARA, subject: assunto, text: corpo });
      console.log('📧 aviso enviado:', assunto);
    } else {
      console.log('📧 (sem credenciais de e-mail nesta execução — aviso não enviado)');
    }
  } else {
    console.log('(sem mudança — nenhum aviso enviado)');
  }
})().catch(e => { console.error('ERRO no vigia:', e.message); process.exit(0); });
