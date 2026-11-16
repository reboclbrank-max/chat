// v4.2 (15/10/2026): o endereço do dono vem do segredo CHAT_DONO — saiu do código público.
// 🩺 VIGIA DA CASA (v1, 14/10/2026) — roda no repositório PÚBLICO: minutos ILIMITADOS e grátis.
// Olha o sistema inteiro DE FORA, cura o que dá (re-dispara turno/exame) e avisa o dono
// por e-mail SÓ quando o estado muda. Anti-alarme-falso: uma falha só vale após 2 rodadas seguidas.
const fs = require('fs');
const { diagnosticoDaBarreira } = require('./socorro');
const { lerNivel, resumo: resumoAutonomia } = require('./autonomia');
// A faixa vem do MAPA, não de uma cópia: duas listas iguais divergem no dia em que uma muda.
const { LIBERADOS_PARA_DEGRAU_4 } = require('./risco-de-arquivo');
const { deveSalvarEstado, registrosDeRecuperacao, recuperacaoPermitida, registraRecuperacao, limpaRecuperacao, evidenciaVigiaConhecida } = require('./vigia-estado');
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
// O postador principal tem janelas de três horas, mas GitHub Actions é melhor esforço. A
// tolerância de nove horas detecta ausência material sem vender os crons como SLA de minuto.
const JANELA_POSTAGEM_SITE_MS = 9 * 60 * 60 * 1000;
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
  'fila-estagnada', 'turnos-duplicados', 'turno-ausente', 'bateria-atrasada', 'caixa-atrasada',
  'postagem-atrasada', 'postador-desligado', 'barreira-vermelha', 'sonda-indisponivel',
  // 05/11: estas três não estavam na lista e viravam "sonda-indisponivel" no estado —
  // o dono via falha de autonomia sem saber QUAL. Causa fechada, mas específica.
  'autonomia-ilegivel', 'autonomia-sem-prazo', 'autonomia-sem-faixa',
  // 06/11: main que anda sem execução da barreira é pane silenciosa — foi assim que o merge
  // do robô passou sem teste até alguém medir. Causa própria para não virar "sem-execucao".
  'barreira-sem-execucao',
  // 09/11: redes sociais — cada uma tem causa própria para o dono saber QUAL falhou
  'rede-github', 'rede-youtube', 'rede-itch', 'rede-bluesky', 'rede-mastodon',
  'rede-instagram', 'rede-threads', 'rede-discord', 'rede-devto', 'rede-tumblr',
  'rede-nostr', 'rede-gmail'
]);
const CAUSAS_RECUPERAVEIS = Object.freeze(['sem-execucao', 'turno-ausente', 'bateria-atrasada', 'caixa-atrasada']);

function falhaVigia(causa, detalhe, recuperavel = false) {
  const causaSegura = CAUSAS_VIGIA.includes(causa) ? causa : 'sonda-indisponivel';
  const erro = new Error(detalhe);
  erro.causa = causaSegura;
  erro.recuperavel = Boolean(recuperavel) && CAUSAS_RECUPERAVEIS.includes(causaSegura);
  return erro;
}

// A sonda pode usar detalhe apenas no log do job, mas só um código de evidência fechado
// atravessa para o estado público. Assim a página/status não ecoa resposta de API, plataforma
// ou caixa e continua distinguindo “rotina observada” de “resultado externo confirmado”.
function sondaSaudavel(detalhe, evidencia) {
  return { detalhe: String(detalhe || ''), evidencia: evidenciaVigiaConhecida(evidencia) };
}

