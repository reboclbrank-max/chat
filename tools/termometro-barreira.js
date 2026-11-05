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
    corrigido: false,
    observacao: 'falha intermitente de Chromium/Workspace; reprova a barreira sem defeito real no chat'
  }
]);

const LIMITES = Object.freeze({
  minimoDeExecucoes: 20,
  taxaVerdeMinima: 0.9,
  concentracaoMaximaDoPasso: 0.4, // um passo só não pode explicar quase toda a falha
  janelaRecente: 10,             // estabilidade atual
  falhasRecentesPermitidas: 0
});

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
  const falhas = execucoes.filter(e => e.conclusion === 'failure').slice(0, maxFalhasDetalhadas);
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

module.exports = { LIMITES, INSTABILIDADES_CONHECIDAS, avaliaTermometro, medir };
