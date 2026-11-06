// Fluxo isolado do vigia: uma pane simultânea de turno/caixa não pode virar rajada de dispatches.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '../..');
const fonte = fs.readFileSync(path.join(raiz, 'tools/vigia-casa.js'), 'utf8');
const estadoVigia = require('../vigia-estado');

async function executa(estadoInicial, configuracao = {}) {
  const escritos = [];
  const dispatches = [];
  const logs = [];
  const agora = new Date().toISOString();
  const token = Object.prototype.hasOwnProperty.call(configuracao, 'token') ? configuracao.token : 'controle-inerte';
  const emailRuns = Object.prototype.hasOwnProperty.call(configuracao, 'emailRuns') ? configuracao.emailRuns : [];
  const exameRuns = Object.prototype.hasOwnProperty.call(configuracao, 'exameRuns') ? configuracao.exameRuns : [{ created_at: agora }];
  const sitePostRuns = Object.prototype.hasOwnProperty.call(configuracao, 'sitePostRuns') ? configuracao.sitePostRuns :
    [{ status: 'completed', conclusion: 'success', event: 'schedule', created_at: agora, updated_at: agora }];
  const resposta = (corpo = {}, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
    text: async () => 'x'.repeat(100001)
  });
  const fetchFalso = async (url, requisicao = {}) => {
    if (/\/dispatches$/.test(url)) {
      dispatches.push({ url, metodo: requisicao.method, corpo: requisicao.body });
      return resposta({}, 204);
    }
    if (url === 'https://reboclbrank-max.github.io/chat/') return resposta();
    if (url === 'https://reboclbrank-max.github.io/site/') return resposta();
    if (url.includes('/repos/reboclbrank-max/site/commits?')) {
      return resposta([{ commit: { committer: { date: agora } } }]);
    }
    if (url.includes('/repos/reboclbrank-max/site/actions/workflows/postagem-diaria.yml/runs?')) {
      return resposta({ workflow_runs: sitePostRuns });
    }
    // O estado do workflow do postador é lido separadamente do histórico de execuções:
    // desligado à mão não é a mesma coisa que atrasado.
    if (/\/repos\/reboclbrank-max\/site\/actions\/workflows\/postagem-diaria\.yml$/.test(url)) {
      const estado = Object.prototype.hasOwnProperty.call(configuracao, 'estadoPostador')
        ? configuracao.estadoPostador : 'active';
      if (estado === null) throw new Error('estado do postador indisponível no isolamento');
      return resposta({ state: estado, id: 1 });
    }
    if (url.includes('/actions/workflows/testes-rapidos.yml/runs?')) {
      const barreira = Object.prototype.hasOwnProperty.call(configuracao, 'barreiraRuns')
        ? configuracao.barreiraRuns
        : [{ id: 900, status: 'completed', conclusion: 'success', head_sha: 'abc1234def',
             html_url: 'https://exemplo/run/900', created_at: agora }];
      if (barreira === null) throw new Error('API da barreira indisponível no isolamento');
      return resposta({ workflow_runs: barreira });
    }
    if (/\/repos\/reboclbrank-max\/chat\/commits\/main$/.test(url)) {
      // Por padrão a cabeça da main é a mesma da execução já configurada: cenário saudável.
      const cabeca = Object.prototype.hasOwnProperty.call(configuracao, 'cabecaMain')
        ? configuracao.cabecaMain : { sha: 'abc1234def', quando: agora };
      if (cabeca === null) throw new Error('cabeça da main indisponível no isolamento');
      return resposta({ sha: cabeca.sha, commit: { committer: { date: cabeca.quando || agora } } });
    }
    if (/\/actions\/runs\/\d+\/jobs$/.test(url)) {
      return resposta({ jobs: configuracao.barreiraJobs || [] });
    }
    if (url.includes('/actions/workflows/email.yml/runs?')) {
      if (configuracao.falhaApiEmail) throw new Error('API de e-mail indisponível no isolamento');
      return resposta({ workflow_runs: emailRuns });
    }
    if (url.includes('/actions/workflows/evolucao.yml/runs?')) {
      if (configuracao.falhaApiExame) throw new Error('API de exame indisponível no isolamento');
      return resposta({ workflow_runs: exameRuns });
    }
    if (/rebocl-brank\.itch\.io\/(ceifalume|prancheta)$/.test(url)) return resposta();
    throw new Error('URL inesperada no isolamento: ' + url);
  };
  const fsFalso = {
    readFileSync: (arquivo) => (arquivo === 'autonomia.json'
      ? JSON.stringify(Object.prototype.hasOwnProperty.call(configuracao, 'autonomia') ? configuracao.autonomia : { nivel: 'texto' })
      : JSON.stringify(estadoInicial)),
    writeFileSync: (_arquivo, conteudo) => {
      if (configuracao.falhaEscrita) throw new Error('persistência indisponível no isolamento');
      escritos.push(JSON.parse(conteudo));
    }
  };
  const processo = { env: { GITHUB_TOKEN: token }, argv: [] };
  const contexto = {
    require: (nome) => {
      if (nome === 'fs') return fsFalso;
      if (nome === './vigia-estado') return estadoVigia;
      if (nome === './socorro') return require('../socorro');
      // O item de autonomia lê autonomia.json pelo fs falso; a leitura é pura, sem rede.
      if (nome === './autonomia') return require('../autonomia');
      if (nome === './risco-de-arquivo') return require('../risco-de-arquivo');
      // O teste deliberadamente não fornece SMTP/IMAP: a caixa falha de modo controlado.
      if (nome === 'nodemailer') throw new Error('nodemailer indisponível no isolamento');
      if (nome === 'imapflow') throw new Error('imapflow não deve ser carregado sem credenciais');
      throw new Error('require inesperado: ' + nome);
    },
    process: processo,
    fetch: fetchFalso,
    AbortSignal,
    Date,
    JSON,
    Math,
    Object,
    String,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    console: { log: (...a) => logs.push(a.map(String).join(' ')), warn: () => {}, error: () => {} }
  };
  const resultado = vm.runInNewContext(fonte, contexto, { filename: 'vigia-casa-isolado.js' });
  await Promise.resolve(resultado);
  return { escritos, dispatches, logs, exitCode: processo.exitCode };
}

