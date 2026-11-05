// 🌡️ TERMÔMETRO DA BARREIRA — a prova que falta antes de qualquer degrau 4.
//
// Degrau 4 significa: a máquina mescla código sem ninguém olhar. Isso só é defensável se
// a barreira de testes for CONFIÁVEL — porque ela passa a ser o único juiz. Barreira que
// falha por instabilidade é pior que barreira nenhuma: ela reprova o bom e aprova o ruim.
//
// Este módulo mede, com dado real, três coisas:
//   1. com que frequência a barreira fica verde na main;
//   2. se alguma falha se concentra num passo só (sintoma de teste instável, não de defeito);
//   3. se ela está estável AGORA (últimas execuções), não só no histórico antigo.
//
// Saída: aprovado / reprovado, com os números que sustentam a resposta. Não decide nada
// sozinho: só mede. Quem sobe de nível é gente.
'use strict';

// Instabilidades CONHECIDAS. Elas não podem "envelhecer" e sair da conta: uma janela
// deslizante esquece a falha antiga e transforma alívio em aprovação. Aqui a pendência é
// nominal e só sai da lista quando alguém marca `corrigido: true` — ato humano, com o
// conserto no arquivo citado. Sem isso, o degrau 4 fica travado por definição.
const INSTABILIDADES_CONHECIDAS = Object.freeze([
  {
    passo: 'Navegador controlado (quatro rotas, desktop e mobile)',
    arquivo: 'tools/testes/navegador-lista-controlado.sh',
    corrigido: true,
    corrigido_em: '2026-11-05',
    evidencia: 'janela de 11 execuções na main desde a correção do lançador (05/11 07:00 UTC), zero falha',
    observacao: '9 execuções vermelhas desde 16/10; última em 30/10. Correção de causa raiz em '
      + 'tools/testes/cdp.js (perfil próprio por tentativa), provada por navegador falso em '
      + 'cdp-recuperacao-navegador.js'
  },
  {
    passo: 'Testes rápidos (IMAP, SMTP e motores falsos)',
    arquivo: 'tools/testes/navegador-csp.js',
    corrigido: true,
    corrigido_em: '2026-11-05',
    evidencia: 'janela de 11 execuções na main desde a correção do lançador (05/11 07:00 UTC), zero falha',
    observacao: '20 execuções vermelhas desde 16/10; última em 05/11 na main (4435028b1a4d), com o '
      + 'log navegador não abriu porta de depuração (dbus/bus.cc). Causa achada em 05/11: perfil de '
      + 'navegador reusado entre tentativas. Se voltar a falhar, a entrada precisa voltar a false'
  }
]);

const LIMITES = Object.freeze({
  minimoDeExecucoes: 20,
  taxaVerdeMinima: 0.9,
  concentracaoMaximaDoPasso: 0.4, // um passo só não pode explicar quase toda a falha
  janelaRecente: 10,             // estabilidade atual
  falhasRecentesPermitidas: 0
});

// Quando é que uma instabilidade pendente pode ser marcada como corrigida?
// Não é quando "já faz tempo". É quando existe janela observada DEPOIS da correção, com
// número mínimo de execuções e zero falha. Isto aqui calcula essa janela para a pessoa
// não decidir no chute — e para a pendência não sair da lista por envelhecimento.
const CORRECAO_DO_NAVEGADOR_EM = '2026-11-05T07:00:00Z';
function evidenciaDeCorrecao({ execucoes, desde, minimo = 10 } = {}) {
  const marco = Date.parse(String(desde || CORRECAO_DO_NAVEGADOR_EM));
  // Só entra execução que de fato rodou até o fim. Uma execução cancelada não prova nada:
  // contá-la como evidência seria inflar a janela com o que não foi medido (achado ao vivo
  // em 05/11, quando um grupo de concorrência cancelou uma execução no meio da contagem).
  const lista = (Array.isArray(execucoes) ? execucoes : [])
    .filter(e => e && (e.conclusion === 'success' || e.conclusion === 'failure'))
    .filter(e => Number.isFinite(Date.parse(String(e.created_at))) && Date.parse(e.created_at) >= marco);
  const falhas = lista.filter(e => e.conclusion === 'failure').length;
  return {
    desde: new Date(marco).toISOString(),
    execucoesDesde: lista.length,
    falhas,
    minimo,
    suficiente: lista.length >= minimo && falhas === 0
  };
}

// Quais execuções merecem inspeção de passo. Só as da JANELA RECENTE: a pergunta é
// "existe passo instável agora?", não "qual passo mais falhou desde outubro". Usar o
// histórico inteiro mantinha o degrau 4 travado por falhas que já tinham sido corrigidas.
function execucoesParaInspecionar({ execucoes, janela } = {}) {
  const lista = (Array.isArray(execucoes) ? execucoes : [])
    .filter(e => e && (e.conclusion === 'success' || e.conclusion === 'failure'))
    .slice()
    .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
  return lista.slice(0, Number(janela) || 10);
}

function pct(n) {
  return (Math.round(n * 1000) / 10).toFixed(1) + '%';
}

