// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 DASHBOARD DE MARKETING AVANÇADO
// Gera dados para o dashboard HTML com métricas em tempo real, gráficos,
// alertas, funil de conversão, sazonalidade e recomendações automáticas.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const aprendizado = require('./auto-correcao-aprendizado');
const raciocinio = require('./raciocinio-marketing-avancado');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GERAR DADOS DO DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function gerarDadosDashboard() {
  const dados = raciocinio.carregarDados();
  const aprend = aprendizado.carregar();
  const resumo = raciocinio.resumoMetricas();
  const estatApr = aprendizado.estatisticasAprendizado();

  // Calcular totais
  const totalInscritos = dados.inscritos.length > 0
    ? dados.inscritos[dados.inscritos.length - 1].valor : 0;
  const totalDownloads = dados.downloads.reduce((s, d) => s + d.valor, 0);
  const totalCliques = dados.cliques.reduce((s, d) => s + d.valor, 0);
  const totalImpressoes = dados.impressoes.reduce((s, d) => s + d.valor, 0);
  const totalReceita = dados.receita.reduce((s, d) => s + d.valor, 0);
  const totalHoras = dados.gastosTempo.reduce((s, d) => s + d.valor, 0);

  // Calcular CTR
  const ctr = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(2) : 0;

  // Calcular taxa de conversão (downloads ÷ cliques)
  const conversao = totalCliques > 0 ? ((totalDownloads / totalCliques) * 100).toFixed(2) : 0;

  // Calcular CAC (se houver horas e downloads recentes)
  const cac = totalHoras > 0 && totalDownloads > 0
    ? (totalHoras * 0 / totalDownloads).toFixed(2) // valor hora = 0 (voluntário)
    : 0;

  // Alertas
  const alertas = [];

  // Verificar queda de downloads
  if (dados.downloads.length >= 2) {
    const ultimos = dados.downloads.slice(-2);
    const anterior = ultimos[0].valor;
    const atual = ultimos[1].valor;
    if (atual < anterior * 0.9) {
      const quedaPct = ((anterior - atual) / anterior * 100).toFixed(1);
      alertas.push({
        tipo: 'queda',
        severidade: quedaPct > 30 ? 'alta' : 'media',
        mensagem: `Downloads caíram ${quedaPct}% no último período`,
        acao: 'Revisar estratégia de postagem e conteúdo',
      });
    }
  }

  // Verificar CTR baixo
  if (totalImpressoes > 100 && parseFloat(ctr) < 2) {
    alertas.push({
      tipo: 'ctr_baixo',
      severidade: 'media',
      mensagem: `CTR está em ${ctr}% (abaixo de 2%)`,
      acao: 'Revisar chamadas para ação e imagens dos posts',
    });
  }

  // Verificar churn alto
  if (dados.churn.length > 0) {
    const ultimoChurn = dados.churn[dados.churn.length - 1];
    if (ultimoChurn.valor > 10) {
      alertas.push({
        tipo: 'churn_alto',
        severidade: 'alta',
        mensagem: `Churn em ${ultimoChurn.valor.toFixed(1)}%`,
        acao: 'Criar campanha de reativação para usuários inativos',
      });
    }
  }

  // Verificar pouca atividade
  if (totalHoras === 0) {
    alertas.push({
      tipo: 'inatividade',
      severidade: 'baixa',
      mensagem: 'Nenhuma hora de trabalho registrada',
      acao: 'Começar a registrar tempo gasto em marketing',
    });
  }

  // Recomendações baseadas no aprendizado
  const recomendacoes = [];

  // Melhor horário por rede
  for (const rede of Object.keys(aprend.horarioPorDesempenho || {})) {
    const melhor = aprendizado.melhorHorarioParaRede(rede);
    if (melhor) {
      recomendacoes.push({
        tipo: 'horario',
        rede,
        mensagem: `Melhor horário para ${rede}: ${melhor.horario} (${melhor.engajamentoMedio.toFixed(1)} engajamento médio)`,
      });
    }
  }

  // Melhor tom por sentimento
  for (const sentimento of Object.keys(aprend.tomPorSentimento || {})) {
    const melhor = aprendizado.melhorTomParaSentimento(sentimento);
    if (melhor) {
      recomendacoes.push({
        tipo: 'tom',
        sentimento,
        mensagem: `Para sentimento ${sentimento}, use tom ${melhor.tom} (${Math.round(melhor.taxaSucesso * 100)}% sucesso)`,
      });
    }
  }

  // Melhor modelo por intenção
  for (const intencao of Object.keys(aprend.modeloPorIntencao || {})) {
    const melhor = aprendizado.melhorModeloParaIntencao(intencao);
    if (melhor) {
      recomendacoes.push({
        tipo: 'modelo',
        intencao,
        mensagem: `Para intenção ${intencao}, use modelo ${melhor.modelo} (${Math.round(melhor.taxaAcerto * 100)}% acerto)`,
      });
    }
  }

  // Palavras bloqueadas recentes
  const palavrasBloqueadas = (aprend.palavrasBloqueadas || [])
    .filter(p => p.ocorrencias > 1)
    .map(p => p.palavra);
  if (palavrasBloqueadas.length > 0) {
    recomendacoes.push({
      tipo: 'palavras',
      mensagem: `Evite estas palavras: ${palavrasBloqueadas.join(', ')}`,
    });
  }

  // Conteúdo que funciona
  const conteudoTop = (aprend.conteudoQueFunciona || [])
    .slice(-5)
    .map(c => c.texto);

  // Sazonalidade
  const sazonalidade = {};
  for (const metrica of ['downloads', 'inscritos', 'cliques']) {
    const s = raciocinio.analisarSazonalidade(metrica, 'mes');
    if (s.dados) {
      sazonalidade[metrica] = { melhor: s.dados.melhor, pior: s.dados.pior };
    }
  }

  return {
    geradoEm: new Date().toISOString(),
    resumo: {
      totalInscritos,
      totalDownloads,
      totalCliques,
      totalImpressoes,
      totalReceita,
      totalHoras,
      ctr: parseFloat(ctr),
      conversao: parseFloat(conversao),
      cac: parseFloat(cac),
    },
    alertas,
    recomendacoes,
    conteudoTop,
    sazonalidade,
    estatisticasAprendizado: estatApr,
    metricasPorTipo: resumo,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SALVAR DADOS DO DASHBOARD EM ARQUIVO JSON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function salvarDashboard(dados) {
  const arquivo = path.join(MARKETING_DIR, 'dashboard-dados.json');
  try {
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), 'utf8');
    return { ok: true, arquivo };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GERAR HTML DO DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function gerarHTMLDashboard(dados) {
  const alertasHtml = dados.alertas.map(a => `
    <div class="alerta alerta-${a.severidade}">
      <strong>${a.tipo.toUpperCase()}:</strong> ${a.mensagem}<br>
      <em>Ação: ${a.acao}</em>
    </div>
  `).join('') || '<div class="alerta alerta-baixa">Nenhum alerta no momento ✅</div>';

  const recomendacoesHtml = dados.recomendacoes.map(r => `
    <div class="recomendacao">
      <strong>${r.tipo.toUpperCase()}:</strong> ${r.mensagem}
    </div>
  `).join('') || '<div class="recomendacao">Nenhuma recomendação ainda — comece a usar o chat para gerar dados.</div>';

  const conteudoHtml = dados.conteudoTop.map(c => `
    <div class="conteudo-top">${c}</div>
  `).join('') || '<div class="conteudo-top">Nenhum conteúdo registrado ainda.</div>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard de Marketing — Rebocl</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0e0e11; color: #e0e0e0; padding: 20px; }
  h1 { color: #00d4aa; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
  .card { background: #1a1a2e; border: 1px solid #333; border-radius: 12px; padding: 15px; }
  .card h3 { color: #00d4aa; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; }
  .card .valor { font-size: 32px; font-weight: bold; color: #ffffff; }
  .card .sub { font-size: 12px; color: #888; margin-top: 5px; }
  .section { margin-bottom: 30px; }
  .section h2 { color: #ffffff; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #00d4aa; padding-bottom: 5px; }
  .alerta { padding: 12px; border-radius: 8px; margin-bottom: 10px; }
  .alerta-alta { background: #8b1a1a; color: #ffffff; border: 1px solid #b71c1c; }
  .alerta-media { background: #8a6d1a; color: #ffffff; border: 1px solid #f57f17; }
  .alerta-baixa { background: #1a4d2e; color: #ffffff; border: 1px solid #2e7d32; }
  .recomendacao { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .recomendacao strong { color: #00d4aa; }
  .conteudo-top { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 10px; margin-bottom: 8px; font-style: italic; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
  .sazonal-card { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 15px; }
  .sazonal-card h4 { color: #00d4aa; margin-bottom: 8px; }
  .atualizado { font-size: 12px; color: #888; margin-top: 20px; }
</style>
</head>
<body>
<h1>📊 Dashboard de Marketing — Rebocl</h1>

<div class="grid">
  <div class="card">
    <h3>Inscritos</h3>
    <div class="valor">${dados.resumo.totalInscritos.toLocaleString('pt-BR')}</div>
    <div class="sub">total acumulado</div>
  </div>
  <div class="card">
    <h3>Downloads</h3>
    <div class="valor">${dados.resumo.totalDownloads.toLocaleString('pt-BR')}</div>
    <div class="sub">total acumulado</div>
  </div>
  <div class="card">
    <h3>Cliques</h3>
    <div class="valor">${dados.resumo.totalCliques.toLocaleString('pt-BR')}</div>
    <div class="sub">em links UTM</div>
  </div>
  <div class="card">
    <h3>Impressões</h3>
    <div class="valor">${dados.resumo.totalImpressoes.toLocaleString('pt-BR')}</div>
    <div class="sub">visualizações de posts</div>
  </div>
  <div class="card">
    <h3>CTR</h3>
    <div class="valor">${dados.resumo.ctr.toFixed(2)}%</div>
    <div class="sub">cliques ÷ impressões</div>
  </div>
  <div class="card">
    <h3>Conversão</h3>
    <div class="valor">${dados.resumo.conversao.toFixed(2)}%</div>
    <div class="sub">downloads ÷ cliques</div>
  </div>
  <div class="card">
    <h3>CAC</h3>
    <div class="valor">R$ ${dados.resumo.cac.toFixed(2)}</div>
    <div class="sub">custo por usuário</div>
  </div>
  <div class="card">
    <h3>Horas Trabalho</h3>
    <div class="valor">${dados.resumo.totalHoras.toFixed(1)}</div>
    <div class="sub">registradas</div>
  </div>
</div>

<div class="section">
  <h2>🚨 Alertas</h2>
  ${alertasHtml}
</div>

<div class="section">
  <h2>💡 Recomendações</h2>
  ${recomendacoesHtml}
</div>

<div class="section">
  <h2>🏆 Conteúdo que Funciona</h2>
  ${conteudoHtml}
</div>

<div class="section grid-2">
  <div class="sazonal-card">
    <h4>📅 Sazonalidade — Downloads</h4>
    ${dados.sazonalidade.downloads ? `Melhor: <strong>${dados.sazonalidade.downloads.melhor}</strong><br>Pior: <strong>${dados.sazonalidade.downloads.pior}</strong>` : 'Sem dados suficientes'}</div>
  <div class="sazonal-card">
    <h4>📅 Sazonalidade — Inscritos</h4>
    ${dados.sazonalidade.inscritos ? `Melhor: <strong>${dados.sazonalidade.inscritos.melhor}</strong><br>Pior: <strong>${dados.sazonalidade.inscritos.pior}</strong>` : 'Sem dados suficientes'}</div>
</div>

<div class="atualizado">
  Gerado em ${new Date(dados.geradoEm).toLocaleString('pt-BR')} | 
  <a href="dashboard.html" style="color: #00d4aa;">Ver dashboard estático</a>
</div>
</body>
</html>`;
}

module.exports = {
  gerarDadosDashboard,
  salvarDashboard,
  gerarHTMLDashboard,
  MARKETING_DIR,
};