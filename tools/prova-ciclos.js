// Mede o critério do degrau D1 ("confiável") da escada de autonomia:
// o turno cobre o tempo sem perder trabalho e sem rodar duas vezes.
//
// Só LÊ a lista de execuções (GET). Não dispara, não escreve, não toca na caixa.
//
//   node tools/prova-ciclos.js                 (mede as últimas 120 execuções)
//   node tools/prova-ciclos.js --horas 168     (janela em horas)
//   node tools/prova-ciclos.js --json          (saída para máquina)
//
// O que ele NÃO prova: que o turno duplicado não aconteceu. Sobreposição de execuções
// é indício; a prova de turno duplo está no registro de mensagens do próprio turno.
'use strict';

const REPO = 'reboclbrank-max/chat';
const WORKFLOW = 'email.yml';

// O critério do degrau é 100 ciclos. Abaixo disso, qualquer conclusão é sobre amostra curta.
const MINIMO_DE_CICLOS = 100;
// Fila do GitHub cria intervalos curtos entre turnos; abaixo disso o buraco é rotina, não perda.
const BURACO_RELEVANTE_MIN = 10;
// Dois turnos vivos ao mesmo tempo são o risco que a reserva existe para evitar.
const SOBREPOSICAO_RELEVANTE_MIN = 5;
const ESTADOS_EM_ANDAMENTO = new Set(['queued', 'pending', 'in_progress', 'waiting', 'requested']);

function tempo(valor) {
  const t = new Date(valor || '').getTime();
  return Number.isFinite(t) ? t : null;
}

// Um ciclo é uma execução do turno com começo legível. Sem começo não se mede cobertura:
// entra na conta como "ilegível" em vez de virar zero silencioso.
function intervalos(runs) {
  const validos = [];
  let ilegiveis = 0;
  for (const run of Array.isArray(runs) ? runs : []) {
    const inicio = tempo(run && (run.run_started_at || run.created_at));
    const fim = tempo(run && run.updated_at);
    if (inicio === null || fim === null || fim < inicio) { ilegiveis++; continue; }
    validos.push({
      id: String(run.id),
      inicio,
      fim,
      segundos: Math.round((fim - inicio) / 1000),
      event: String(run.event || ''),
      status: String(run.status || ''),
      conclusion: run.conclusion ? String(run.conclusion) : null,
      emAndamento: ESTADOS_EM_ANDAMENTO.has(String(run.status || ''))
    });
  }
  validos.sort((a, b) => a.inicio - b.inicio);
  return { validos, ilegiveis };
}

function uniao(lista) {
  const trechos = [];
  for (const item of lista) {
    if (trechos.length && item.inicio <= trechos[trechos.length - 1].fim) {
      trechos[trechos.length - 1].fim = Math.max(trechos[trechos.length - 1].fim, item.fim);
    } else {
      trechos.push({ inicio: item.inicio, fim: item.fim });
    }
  }
  return trechos;
}

function buracos(lista, minimoMin = BURACO_RELEVANTE_MIN) {
  const trechos = uniao(lista);
  const achados = [];
  for (let i = 1; i < trechos.length; i++) {
    const minutos = Math.round((trechos[i].inicio - trechos[i - 1].fim) / 60000);
    if (minutos >= minimoMin) {
      achados.push({ de: new Date(trechos[i - 1].fim).toISOString(), ate: new Date(trechos[i].inicio).toISOString(), minutos });
    }
  }
  return achados;
}

// Indício de turno duplo: duas execuções ativas ao mesmo tempo por mais que o limite.
// A reserva e o grupo de concorrência existem justamente para impedir isto.
function sobreposicoes(lista, minimoMin = SOBREPOSICAO_RELEVANTE_MIN) {
  const achados = [];
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      if (lista[j].inicio >= lista[i].fim) break;
      const minutos = Math.round((Math.min(lista[i].fim, lista[j].fim) - lista[j].inicio) / 60000);
      if (minutos >= minimoMin) {
        achados.push({ a: lista[i].id, b: lista[j].id, minutos });
      }
    }
  }
  return achados;
}

function resumo(runs, opcoes = {}) {
  const minimo = Number.isFinite(opcoes.minimoDeCiclos) ? opcoes.minimoDeCiclos : MINIMO_DE_CICLOS;
  const { validos, ilegiveis } = intervalos(runs);
  const trechos = uniao(validos);
  const cobertos = trechos.reduce((soma, t) => soma + (t.fim - t.inicio), 0);
  const primeiro = trechos.length ? trechos[0].inicio : 0;
  const ultimo = trechos.length ? trechos[trechos.length - 1].fim : 0;
  const janela = ultimo > primeiro ? ultimo - primeiro : 0;
  const listaBuracos = buracos(validos);
  const listaSobrepostos = sobreposicoes(validos);

  const razoes = [];
  if (validos.length < minimo) razoes.push('só ' + validos.length + ' ciclos medidos (critério: ' + minimo + ')');
  if (ilegiveis) razoes.push(ilegiveis + ' execução(ões) sem começo/fim legível');
  if (listaBuracos.length) razoes.push(listaBuracos.length + ' buraco(s) de ' + BURACO_RELEVANTE_MIN + ' min ou mais');
  if (listaSobrepostos.length) razoes.push(listaSobrepostos.length + ' sobreposição(ões) de ' + SOBREPOSICAO_RELEVANTE_MIN + ' min ou mais');

  return {
    ciclos: validos.length,
    ilegiveis,
    janela_horas: janela ? Number((janela / 3600000).toFixed(1)) : 0,
    cobertura_pct: janela ? Math.round((cobertos / janela) * 100) : 0,
    horas_cobertas: Number((cobertos / 3600000).toFixed(1)),
    maior_ciclo_min: validos.reduce((m, i) => Math.max(m, i.segundos), 0) / 60,
    buracos: listaBuracos,
    sobreposicoes: listaSobrepostos,
    veredito: razoes.length ? (validos.length >= minimo ? 'parcial' : 'insuficiente') : 'cumprido',
    razoes
  };
}

