// v4.2 (15/10/2026): o endereço do dono vem do segredo CHAT_DONO — saiu do código público.
// 🩺 VIGIA DA CASA (v1, 14/10/2026) — roda no repositório PÚBLICO: minutos ILIMITADOS e grátis.
// Olha o sistema inteiro DE FORA, cura o que dá (re-dispara turno/exame) e avisa o dono
// por e-mail SÓ quando o estado muda. Anti-alarme-falso: uma falha só vale após 2 rodadas seguidas.
const fs = require('fs');
const { deveSalvarEstado, registrosDeRecuperacao, recuperacaoPermitida, registraRecuperacao, limpaRecuperacao } = require('./vigia-estado');
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
// Uma checagem de saúde não pode ficar pendurada numa conexão IMAP e deixar de publicar o próprio estado.
const comTeto = (p, ms, rotulo) => { Promise.resolve(p).catch(() => {}); return Promise.race([p, new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('teto ' + Math.round(ms / 1000) + 's: ' + rotulo)), ms))]); };

async function buscaJSON(url) {
  const headers = { 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json' };
  // Sem cabeçalho autenticado a API pública pode devolver 403 por limite anônimo e fingir que
  // site/turnos/exame falharam. O token fica restrito ao cabeçalho para api.github.com e nunca é logado.
  if (TOKEN && /^https:\/\/api\.github\.com\//.test(url)) headers.Authorization = 'Bearer ' + TOKEN;
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Categorias fechadas: o estado público recebe só este código sanitizado, nunca exceção bruta,
// conteúdo de caixa, destinatário, URL autenticada ou token. Só causas observáveis e conhecidas
// podem justificar uma recuperação automática.
const CAUSAS_VIGIA = Object.freeze([
  'saudavel', 'api-indisponivel', 'sem-execucao', 'execucao-falhou',
  'fila-estagnada', 'turno-ausente', 'bateria-atrasada', 'caixa-atrasada',
  'sonda-indisponivel'
]);
const CAUSAS_RECUPERAVEIS = Object.freeze(['sem-execucao', 'turno-ausente', 'bateria-atrasada', 'caixa-atrasada']);

function falhaVigia(causa, detalhe, recuperavel = false) {
  const causaSegura = CAUSAS_VIGIA.includes(causa) ? causa : 'sonda-indisponivel';
  const erro = new Error(detalhe);
  erro.causa = causaSegura;
  erro.recuperavel = Boolean(recuperavel) && CAUSAS_RECUPERAVEIS.includes(causaSegura);
  return erro;
}

async function verifica(nome, fn) {
  try { return { nome, ok: true, causa: 'saudavel', recuperavel: false, detalhe: await fn() }; }
  catch (e) {
    const causa = e && CAUSAS_VIGIA.includes(e.causa) ? e.causa : 'sonda-indisponivel';
    return {
      nome,
      ok: false,
      causa,
      recuperavel: Boolean(e && e.recuperavel) && CAUSAS_RECUPERAVEIS.includes(causa),
      detalhe: String((e && e.message) || e).slice(0, 140)
    };
  }
}

async function acao(rotulo, arquivo) {
  if (!TOKEN) return { tentada: false, texto: rotulo + ': sem token para recuperar' };
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + arquivo + '/dispatches', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'vigia-casa/1', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }), signal: AbortSignal.timeout(30000)
    });
    return { tentada: true, texto: rotulo + ': ' + (r.status === 204 ? 'reconvocado ✅' : 'dispatch HTTP ' + r.status) };
  } catch (e) { return { tentada: true, texto: rotulo + ': dispatch falhou (' + String(e.message || e).slice(0, 70) + ')' }; }
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
    if (!runsEmail) throw falhaVigia('api-indisponivel', 'API de execuções indisponível');
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
      // Uma fila já congestionada não melhora com mais dispatches: registra e aguarda intervenção/normalização.
      if (min > 30) throw falhaVigia('fila-estagnada', 'turno na fila há ' + min.toFixed(0) + 'min SEM nada rodando');
      return 'turno na fila há ' + min.toFixed(0) + 'min (nada rodando ainda)';
    }
    const ult = meus[0];
    if (!ult) throw falhaVigia('sem-execucao', 'nenhuma execução encontrada', true);
    const conclusao = String(ult.conclusion || '').toLowerCase();
    // Reexecutar cegamente código que acabou de falhar pode ampliar uma regressão; a falha fica explícita,
    // mas só ausência/atraso comprovados são auto-recuperáveis.
    if (ult.status === 'completed' && conclusao && conclusao !== 'success') {
      throw falhaVigia('execucao-falhou', 'última execução terminou em ' + conclusao.replace(/[^a-z_]/g, '').slice(0, 32));
    }
    const idade = h(Date.now() - new Date(ult.created_at).getTime());
    // 14/10: corrente nova — sem NADA vivo nem na fila, 45 min já é sinal de corrente quebrada (antes: 7h)
    if (idade > 0.75) throw falhaVigia('turno-ausente', 'nenhum turno vivo há ' + idade.toFixed(1) + 'h', true);
    return 'turno recente há ' + (idade * 60).toFixed(0) + 'min';
  }));

  itens.push(await verifica('Bateria do cérebro', async () => {
    if (!runsExame) throw falhaVigia('api-indisponivel', 'API de execuções indisponível');
    const meus = runsExame.workflow_runs;
    const ult = meus[0];
    if (!ult) throw falhaVigia('sem-execucao', 'nenhuma execução encontrada', true);
    const conclusao = String(ult.conclusion || '').toLowerCase();
    if (ult.status === 'completed' && conclusao && conclusao !== 'success') {
      throw falhaVigia('execucao-falhou', 'último exame terminou em ' + conclusao.replace(/[^a-z_]/g, '').slice(0, 32));
    }
    const idade = h(Date.now() - new Date(ult.created_at).getTime());
    if (idade > 26) throw falhaVigia('bateria-atrasada', 'último exame há ' + idade.toFixed(1) + 'h', true);
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
    if (!USER || !PASS) throw falhaVigia('sonda-indisponivel', 'sem credenciais nesta execução');
    let imap = null;
    try { imap = require('imapflow'); } catch (e) { throw falhaVigia('sonda-indisponivel', 'imapflow ausente nesta execução'); }
    const cli = new imap.ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
    await comTeto(cli.connect(), 45000, 'conexão IMAP');
    try {
      const lock = await comTeto(cli.getMailboxLock('INBOX'), 30000, 'trava da caixa');
      try {
        const uids = await comTeto(cli.search({ seen: false }), 30000, 'busca de não lidos');
        const alvo = uids || [];
        if (!alvo.length) return 'nada sem resposta';
        const m = await comTeto(cli.fetchOne(alvo[0], { envelope: true }), 30000, 'leitura do não lido');
        const quando = (m && m.envelope && m.envelope.date) ? new Date(m.envelope.date).getTime() : Date.now();
        const min = (Date.now() - quando) / 60000;
        if (min < 12) return alvo.length + ' e-mail(s) recém-chegado(s) — o turno pega em instantes';
        throw falhaVigia('caixa-atrasada', alvo.length + ' e-mail(s) SEM RESPOSTA, o mais antigo há ' + min.toFixed(0) + ' min', true);
      } finally { lock.release(); }
    } finally { try { await comTeto(cli.logout(), 15000, 'logout IMAP'); } catch (e) { try { cli.close(); } catch (e2) {} } }
  }));

  // ---- estado + anti-alarme-falso (falha só conta após 2 rodadas seguidas) ----
  // O arquivo é público e pode sobreviver a pushes concorrentes. JSON válido, porém com
  // formato inútil (por exemplo `null`), não pode derrubar o vigia nem congelar seu pulso.
  function estadoAnteriorSeguro() {
    try {
      const lido = JSON.parse(fs.readFileSync(ESTADO, 'utf8'));
      if (lido && typeof lido === 'object' && !Array.isArray(lido)) return lido;
      console.warn('🩺 estado anterior inválido — reconstruo fotografia sanitizada');
    } catch (e) {}
    return { itens: {} };
  }
  const antigo = estadoAnteriorSeguro();
  const novos = {};
  // O registro contém somente timestamps de tentativas autorizadas; não inclui destinatário,
  // conteúdo de caixa, token, URL autenticada ou resultado privado do turno.
  let recuperacoes = registrosDeRecuperacao(antigo.recuperacoes);
  let mudou = false;
  const linhas = [];
  for (const it of itens) {
    const prev = (antigo.itens || {})[it.nome] || { ok: true, falhas: 0 };
    // Dois é o único limiar usado pelo alarme. Saturar aqui evita commits contínuos de 3/2,
    // 4/2, ... durante uma mesma pane persistente.
    const falhas = it.ok ? 0 : Math.min(2, (prev.falhas || 0) + 1);
    const efetivoAntes = prev.ok || (prev.falhas || 0) < 2;
    const efetivoAgora = it.ok || falhas < 2;
    const causa = it.ok ? 'saudavel' : it.causa;
    // Mudança de causa é relevante mesmo se a pane já estava confirmada: pode tornar a recuperação
    // elegível ou bloqueá-la, sem registrar detalhe sensível.
    if (efetivoAntes !== efetivoAgora || (!it.ok && prev.causa && prev.causa !== causa)) mudou = true;
    novos[it.nome] = { ok: it.ok, falhas, causa };
    linhas.push((efetivoAgora ? '✅' : '❌') + ' ' + it.nome + ' — ' + it.detalhe + (it.ok ? '' : ' · causa: ' + causa + ' (falha ' + falhas + '/2)'));
  }

  // ---- recuperação contida: ação autorizada, reversível e nunca em rajada ----
  const cura = [];
  const t = itens.find(i => i.nome === 'Chat por e-mail (24h)');
  const b = itens.find(i => i.nome === 'Bateria do cérebro');
  const cb = itens.find(i => i.nome === 'Caixa de e-mail');
  const referencia = Date.parse(agora);

  // Uma volta saudável remove o freio dessa família: uma nova pane futura pode receber a
  // primeira tentativa imediatamente, sem herdar uma tentativa antiga.
  if (t && t.ok && cb && cb.ok) recuperacoes = limpaRecuperacao(recuperacoes, 'email');
  if (b && b.ok) recuperacoes = limpaRecuperacao(recuperacoes, 'exame');

  async function tentaRecuperar(chave, rotulo, arquivo) {
    if (!recuperacaoPermitida(recuperacoes, chave, referencia)) {
      cura.push(rotulo + ': recuperação já tentada no intervalo seguro');
      return;
    }
    const resultado = await acao(rotulo, arquivo);
    cura.push(resultado.texto);
    // Mesmo erro de rede/API entra no freio: repetir o mesmo dispatch a cada 15 min só amplia a pane.
    if (resultado.tentada) recuperacoes = registraRecuperacao(recuperacoes, chave, referencia);
  }

  // Turno e caixa compartilham a mesma trava: se ambos acusarem falha numa rodada, há no máximo
  // um dispatch de email.yml. A bateria é uma família independente e mais espaçada.
  if (t && !t.ok && t.recuperavel) await tentaRecuperar('email', 'E-mail (turno)', 'email.yml');
  if (b && !b.ok && b.recuperavel) await tentaRecuperar('exame', 'Bateria (exame)', 'evolucao.yml');
  if (cb && !cb.ok && cb.recuperavel) await tentaRecuperar('email', 'Caixa (turno)', 'email.yml');

  // Persistência econômica: mudança entra na hora; casa estável deixa um pulso por hora, para que
  // capacidade/continuidade não confundam estado verde silencioso com vigia parado.
  if (deveSalvarEstado(antigo, novos, referencia, recuperacoes)) {
    const estado = { verificado_em: agora, itens: novos };
    if (Object.keys(recuperacoes).length) estado.recuperacoes = recuperacoes;
    fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 1));
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
  // A cadência pertence ao cron de 15 min do workflow. A corrente antiga dormia 17 min
  // dentro de um job limitado a 15 min: era cancelada antes de salvar estado e antes de
  // despachar a próxima rodada. Não reintroduzir espera/auto-dispatch aqui; a concorrência
  // do workflow já serializa disparos de cron e despertares de reserva.

})().catch(() => {
  // Um defeito fora das sondas tratadas precisa aparecer como falha do workflow, não como
  // fotografia verde. A mensagem é deliberadamente genérica para não expor detalhe sensível.
  console.error('ERRO no vigia: execução interrompida antes de concluir a fotografia');
  process.exitCode = 1;
});
