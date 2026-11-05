// 🖥️ PAINEL DA CASA — uma revisão inteira em um comando (leitura pura).
//
// "Acompanhar tudo" só vale se for repetível: este painel junta num lugar só o que hoje
// exige abrir cinco abas — o estado da casa publicado pelo vigia, os ciclos da barreira,
// o nível de autonomia, os quatro portões, o que o modo sombra viu e a higiene do
// repositório (PRs abertas, ramos).
//
// Ele NÃO conserta, NÃO decide e NÃO escreve nada. Só mostra. A decisão continua sendo
// de quem lê — e é por isso que cada linha vem com o motivo ao lado.
'use strict';

function texto(valor) {
  return String(valor == null ? '' : valor).trim();
}

function pct(n) {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 1000) / 10).toFixed(1) + '%';
}

// Função pura: recebe os dados já coletados e devolve o texto do painel.
function montarPainel(dados = {}) {
  const d = dados || {};
  const linhas = [];

  // 1. Casa
  linhas.push('🖥️  PAINEL DA CASA');
  linhas.push('   main: ' + (texto(d.main).slice(0, 12) || '(desconhecida)'));

  const execs = Array.isArray(d.barreira && d.barreira.execucoes) ? d.barreira.execucoes : [];
  const verdes = execs.filter(e => e && e.conclusion === 'success').length;
  const vermelhas = execs.filter(e => e && e.conclusion === 'failure').length;
  const medidas = verdes + vermelhas;
  linhas.push('   barreira (últimos ciclos): ' + (medidas ? verdes + ' verdes · ' + vermelhas + ' vermelhas · verde em ' + pct(medidas ? verdes / medidas : NaN) : 'sem dado'));

  const turno = d.turno || {};
  if (turno.status) linhas.push('   turno de e-mail: ' + texto(turno.status) + (turno.desde ? ' desde ' + texto(turno.desde) : ''));

  // 2. Estado publicado pelo vigia
  const itens = d.vigia && d.vigia.itens ? d.vigia.itens : {};
  const nomes = Object.keys(itens);
  if (nomes.length) {
    const falhas = nomes.filter(n => itens[n] && itens[n].ok === false);
    linhas.push('');
    linhas.push('   vigia: ' + (nomes.length - falhas.length) + '/' + nomes.length + ' itens ok' + (d.vigia.verificado_em ? ' · verificado em ' + texto(d.vigia.verificado_em) : ''));
    for (const n of nomes) {
      const item = itens[n] || {};
      const marca = item.ok === false ? '❌' : '✅';
      // Evidência específica primeiro ('barreira-verde', 'autonomia-texto'); 'saudavel' é genérico.
      const motivo = texto(item.evidencia || item.causa || '');
      linhas.push('     ' + marca + ' ' + n + (motivo ? ' — ' + motivo : ''));
    }
  }

  // 3. Autonomia e portões
  const autonomia = d.autonomia || {};
  const portoes = d.portoes || {};
  linhas.push('');
  linhas.push('   autonomia: nível ' + (texto(autonomia.nivel) || 'desconhecido'));
  if (Array.isArray(portoes.portoes) && portoes.portoes.length) {
    linhas.push('   portões: ' + (portoes.abertos || 0) + '/' + (portoes.total || portoes.portoes.length) + ' abertos');
    for (const p of portoes.portoes) {
      linhas.push('     ' + (p.aberto ? '✅' : '⛔') + ' ' + p.numero + '. ' + texto(p.nome) + ' — ' + texto(p.porque));
    }
  }

  // 4. Sombra
  const sombra = d.sombra || {};
  if (Number.isFinite(Number(sombra.total)) && Number(sombra.total) >= 0 && d.sombra) {
    linhas.push('');
    linhas.push('   sombra: ' + Number(sombra.total) + ' registro(s) · o degrau 4 teria mesclado ' + Number(sombra.mesclariaDegrau4 || 0) + ' · barradas por essencial ' + Number(sombra.bloqueadasPorEssencial || 0));
  }

  // 5. Higiene
  const higiene = d.higiene || {};
  linhas.push('');
  linhas.push('   higiene: ' + (Number.isFinite(Number(higiene.pullsAbertas)) ? Number(higiene.pullsAbertas) : '—') + ' PR(s) aberta(s) · '
    + (Number.isFinite(Number(higiene.ramos)) ? Number(higiene.ramos) : '—') + ' ramo(s)');

  // 6. Pendências: o que está diferente de "tudo certo"
  const pendencias = [];
  for (const n of nomes) {
    const item = itens[n] || {};
    if (item.ok === false) pendencias.push(n + ' (' + texto(item.causa || 'sem causa') + ')');
  }
  if (Array.isArray(portoes.portoes)) {
    for (const p of portoes.portoes) if (!p.aberto) pendencias.push('portão ' + p.numero + ': ' + texto(p.porque));
  }
  if (!d.sombra || Number(d.sombra.total) === 0) pendencias.push('sombra sem registro ainda');
  if (pendencias.length) {
    linhas.push('');
    linhas.push('   ⚠️ pendências (' + pendencias.length + '):');
    for (const p of pendencias.slice(0, 12)) linhas.push('     · ' + p);
  } else {
    linhas.push('');
    linhas.push('   ✨ nada pendente');
  }

  return linhas.join('\n');
}