// Função pura: recebe execuções e passos que falharam; devolve veredito com números.
// execucoes: [{ conclusion, created_at }]
// passosFalhos: { 'nome do passo': quantidadeDeExecucoesEmQueFalhou }
function avaliaTermometro({ execucoes, passosFalhos, limites, instabilidades } = {}) {
  const L = Object.assign({}, LIMITES, limites || {});
  const lista = (Array.isArray(execucoes) ? execucoes : []).filter(e => e && (e.conclusion === 'success' || e.conclusion === 'failure'));
  const total = lista.length;
  const verdes = lista.filter(e => e.conclusion === 'success').length;
  const vermelhos = total - verdes;
  const taxa = total ? verdes / total : 0;
  const motivos = [];

  if (total < L.minimoDeExecucoes) motivos.push('histórico curto: ' + total + ' execuções (mínimo ' + L.minimoDeExecucoes + ')');
  if (taxa < L.taxaVerdeMinima) motivos.push('barreira verde em ' + pct(taxa) + ' (mínimo ' + pct(L.taxaVerdeMinima) + ')');

  const ordenadas = lista.slice().sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
  const recentes = ordenadas.slice(0, L.janelaRecente);
  const falhasRecentes = recentes.filter(e => e.conclusion === 'failure').length;
  if (recentes.length >= 5 && falhasRecentes > L.falhasRecentesPermitidas) {
    motivos.push(falhasRecentes + ' falha(s) nas últimas ' + recentes.length + ' execuções (permitido: ' + L.falhasRecentesPermitidas + ')');
  }

  const mapa = passosFalhos && typeof passosFalhos === 'object' ? passosFalhos : {};
  const entradas = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  const totalDeFalhasDePasso = entradas.reduce((soma, [, n]) => soma + Number(n || 0), 0);
  const dominante = entradas.length ? entradas[0] : null;
  const concentracao = dominante && totalDeFalhasDePasso > 0 ? Number(dominante[1]) / totalDeFalhasDePasso : 0;
  if (dominante && concentracao > L.concentracaoMaximaDoPasso) {
    motivos.push('passo concentra ' + pct(concentracao) + ' das falhas: ' + dominante[0]);
  }

  const pendentes = (Array.isArray(instabilidades) ? instabilidades : INSTABILIDADES_CONHECIDAS)
    .filter(i => i && !i.corrigido);
  for (const p of pendentes) {
    motivos.push('instabilidade conhecida não corrigida: ' + p.passo + ' (' + p.arquivo + ')');
  }

  return {
    aprovado: motivos.length === 0,
    instabilidadesPendentes: pendentes.map(p => p.passo),
    motivos,
    numeros: { total, verdes, vermelhos, taxaVerde: taxa, falhasRecentes, janelaRecente: recentes.length, passoDominante: dominante ? dominante[0] : null, concentracao }
  };
}

// ---- rede (só o CLI usa) ----------------------------------------------------------
async function api(rota, token) {
  const resposta = await fetch('https://api.github.com' + rota, {
    headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token, 'User-Agent': 'termometro-barreira/1' },
    signal: AbortSignal.timeout(30000)
  });
  if (!resposta.ok) throw new Error(rota + ' -> HTTP ' + resposta.status);
  return resposta.json();
}

async function medir({ token, repo = 'reboclbrank-max/chat', quantas = 60, maxFalhasDetalhadas = 8 } = {}) {
  const dados = await api('/repos/' + repo + '/actions/workflows/testes-rapidos.yml/runs?branch=main&per_page=' + quantas, token);
  const execucoes = (dados.workflow_runs || []).map(r => ({ conclusion: r.conclusion, created_at: r.created_at, id: r.id }));
  const passosFalhos = {};
  const naJanela = execucoesParaInspecionar({ execucoes, janela: LIMITES.janelaRecente });
  const falhas = naJanela.filter(e => e.conclusion === 'failure').slice(0, maxFalhasDetalhadas);
  for (const falha of falhas) {
    const jobs = (await api('/repos/' + repo + '/actions/runs/' + falha.id + '/jobs', token).catch(() => ({ jobs: [] }))).jobs || [];
    for (const job of jobs) {
      for (const passo of job.steps || []) {
        if (passo.conclusion === 'failure') passosFalhos[passo.name] = (passosFalhos[passo.name] || 0) + 1;
      }
    }
  }
  return { execucoes, passosFalhos, detalhadas: falhas.length };
}

async function principal() {
  const token = String(process.env.GITHUB_TOKEN || '').trim();
  if (!token) throw new Error('falta GITHUB_TOKEN (o termômetro só lê)');
  const medido = await medir({ token, repo: String(process.env.REPO || 'reboclbrank-max/chat').trim() });
  const veredito = avaliaTermometro({ execucoes: medido.execucoes, passosFalhos: medido.passosFalhos });
  const n = veredito.numeros;
  console.log('🌡️  Termômetro da barreira (main)');
  console.log('   execuções medidas: ' + n.total + ' · verdes ' + n.verdes + ' · vermelhas ' + n.vermelhos + ' · verde em ' + pct(n.taxaVerde));
  console.log('   falhas nas últimas ' + n.janelaRecente + ': ' + n.falhasRecentes);
  if (n.passoDominante) console.log('   passo que mais reprova: ' + n.passoDominante + ' (' + pct(n.concentracao) + ' das falhas)');
  console.log('   detalhe de ' + medido.detalhadas + ' falha(s) inspecionada(s)');
  const evidencia = evidenciaDeCorrecao({ execucoes: medido.execucoes });
  console.log('   evidência para marcar a instabilidade como corrigida: ' + evidencia.execucoesDesde + '/' + evidencia.minimo
    + ' execuções desde ' + evidencia.desde.slice(0, 10) + ', ' + evidencia.falhas + ' falha(s)'
    + (evidencia.suficiente ? ' → já dá para marcar corrigido' : ' → ainda não'));
  console.log(veredito.aprovado
    ? '   ✅ barreira confiável para o degrau 4'
    : '   ⛔ degrau 4 NÃO liberado:\n     - ' + veredito.motivos.join('\n     - '));
  if (!veredito.aprovado) process.exitCode = 2;
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ termômetro não concluiu: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = { LIMITES, INSTABILIDADES_CONHECIDAS, CORRECAO_DO_NAVEGADOR_EM, avaliaTermometro, evidenciaDeCorrecao, execucoesParaInspecionar, medir };