// A execução inteira pode ficar horas "em andamento" por fila; o que interessa é o job
// do turno, que é quem lê a caixa. Sobreposição de execuções sem olhar o job acusa
// turno duplo onde só houve reserva esperando — por isso a medida boa é por job.
function intervaloDoTurno(run, jobs) {
  const doTurno = (Array.isArray(jobs) ? jobs : []).find(job => job && job.name === 'turno');
  if (!doTurno) return null;
  const inicio = tempo(doTurno.started_at) || tempo(run && (run.run_started_at || run.created_at));
  const fim = tempo(doTurno.completed_at) || tempo(run && run.updated_at);
  if (inicio === null || fim === null || fim < inicio) return null;
  return Object.assign({}, run, {
    run_started_at: new Date(inicio).toISOString(),
    updated_at: new Date(fim).toISOString(),
    status: doTurno.status || (run && run.status),
    conclusion: doTurno.conclusion || (run && run.conclusion)
  });
}

async function buscaJobs(runId, token) {
  const cabecalhos = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'prova-ciclos/1' };
  if (token) cabecalhos.Authorization = 'Bearer ' + token;
  const resposta = await fetch('https://api.github.com/repos/' + REPO + '/actions/runs/' + runId + '/jobs',
    { headers: cabecalhos, signal: AbortSignal.timeout(30000) });
  if (!resposta.ok) return null;
  const corpo = await resposta.json();
  return Array.isArray(corpo.jobs) ? corpo.jobs : null;
}

async function buscaRuns(horas, token) {
  const desde = new Date(Date.now() - horas * 3600000).toISOString();
  const url = 'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW
    + '/runs?per_page=100&created=>=' + encodeURIComponent(desde);
  const cabecalhos = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'prova-ciclos/1' };
  if (token) cabecalhos.Authorization = 'Bearer ' + token;
  const resposta = await fetch(url, { headers: cabecalhos, signal: AbortSignal.timeout(30000) });
  if (!resposta.ok) throw new Error('leitura das execuções recusada (HTTP ' + resposta.status + ')');
  const corpo = await resposta.json();
  return Array.isArray(corpo.workflow_runs) ? corpo.workflow_runs : [];
}

async function principal() {
  const args = process.argv.slice(2);
  const horas = Number((args[args.indexOf('--horas') + 1] || '').trim()) || 168;
  const json = args.includes('--json');
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const runs = await buscaRuns(horas, token);
  const semJob = [];
  const porJob = [];
  for (const run of runs) {
    const jobs = await buscaJobs(run.id, token);
    const doTurno = jobs ? intervaloDoTurno(run, jobs) : null;
    if (doTurno) porJob.push(doTurno); else semJob.push(run.id);
  }
  const base = porJob.length ? porJob : runs;
  const resultado = resumo(base, { minimoDeCiclos: MINIMO_DE_CICLOS });
  resultado.medido_por_job = porJob.length;
  resultado.execucoes_sem_job_turno = semJob.length;
  if (json) { console.log(JSON.stringify(resultado, null, 1)); return; }
  console.log('📏 Prova de ciclos do turno · janela pedida: ' + horas + ' h');
  console.log('   medida por job do turno: ' + resultado.medido_por_job + ' de ' + (resultado.medido_por_job + resultado.execucoes_sem_job_turno) + ' execuções');
  console.log('   ciclos medidos: ' + resultado.ciclos + ' (critério ' + MINIMO_DE_CICLOS + ')');
  console.log('   janela real: ' + resultado.janela_horas + ' h · cobertura: ' + resultado.cobertura_pct + '%'
    + ' (' + resultado.horas_cobertas + ' h cobertas)');
  console.log('   maior ciclo: ' + Math.round(resultado.maior_ciclo_min) + ' min');
  console.log('   buracos ≥ ' + BURACO_RELEVANTE_MIN + ' min: ' + resultado.buracos.length
    + (resultado.buracos.length ? ' → ' + resultado.buracos.map(b => b.minutos + 'min').join(', ') : ''));
  console.log('   sobreposições ≥ ' + SOBREPOSICAO_RELEVANTE_MIN + ' min: ' + resultado.sobreposicoes.length);
  console.log('   veredito D1: ' + resultado.veredito + (resultado.razoes.length ? ' — ' + resultado.razoes.join(' · ') : ''));
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ prova de ciclos não concluiu: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = { intervalos, uniao, buracos, sobreposicoes, resumo, intervaloDoTurno, MINIMO_DE_CICLOS };