async function verifica(nome, fn) {
  try {
    const resultado = await fn();
    const estruturado = resultado && typeof resultado === 'object' && !Array.isArray(resultado) &&
      Object.prototype.hasOwnProperty.call(resultado, 'detalhe');
    return {
      nome,
      ok: true,
      causa: 'saudavel',
      recuperavel: false,
      detalhe: estruturado ? String(resultado.detalhe || '') : String(resultado || ''),
      evidencia: estruturado ? evidenciaVigiaConhecida(resultado.evidencia) : ''
    };
  } catch (e) {
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
    return sondaSaudavel('no ar (' + Math.round(t.length / 1024) + ' KB)', 'pagina-respondendo');
  }));

  itens.push(await verifica('Site oficial', async () => {
    const r = await fetch('https://reboclbrank-max.github.io/site/', { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return sondaSaudavel('no ar', 'pagina-respondendo');
  }));

  // 🔎 consulta POR WORKFLOW (a lista genérica pode "perder" runs antigos no meio de muitas páginas).
  // A execução recente confirma só a rotina técnica; publicação, aceite e alcance de canais externos
  // continuam fora desta sonda. Não há dispatch nem recuperação automática do postador por aqui.
  const runsPostagemSite = await buscaJSON('https://api.github.com/repos/reboclbrank-max/site/actions/workflows/postagem-diaria.yml/runs?per_page=30').catch(() => null);
  // Um postador desligado À MÃO não está atrasado: está desligado. Sem esta leitura o vigia
  // anunciava "postagem atrasada" (e alarmava o dono) para uma decisão humana, gastando a
  // confiança no alarme. A leitura é do estado do workflow, não do conteúdo das postagens.
  const estadoPostador = await buscaJSON('https://api.github.com/repos/reboclbrank-max/site/actions/workflows/postagem-diaria.yml').catch(() => null);
  const runsEmail = await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/workflows/email.yml/runs?per_page=15').catch(() => null);
  // Barreira de testes NA MAIN: se ela reprova, o código que está no ar é duvidoso e o dono
  // precisa saber qual passo caiu — não só que "ficou vermelho".
  const runsBarreira = await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/workflows/testes-rapidos.yml/runs?branch=main&per_page=5').catch(() => null);
  // A cabeça da main é a única forma de saber se o ÚLTIMO commit foi testado. A lista de
  // execuções sozinha não conta isso: ela pode estar toda verde e antiga.
  const cabecaMain = await buscaJSON('https://api.github.com/repos/' + REPO + '/commits/main').catch(() => null);
  const runsExame = await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/workflows/evolucao.yml/runs?per_page=10').catch(() => null);

  itens.push(await verifica('Casa postando (site)', async () => {
    const desligadoAMao = String((estadoPostador && estadoPostador.state) || '').toLowerCase();
    if (desligadoAMao === 'disabled_manually') {
      // Não tento religar: componente desligado por decisão não é pane. Fica visível e sem alarme falso.
      throw falhaVigia('postador-desligado', 'postador desligado à mão; atraso não medido (decisão do dono)');
    }
    if (!runsPostagemSite) throw falhaVigia('api-indisponivel', 'API de execuções do postador indisponível');
    const execucoes = Array.isArray(runsPostagemSite.workflow_runs) ? runsPostagemSite.workflow_runs : [];
    const quando = run => {
      const ms = Date.parse(String(run && (run.updated_at || run.created_at) || ''));
      return Number.isFinite(ms) ? ms : NaN;
    };
    const ordenadas = execucoes.filter(run => run && Number.isFinite(quando(run))).sort((a, b) => quando(b) - quando(a));
    const ultima = ordenadas[0];
    const sucesso = ordenadas.find(run => run.status === 'completed' && run.conclusion === 'success');
    const idadeUltima = ultima ? Date.now() - quando(ultima) : Infinity;
    const idadeSucesso = sucesso ? Date.now() - quando(sucesso) : Infinity;
    // A leitura é deliberadamente do resultado mais recente: um sucesso anterior não deve
    // esconder uma falha nova. Ainda assim, nenhum desses estados tenta reexecutar/publicar.
    if (ultima && ultima.status === 'completed' && String(ultima.conclusion || '').toLowerCase() !== 'success') {
      throw falhaVigia('execucao-falhou', 'última rotina do postador terminou em ' + String(ultima.conclusion || 'desconhecida').replace(/[^a-z_]/g, '').slice(0, 32));
    }
    if (ultima && ['in_progress', 'queued', 'pending'].includes(ultima.status) && idadeUltima <= JANELA_POSTAGEM_SITE_MS) {
      return sondaSaudavel('rotina automática em andamento há ' + h(idadeUltima).toFixed(1) + 'h', 'postagem-em-andamento');
    }
    if (ultima && ultima.status === 'completed' && ultima.conclusion === 'success' && idadeUltima <= JANELA_POSTAGEM_SITE_MS) {
      return sondaSaudavel('rotina automática concluída há ' + h(idadeUltima).toFixed(1) + 'h', 'postagem-agendada-recente');
    }
    if (sucesso) throw falhaVigia('postagem-atrasada', 'última rotina automática há ' + h(idadeSucesso).toFixed(1) + 'h');
    throw falhaVigia('sem-execucao', 'nenhuma execução recente do postador encontrada');
  }));

  // Degrau 4: o dono enxerga, no próprio estado da casa, QUANTO de autonomia está ligado.
  // Se alguém subir o nível acima do que foi provado, o vigia acusa — não passa em silêncio.
  itens.push(await verifica('Autonomia (nível)', async () => {
    let conteudo = null;
    try { conteudo = fs.readFileSync('autonomia.json', 'utf8'); } catch (e) { conteudo = null; }
    const leitura = lerNivel(conteudo);
    if (!leitura.valido) throw falhaVigia('autonomia-ilegivel', leitura.motivo + ' (a casa age como desligada)');
    if (leitura.nivel === 'desligado') return sondaSaudavel('autonomia desligada à mão', 'autonomia-desligada');
    if (leitura.nivel === 'texto') return sondaSaudavel(resumoAutonomia(leitura), 'autonomia-texto');
    if (leitura.expirado) return sondaSaudavel('ensaio encerrado pelo prazo: a casa voltou a agir como desligada', 'autonomia-desligada');
    // Nível alto: o vigia cobra a FORMA do que foi ligado, com o que tem em mãos.
    // Não tenta recalcular os portões aqui (seria caro e daria número diferente do painel):
    // cobra as duas garantias que dependem só do arquivo — prazo e faixa.
    if (leitura.semPrazo) throw falhaVigia('autonomia-sem-prazo', 'nível código ligado sem expira_em: ensaio sem fim marcado', false);
    const faixa = Array.isArray(LIBERADOS_PARA_DEGRAU_4) ? LIBERADOS_PARA_DEGRAU_4 : [];
    if (!faixa.length) {
      throw falhaVigia('autonomia-sem-faixa', 'nível código ligado sem faixa declarada em autonomia.json', false);
    }
    return sondaSaudavel('autonomia no degrau 4: ' + faixa.length + ' arquivo(s) na faixa, prazo até ' + String(leitura.expira_em).slice(0, 10), 'autonomia-codigo');
  }));

  itens.push(await verifica('Barreira de testes (main)', async () => {
    if (!runsBarreira) throw falhaVigia('api-indisponivel', 'API de execuções da barreira indisponível');
    const execucoes = Array.isArray(runsBarreira.workflow_runs) ? runsBarreira.workflow_runs : [];
    if (!execucoes.length) throw falhaVigia('sem-execucao', 'nenhuma execução da barreira na main');
    const ultima = execucoes.slice().sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))[0];
    // Só busca os jobs quando há reprovação: um verde não precisa de detalhe e não gasta chamada.
    const jobs = ultima.conclusion === 'failure'
      ? ((await buscaJSON('https://api.github.com/repos/' + REPO + '/actions/runs/' + ultima.id + '/jobs').catch(() => ({}))).jobs || [])
      : [];
    const diagnostico = diagnosticoDaBarreira({
      conclusao: ultima.conclusion,
      sha: ultima.head_sha,
      runUrl: ultima.html_url,
      jobs
    });
    // 🕳️ Falha silenciosa que existiu de verdade: merge feito pelo robô não gera evento de
    // push, então a main andava sem execução nenhuma — e este item lia a última execução
    // antiga e verde, dizendo ✅. Agora a cabeça da main é comparada com as execuções.
    const cabeca = String((cabecaMain && cabecaMain.sha) || '');
    const quandoCabeca = Date.parse(String((cabecaMain && cabecaMain.commit && cabecaMain.commit.committer && cabecaMain.commit.committer.date) || ''));
    const testada = !cabeca || execucoes.some(r => String(r.head_sha || '') === cabeca);
    const minutos = Number.isFinite(quandoCabeca) ? (Date.now() - quandoCabeca) / 60000 : 0;
    // Carência de 45 min: execução recém-pedida pode ainda estar na fila. Depois disso, é pane.
    if (cabeca && !testada && minutos > 45) {
      throw falhaVigia('barreira-sem-execucao',
        'main em ' + cabeca.slice(0, 10) + ' há ' + Math.round(minutos) + ' min sem execução da barreira');
    }
    if (diagnostico.causa === 'saudavel') return sondaSaudavel(diagnostico.detalhe, diagnostico.evidencia);
    // Reprovação não é recuperável por aqui: reexecutar barreira vermelha é fingir conserto.
    throw falhaVigia(diagnostico.causa === 'barreira-vermelha' ? 'barreira-vermelha' : 'sem-execucao', diagnostico.detalhe);
  }));

  itens.push(await verifica('Chat por e-mail (24h)', async () => {
    if (!runsEmail) throw falhaVigia('api-indisponivel', 'API de execuções indisponível');
    const meus = runsEmail.workflow_runs;
    const vivos = meus.filter(r => r.status === 'in_progress');
    const naFila = meus.filter(r => r.status === 'queued' || r.status === 'pending');
    if (vivos.length > 1) {
      // Duas leituras reais em paralelo são incidente, não autorização para cancelar uma delas.
      // O estado sanitizado pede revisão humana; não abre log, não escolhe vencedor e não cria retry.
      throw falhaVigia('turnos-duplicados', 'mais de um turno em execução; aguardo revisão humana');
    }
    // O leitor não cria sucessor pré-enfileirado. Enquanto existe executor, a saúde é somente
    // "turno-ativo"; se sobrar fila sem executor, a próxima sonda a classifica como recente ou estagnada.
    if (vivos.length) return sondaSaudavel('turno ACORDADO agora', 'turno-ativo');
    // fila com NADA rodando: aí sim pode ser travamento (na corrente, esperar atrás de um turno vivo é normal)
    if (naFila.length) {
      const maisVelho = Math.max.apply(null, naFila.map(r => Date.now() - new Date(r.created_at).getTime()));
      const min = maisVelho / 60000;
      // Uma fila já congestionada não melhora com mais dispatches: registra e aguarda intervenção/normalização.
      if (min > 30) throw falhaVigia('fila-estagnada', 'turno na fila há ' + min.toFixed(0) + 'min SEM nada rodando');
      return sondaSaudavel('turno na fila há ' + min.toFixed(0) + 'min (nada rodando ainda)', 'fila-recente-sem-executor');
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
    return sondaSaudavel('turno recente há ' + (idade * 60).toFixed(0) + 'min', 'turno-recente');
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
    if (['in_progress', 'queued', 'pending'].includes(ult.status)) {
      return sondaSaudavel('bateria em andamento há ' + idade.toFixed(1) + 'h', 'bateria-em-andamento');
    }
    return sondaSaudavel('último exame há ' + idade.toFixed(1) + 'h', 'bateria-recem-executada');
  }));


  // 📱 REDES SOCIAIS: testa se cada credencial ainda responde (apenas leitura, sem modificar nada)
  itens.push(await verifica('GitHub API', async () => {
    if (!TOKEN) throw falhaVigia('rede-github', 'sem segredo GITHUB_TOKEN nesta execução');
    try {
      const r = await buscaJSON('https://api.github.com/user');
      if (r.login) return sondaSaudavel('usuário autenticado', 'rede-github-ok');
      throw new Error('sem campo login');
    } catch (e) {
      throw falhaVigia('rede-github', 'API indisponível ou token inválido: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('YouTube API', async () => {
    const key = process.env.YT_API_KEY;
    if (!key) throw falhaVigia('rede-youtube', 'sem segredo YT_API_KEY nesta execução');
    try {
      const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics&id=UCQdxKtfRnqNLd1ZOs9B6eaQ&key=' + key, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.items && j.items[0] && j.items[0].statistics) {
        const s = j.items[0].statistics;
        return sondaSaudavel('canal lido: ' + s.subscriberCount + ' inscritos, ' + s.videoCount + ' vídeos', 'rede-youtube-ok');
      }
      throw new Error('canal não encontrado');
    } catch (e) {
      throw falhaVigia('rede-youtube', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));


  itens.push(await verifica('Bluesky', async () => {
    const handle = process.env.BLUESKY_HANDLE;
    const senha = process.env.BLUESKY_APPPASS || process.env.BSKY_APP_PASSWORD;
    if (!handle || !senha) throw falhaVigia('rede-bluesky', 'sem BLUESKY_HANDLE ou BLUESKY_APPPASS');
    try {
      const r = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: handle, password: senha }),
        signal: AbortSignal.timeout(30000)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.did) return sondaSaudavel('login OK: ' + j.did.slice(0, 40), 'rede-bluesky-ok');
      throw new Error('sem DID');
    } catch (e) {
      throw falhaVigia('rede-bluesky', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('Mastodon', async () => {
    const token = process.env.MASTODON_TOKEN;
    if (!token) throw falhaVigia('rede-mastodon', 'sem segredo MASTODON_TOKEN');
    try {
      const r = await fetch('https://mastodon.social/api/v1/accounts/verify_credentials', { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.username) return sondaSaudavel('token válido: @' + j.username, 'rede-mastodon-ok');
      throw new Error('sem username');
    } catch (e) {
      throw falhaVigia('rede-mastodon', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('Instagram', async () => {
    const token = process.env.IG_TOKEN;
    if (!token) throw falhaVigia('rede-instagram', 'sem segredo IG_TOKEN');
    try {
      const r = await fetch('https://graph.instagram.com/v21.0/me?fields=id,username&access_token=' + token, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.username) return sondaSaudavel('token válido: @' + j.username, 'rede-instagram-ok');
      throw new Error('sem username');
    } catch (e) {
      throw falhaVigia('rede-instagram', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('Threads', async () => {
    const token = process.env.THREADS_TOKEN || process.env.THREADS_ACCESS_TOKEN;
    if (!token) throw falhaVigia('rede-threads', 'sem segredo THREADS_TOKEN');
    try {
      const r = await fetch('https://graph.threads.net/v1.0/me?fields=id,username&access_token=' + token, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.username) return sondaSaudavel('token válido: @' + j.username, 'rede-threads-ok');
      throw new Error('sem username');
    } catch (e) {
      throw falhaVigia('rede-threads', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('Discord', async () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) throw falhaVigia('rede-discord', 'sem segredo DISCORD_BOT_TOKEN');
    try {
      const r = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: 'Bot ' + token }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.username) return sondaSaudavel('bot válido: ' + j.username + '#' + j.discriminator, 'rede-discord-ok');
      throw new Error('sem username');
    } catch (e) {
      throw falhaVigia('rede-discord', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('dev.to', async () => {
    const key = process.env.DEVTO_API_KEY;
    if (!key) throw falhaVigia('rede-devto', 'sem segredo DEVTO_API_KEY');
    try {
      const r = await fetch('https://dev.to/api/articles/me/published', { headers: { 'api-key': key }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return sondaSaudavel('API key válida: ' + (Array.isArray(j) ? j.length + ' artigos' : 'sem lista'), 'rede-devto-ok');
    } catch (e) {
      throw falhaVigia('rede-devto', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('Tumblr', async () => {
    const key = process.env.TUMBLR_CONSUMER_KEY;
    if (!key) throw falhaVigia('rede-tumblr', 'sem segredo TUMBLR_CONSUMER_KEY');
    try {
      const r = await fetch('https://api.tumblr.com/v2/blog/reboclbrank.tumblr.com/info?api_key=' + key, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.meta && j.meta.status === 200 && j.response.blog) {
        return sondaSaudavel('consumer key válida: ' + j.response.blog.name, 'rede-tumblr-ok');
      }
      throw new Error('resposta inválida');
    } catch (e) {
      throw falhaVigia('rede-tumblr', 'erro: ' + String(e.message || e).slice(0, 80));
    }
  }));

  itens.push(await verifica('Nostr', async () => {
    const key = process.env.NOSTR_KEY;
    if (!key) throw falhaVigia('rede-nostr', 'sem segredo NOSTR_KEY');
    const npub = key.startsWith('npub1') ? 'npub válido' : 'não é npub';
    const hex = /^[0-9a-f]{64}$/.test(key) ? 'hex válido (64 chars)' : 'não é hex de 64 chars';
    return sondaSaudavel('chave com formato: ' + npub + ' · ' + hex, 'rede-nostr-ok');
  }));

  itens.push(await verifica('Gmail IMAP/SMTP', async () => {
    if (!USER || !PASS) throw falhaVigia('rede-gmail', 'sem credenciais GMAIL_CHAT_ADDR/PASS');
    let imap = null;
    try { imap = require('imapflow'); } catch (e) { throw falhaVigia('rede-gmail', 'imapflow ausente nesta execução'); }
    const cli = new imap.ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: USER, pass: PASS }, logger: false });
    let lock = null;
    try {
      await comTeto(cli.connect(), 45000, 'IMAP connect (rede)');
      lock = await comTeto(cli.getMailboxLock('INBOX'), 30000, 'INBOX lock (rede)');
      try {
        const uids = await comTeto(cli.search({ seen: false }), 30000, 'busca não lidos (rede)');
        return sondaSaudavel('conexão OK: ' + uids.length + ' email(s) não lido(s)', 'rede-gmail-ok');
      } finally { if (lock) lock.release(); }
    } finally { try { await comTeto(cli.logout(), 15000, 'logout IMAP (rede)'); } catch (e) { try { cli.close(); } catch (e2) {} } }
  }));

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
        if (!alvo.length) return sondaSaudavel('nada sem resposta', 'caixa-sem-pendencia');
        const m = await comTeto(cli.fetchOne(alvo[0], { envelope: true }), 30000, 'leitura do não lido');
        const quando = (m && m.envelope && m.envelope.date) ? new Date(m.envelope.date).getTime() : Date.now();
        const min = (Date.now() - quando) / 60000;
        if (min < 12) return sondaSaudavel(alvo.length + ' e-mail(s) recém-chegado(s) — o turno pega em instantes', 'caixa-recem-chegada');
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
    // Evidência é sempre um código fechado produzido nesta execução; detalhes transitórios
    // ficam somente no log do job e nunca entram no JSON público.
    const evidencia = it.ok ? evidenciaVigiaConhecida(it.evidencia) : '';
    novos[it.nome] = { ok: it.ok, falhas, causa };
    if (evidencia) novos[it.nome].evidencia = evidencia;
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