(async () => {
  const inicial = { verificado_em: '2026-10-19T00:00:00.000Z', itens: {} };
  const primeira = await executa(inicial);
  assert.equal(primeira.dispatches.length, 1, 'turno e caixa falhos devem gerar só um dispatch');
  assert.match(primeira.dispatches[0].url, /\/email\.yml\/dispatches$/);
  assert.equal(primeira.dispatches[0].metodo, 'POST');
  assert.equal(primeira.escritos.length, 1, 'primeira tentativa deve persistir o freio');
  const aposPrimeira = primeira.escritos[0];
  assert.deepEqual(Object.keys(aposPrimeira.recuperacoes || {}), ['email']);
  assert.match(aposPrimeira.recuperacoes.email.ultima_tentativa_em, /^\d{4}-\d\d-\d\dT/);
  assert.equal(aposPrimeira.itens['Casa postando (site)'].evidencia, 'postagem-agendada-recente',
    'sucesso recente do workflow só vira evidência técnica fechada');

  const estadoCorrompido = await executa(null);
  assert.equal(estadoCorrompido.exitCode, undefined, 'estado público inválido deve ser reconstruído, não derrubar o vigia');
  assert.equal(estadoCorrompido.escritos.length, 1, 'estado reconstruído deve gerar nova fotografia');
  assert.equal(estadoCorrompido.escritos[0].itens['Página do chat'].ok, true);

  const semToken = await executa(inicial, { token: '' });
  assert.equal(semToken.dispatches.length, 0, 'sem token não há dispatch a fingir como recuperação');
  assert.equal(semToken.escritos.length, 1, 'a falha ainda fica observável sem token');
  assert.equal(Object.prototype.hasOwnProperty.call(semToken.escritos[0], 'recuperacoes'), false,
    'freio só é gravado depois de tentativa real de dispatch');

  const execucaoFalha = await executa(inicial, {
    emailRuns: [{ status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() }]
  });
  assert.equal(execucaoFalha.dispatches.length, 0, 'execução concluída com falha não recebe re-dispatch cego');
  assert.equal(execucaoFalha.escritos[0].itens['Chat por e-mail (24h)'].causa, 'execucao-falhou');
  assert.equal(Object.prototype.hasOwnProperty.call(execucaoFalha.escritos[0], 'recuperacoes'), false);

  const duplicados = await executa(inicial, {
    emailRuns: [
      { status: 'in_progress', created_at: new Date().toISOString() },
      { status: 'in_progress', created_at: new Date().toISOString() }
    ]
  });
  assert.equal(duplicados.dispatches.length, 0, 'turnos duplicados não são cancelados, reiniciados ou substituídos');
  assert.equal(duplicados.escritos[0].itens['Chat por e-mail (24h)'].causa, 'turnos-duplicados');
  assert.equal(Object.prototype.hasOwnProperty.call(duplicados.escritos[0], 'recuperacoes'), false,
    'duplicidade não entra na família automática de recuperação');

  // Postador desligado À MÃO: não é atraso, não é pane e não se religa sozinho.
  const desligadoAMao = await executa(inicial, {
    estadoPostador: 'disabled_manually',
    sitePostRuns: [{ status: 'completed', conclusion: 'success', event: 'schedule',
      created_at: '2026-11-03T08:41:37Z', updated_at: '2026-11-03T08:41:37Z' }]
  });
  const itemPostador = desligadoAMao.escritos[0].itens['Casa postando (site)'];
  assert.equal(itemPostador.causa, 'postador-desligado',
    'postador desligado à mão precisa de causa própria, não de "postagem atrasada"');
  assert(desligadoAMao.dispatches.every(d => /\/email\.yml\/dispatches$/.test(d.url)),
    'postador desligado à mão não gera dispatch próprio: só o turno (família recuperável) é re-disparado');

  const postadorAtivoAtrasado = await executa(inicial, {
    estadoPostador: 'active',
    sitePostRuns: [{ status: 'completed', conclusion: 'success', event: 'schedule',
      created_at: '2026-11-01T08:41:37Z', updated_at: '2026-11-01T08:41:37Z' }]
  });
  assert.equal(postadorAtivoAtrasado.escritos[0].itens['Casa postando (site)'].causa, 'postagem-atrasada',
    'atraso de verdade, com workflow ativo, continua sendo atraso');

  // Barreira verde: vira evidência técnica, sem alarme.
  const barreiraVerde = await executa(inicial);
  assert.equal(barreiraVerde.escritos[0].itens['Barreira de testes (main)'].ok, true);
  assert.equal(barreiraVerde.escritos[0].itens['Barreira de testes (main)'].evidencia, 'barreira-verde');

  // Barreira vermelha: causa própria, com o passo que caiu — e nenhum re-disparo cego.
  const barreiraVermelha = await executa(inicial, {
    barreiraRuns: [{ id: 901, status: 'completed', conclusion: 'failure', head_sha: 'abcdef1234',
      html_url: 'https://exemplo/run/901', created_at: new Date().toISOString() }],
    barreiraJobs: [{ name: 'testes', conclusion: 'failure', steps: [
      { name: 'Navegador controlado (quatro rotas, desktop e mobile)', conclusion: 'failure' }] }]
  });
  const itemBarreira = barreiraVermelha.escritos[0].itens['Barreira de testes (main)'];
  assert.equal(itemBarreira.causa, 'barreira-vermelha');
  assert(barreiraVermelha.dispatches.every(d => /\/email\.yml\/dispatches$/.test(d.url)),
    'barreira vermelha não gera dispatch próprio: reexecutar barreira vermelha seria fingir conserto');

  const apiIndisponivel = await executa(inicial, { falhaApiEmail: true });
  assert.equal(apiIndisponivel.dispatches.length, 0, 'API indisponível não autoriza dispatch às cegas');
  assert.equal(apiIndisponivel.escritos[0].itens['Chat por e-mail (24h)'].causa, 'api-indisponivel');

  const filaEstagnada = await executa(inicial, {
    emailRuns: [{ status: 'queued', created_at: new Date(Date.now() - 31 * 60 * 1000).toISOString() }]
  });
  assert.equal(filaEstagnada.dispatches.length, 0, 'fila congestionada não recebe mais trabalho automaticamente');
  assert.equal(filaEstagnada.escritos[0].itens['Chat por e-mail (24h)'].causa, 'fila-estagnada');

  const postadorAtrasado = await executa(inicial, {
    sitePostRuns: [{ status: 'completed', conclusion: 'success', created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() }]
  });
  assert.equal(postadorAtrasado.escritos[0].itens['Casa postando (site)'].causa, 'postagem-atrasada');
  assert.equal(postadorAtrasado.dispatches.some(d => /reboclbrank-max\/site\//.test(d.url)), false,
    'cadência atrasada fica explícita, sem tentar publicar ou despachar o site');

  const postadorFalhou = await executa(inicial, {
    sitePostRuns: [
      { status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() },
      { status: 'completed', conclusion: 'success', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() }
    ]
  });
  assert.equal(postadorFalhou.escritos[0].itens['Casa postando (site)'].causa, 'execucao-falhou');
  assert.equal(postadorFalhou.dispatches.some(d => /reboclbrank-max\/site\//.test(d.url)), false,
    'falha do postador também não autoriza recuperação cega');

  const falhaExame = await executa(inicial, {
    emailRuns: [{ status: 'in_progress', created_at: new Date().toISOString() }],
    exameRuns: [{ status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() }]
  });
  assert.equal(falhaExame.dispatches.length, 0, 'bateria que falhou não recebe re-dispatch cego');
  assert.equal(falhaExame.escritos[0].itens['Bateria do cérebro'].causa, 'execucao-falhou');

  const segunda = await executa(aposPrimeira);
  assert.equal(segunda.dispatches.length, 0, 'segunda sonda dentro do intervalo não pode re-disparar');
  assert.equal(segunda.escritos.length, 1, 'segunda falha só consolida o limiar 2/2');
  const aposSegunda = segunda.escritos[0];
  assert.equal(aposSegunda.itens['Chat por e-mail (24h)'].falhas, 2);
  assert.equal(aposSegunda.itens['Caixa de e-mail'].falhas, 2);

  const terceira = await executa(aposSegunda);
  assert.equal(terceira.dispatches.length, 0, 'pane persistente continua contida');
  assert.equal(terceira.escritos.length, 0, 'estado 2/2 estável não deve gerar commit a cada 15 min');

  const persistenciaFalha = await executa(inicial, { falhaEscrita: true });
  assert.equal(persistenciaFalha.exitCode, 1, 'falha fatal de persistência deve reprovar o workflow');
  console.log('✔ fluxo isolado contém recuperação duplicada, ruído, dispatch cego e falso verde fatal');

  // Degrau 4 no vigia: o nível alto é cobrado pela FORMA do que foi ligado, e o prazo manda.
  const itemAutonomia = (r) => r.escritos[0].itens['Autonomia (nível)'];

  const altoComPrazo = await executa(inicial, {
    autonomia: { nivel: 'codigo', desde: '2026-11-05', expira_em: '2026-12-05' }
  });
  assert.equal(itemAutonomia(altoComPrazo).ok, true, 'nível código com prazo e faixa não é falha');
  assert.equal(itemAutonomia(altoComPrazo).evidencia, 'autonomia-codigo');
  // O detalhe fica no LOG do job (por desenho, não no JSON público): é lá que se verifica.
  const linhaAutonomia = altoComPrazo.logs.find((l) => /Autonomia \(nível\)/.test(l)) || '';
  // O número vem da faixa REAL: escrever "1 arquivo" aqui seria espelhar o mundo, e o
  // teste passaria a reprovar no dia em que a faixa crescer (foi o que aconteceu em 06/11).
  const naFaixa = require('../risco-de-arquivo').LIBERADOS_PARA_DEGRAU_4.length;
  assert.match(linhaAutonomia, new RegExp(naFaixa + ' arquivo\\(s\\) na faixa'),
    'o log mostra quanto está ligado, em número');
  assert.match(linhaAutonomia, /prazo até 2026-12-05/, 'e até quando — a data aparece no log');
  assert.equal(Object.prototype.hasOwnProperty.call(itemAutonomia(altoComPrazo), 'detalhe'), false,
    'detalhe não vaza para o JSON público');

  const altoSemPrazo = await executa(inicial, { autonomia: { nivel: 'codigo' } });
  assert.equal(itemAutonomia(altoSemPrazo).ok, false, 'nível código sem prazo precisa acusar');
  assert.equal(itemAutonomia(altoSemPrazo).causa, 'autonomia-sem-prazo');
  assert.ok(!itemAutonomia(altoSemPrazo).recuperavel,
    'forma errada de configuração avisa no estado, não acorda o dono de madrugada');
  assert.equal(altoSemPrazo.dispatches.filter((d) => /email\.yml/.test(d.url)).length,
    primeira.dispatches.filter((d) => /email\.yml/.test(d.url)).length,
    'e não inventa recuperação: configuração errada não se conserta sozinha');

  const prazoVencido = await executa(inicial, {
    autonomia: { nivel: 'codigo', expira_em: '2026-01-01' }
  });
  assert.equal(itemAutonomia(prazoVencido).ok, true, 'prazo vencido não é falha: a casa já voltou a ficar desligada');
  assert.equal(itemAutonomia(prazoVencido).evidencia, 'autonomia-desligada');
  assert.equal(prazoVencido.dispatches.filter((d) => /email\.yml/.test(d.url)).length,
    primeira.dispatches.filter((d) => /email\.yml/.test(d.url)).length,
    'expirar o prazo não inventa recuperação de e-mail');
  assert.equal(itemAutonomia(prazoVencido).causa, 'saudavel', 'prazo vencido é o sistema funcionando');

  // 🕳️ A pane silenciosa de 06/11: main anda sem execução da barreira e o painel diz ✅.
  const itemBarreiraDe = (r) => r.escritos[0].itens['Barreira de testes (main)'];
  const duasHorasAtras = new Date(Date.now() - 120 * 60000).toISOString();

  const semExecucao = await executa(inicial, {
    cabecaMain: { sha: 'fora000000', quando: duasHorasAtras }
  });
  assert.equal(itemBarreiraDe(semExecucao).ok, false, 'main sem execução da barreira precisa acusar');
  assert.equal(itemBarreiraDe(semExecucao).causa, 'barreira-sem-execucao',
    'causa própria: "sem-execucao" é outra coisa (barreira nunca rodou)');

  const recemPedida = await executa(inicial, {
    cabecaMain: { sha: 'fora000000', quando: new Date().toISOString() }
  });
  assert.equal(itemBarreiraDe(recemPedida).ok, true,
    'commit recente tem carência: a execução pode estar na fila');

  const testada = await executa(inicial, { cabecaMain: { sha: 'abc1234def', quando: duasHorasAtras } });
  assert.equal(itemBarreiraDe(testada).ok, true, 'cabeça que TEM execução não é falha, mesmo antiga');

  console.log('✔ nível alto no vigia: prazo manda, faixa é contada, forma errada é cobrada');
  console.log('✔ main sem execução da barreira é pane, e tem carência para a fila');

  // Contrato estático: causa sem texto no e-mail do dono é diagnóstico que não informa.
  // Foi assim que quatro causas novas ficaram mudas — o status dizia "diagnóstico sanitizado
  // indisponível", que é o mesmo que não dizer nada.
  const fonteVigia = fs.readFileSync(path.join(raiz, 'tools/vigia-casa.js'), 'utf8');
  const fonteEmail = fs.readFileSync(path.join(raiz, 'tools/email-chat.js'), 'utf8');
  const bloco = fonteVigia.match(/const CAUSAS_VIGIA = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(bloco, 'não achei a lista de causas do vigia');
  const causas = [...bloco[1].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  assert.ok(causas.length >= 12, 'a lista de causas parece truncada: ' + causas.length);
  const mapaEmail = fonteEmail.match(/const CAUSAS_STATUS_CASA = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(mapaEmail, 'não achei o mapa de causas do e-mail de status');
  const mudas = causas.filter(c => c !== 'saudavel' && !new RegExp("['\"]?" + c + "['\"]?\\s*:").test(mapaEmail[1]));
  assert.deepEqual(mudas, [], 'causas que o dono veria como "diagnóstico indisponível": ' + mudas.join(', '));
  console.log('✔ ' + (causas.length - 1) + ' causas do vigia têm texto no e-mail de status');
})().catch((erro) => {
  console.error('✘ fluxo isolado da recuperação — ' + (erro && (erro.stack || erro.message) || erro));
  process.exitCode = 1;
});