// ---- rede (só o CLI usa) ----------------------------------------------------------
async function principal() {
  const token = texto(process.env.GITHUB_TOKEN);
  const repo = texto(process.env.REPO) || 'reboclbrank-max/chat';
  if (!token) throw new Error('falta GITHUB_TOKEN (o painel só lê)');
  const api = async (rota, cru = false) => {
    const r = await fetch('https://api.github.com' + rota, {
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token, 'User-Agent': 'painel/1' },
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error(rota + ' -> HTTP ' + r.status);
    return cru ? r.text() : r.json();
  };

  const dados = {};
  dados.main = (await api('/repos/' + repo + '/branches/main')).commit.sha;
  dados.barreira = { execucoes: (await api('/repos/' + repo + '/actions/workflows/testes-rapidos.yml/runs?branch=main&per_page=12')).workflow_runs.map(r => ({ conclusion: r.conclusion, created_at: r.created_at, head_sha: r.head_sha })) };

  const turnos = (await api('/repos/' + repo + '/actions/workflows/email.yml/runs?per_page=3')).workflow_runs;
  const ativo = turnos.find(r => r.status === 'in_progress');
  dados.turno = ativo ? { status: 'em andamento', desde: ativo.created_at } : { status: (turnos[0] && (turnos[0].status + ' ' + (turnos[0].conclusion || ''))) || 'sem execução' };

  dados.vigia = await api('/repos/' + repo + '/contents/vigia-estado.json?ref=estado/operacional').then(x => JSON.parse(Buffer.from(x.content, 'base64').toString('utf8'))).catch(() => ({}));

  const fs = require('fs');
  dados.autonomia = await Promise.resolve().then(() => { try { return JSON.parse(fs.readFileSync('autonomia.json', 'utf8')); } catch (e) { return {}; } });

  // Portões e sombra: reaproveita os módulos já provados.
  try {
    const { leituraCompleta } = require('./portoes.js');
    if (typeof leituraCompleta === 'function') dados.portoes = await leituraCompleta({ token, repo, autonomia: dados.autonomia, execucoes: dados.barreira.execucoes });
  } catch (e) {
    dados.portoes = {};
  }
  try {
    const { RAMO, PASTA, resumoDoRegistro } = require('./sombra.js');
    const itens = await api('/repos/' + repo + '/contents/' + PASTA + '?ref=' + encodeURIComponent(RAMO)).catch(() => null);
    if (Array.isArray(itens)) {
      const registros = [];
      for (const item of itens.slice(-200)) {
        const c = await api('/repos/' + repo + '/contents/' + item.path + '?ref=' + encodeURIComponent(RAMO)).catch(() => null);
        if (c && c.content) { try { registros.push(JSON.parse(Buffer.from(c.content, 'base64').toString('utf8'))); } catch (e) {} }
      }
      dados.sombra = resumoDoRegistro(registros);
    } else {
      dados.sombra = { total: 0, mesclariaDegrau4: 0, bloqueadasPorEssencial: 0 };
    }
  } catch (e) {
    dados.sombra = { total: 0, mesclariaDegrau4: 0, bloqueadasPorEssencial: 0 };
  }

  dados.higiene = {
    pullsAbertas: (await api('/repos/' + repo + '/pulls?state=open&per_page=100').catch(() => [])).length,
    ramos: (await api('/repos/' + repo + '/branches?per_page=100').catch(() => [])).length
  };

  console.log(montarPainel(dados));
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ painel não concluiu: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = { montarPainel };
