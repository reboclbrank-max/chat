// 🚪 OS QUATRO PORTÕES do degrau 4 — critério com número, não com adjetivo.
//
// Portão 1 — a barreira merece ser o juiz?        (medido pelo termômetro)
// Portão 2 — o julgamento da máquina se sustenta?  (medido pelo modo sombra)
// Portão 3 — a faixa de código e a volta existem?  (lista + ensaio + reversão exercitada)
// Portão 4 — aguenta mais de um arquivo?           (só depois de um mês sem incidente)
//
// Nada aqui muda nível. O quadro serve para o dono decidir com número na mão — e para o
// vigia mostrar, de forma simples, se alguém subiu de nível sem os portões abertos.
'use strict';

const { LIBERADOS_PARA_DEGRAU_4 } = require('./risco-de-arquivo.js');
const { lerNivel } = require('./autonomia.js');

const CRITERIOS = Object.freeze({
  minimoDeRegistros: 30,
  // Histórico conta como evidência real — mas só o registro AO VIVO prova que o mecanismo
  // funciona hoje, com o código que está na main. Sem esse mínimo, o portão abriria com
  // uma fotografia do passado e nenhuma operação corrente.
  minimoAoVivo: 10,
  incidentesPermitidos: 0,
  // 05/11: aqui havia um `maximoDeArquivosNoPortao3: 2`. Ele tornava os portões 3 e 4
  // mutuamente exclusivos — o 3 exigia lista de no máximo 2, o 4 exigia pelo menos 3 — e
  // o 4 ainda exigia o 3 aberto. Resultado: o quadro nunca poderia chegar a 4 de 4, por
  // aritmética, não por falta de trabalho. O tamanho da lista pertence só ao portão 4;
  // o portão 3 cobra o que é dele: existir faixa, existir volta, existir prazo.
  minimoDeArquivosNoPortao4: 3,
  maximoDeArquivosNoPortao4: 5
});

function texto(valor) {
  return String(valor == null ? '' : valor).trim();
}

// O sombra anota o veredito no instante em que a barreira termina — antes do merge existir.
// Por isso a informação de merge é resolvida NA HORA DE LER, e não na hora de gravar.
// Sem isso o portão 2 olharia para o campo errado e abriria com zero evidência: um furo
// silencioso justamente na trava que protege o degrau 4.
function aplicarMerges(registros, pulls) {
  const porNumero = new Map();
  for (const p of Array.isArray(pulls) ? pulls : []) {
    if (p && p.number) porNumero.set(Number(p.number), p);
  }
  return (Array.isArray(registros) ? registros : []).map(r => {
    const p = porNumero.get(Number(r && r.pr));
    if (!p) return r;
    const mesclada = Boolean(p.merged_at);
    return Object.assign({}, r, {
      mesclada,
      mergeSha: mesclada ? (p.merge_commit_sha || r.mergeSha || null) : null
    });
  });
}

// Incidente = a main ficou vermelha exatamente num commit que o degrau 4 teria mesclado.
// É o único número que importa: o resto é opinião sobre a opinião.
function incidentesObservados({ registros, falhasNaMain } = {}) {
  const vermelhos = new Set((Array.isArray(falhasNaMain) ? falhasNaMain : []).map(s => texto(s).slice(0, 40)));
  const lista = (Array.isArray(registros) ? registros : []).filter(r => r && r.degrau4 && r.degrau4.decidiria === 'mesclar' && r.mergeSha);
  const atingidos = lista.filter(r => vermelhos.has(texto(r.mergeSha).slice(0, 40)));
  return { total: atingidos.length, casos: atingidos.map(r => ({ pr: r.pr, mergeSha: r.mergeSha })) };
}

function avaliaPortoes({ termometro, registros, falhasNaMain, autonomia, declarado } = {}) {
  const regs = Array.isArray(registros) ? registros : [];
  const declaracoes = declarado || {};
  const incidentes = incidentesObservados({ registros: regs, falhasNaMain });
  const nivel = (autonomia && autonomia.nivel) || 'desligado';

  const p1 = {
    numero: 1,
    nome: 'barreira confiável',
    aberto: Boolean(termometro && termometro.aprovado),
    porque: termometro && termometro.aprovado ? 'termômetro aprovado' : 'termômetro reprovado: ' + ((termometro && termometro.motivos) || ['sem medição']).join(' · ')
  };

  const faltasP2 = [];
  const aoVivo = regs.filter(r => (r.origem || 'ao-vivo') === 'ao-vivo').length;
  if (regs.length < CRITERIOS.minimoDeRegistros) faltasP2.push('poucos registros: ' + regs.length + ' de ' + CRITERIOS.minimoDeRegistros);
  if (aoVivo < CRITERIOS.minimoAoVivo) faltasP2.push('poucos registros ao vivo: ' + aoVivo + ' de ' + CRITERIOS.minimoAoVivo);
  if (incidentes.total > CRITERIOS.incidentesPermitidos) faltasP2.push('incidente(s) observado(s): ' + incidentes.total);
  const p2 = {
    numero: 2,
    nome: 'julgamento com evidência',
    aberto: faltasP2.length === 0,
    porque: faltasP2.length ? faltasP2.join(' · ') : regs.length + ' registros, nenhum incidente',
    numeros: { registros: regs.length, aoVivo, incidentes: incidentes.total }
  };

  const faltasP3 = [];
  if (!LIBERADOS_PARA_DEGRAU_4.length) faltasP3.push('lista de código liberado vazia');
  // A reversão vale por ter sido exercitada de PONTA A PONTA num repositório de verdade
  // (ensaio isolado), não por ter tido um incidente em produção. O que fica de fora é só o
  // gatilho (main vermelha num merge do mesclador) — e o pior caso dele já é coberto: o
  // vigia acusa barreira vermelha e avisa o dono, que é exatamente o degrau 3 de hoje.
  if (!declaracoes.reversaoExercitada && !declaracoes.reversaoExercitadaEmEnsaio) {
    faltasP3.push('reversão nunca exercitada de ponta a ponta');
  }
  if (!declaracoes.ensaioComPrazo) faltasP3.push('ensaio com prazo não preparado');
  const p3 = { numero: 3, nome: 'faixa de código e volta', aberto: faltasP3.length === 0, porque: faltasP3.length ? faltasP3.join(' · ') : 'faixa mínima e volta prontas' };

  const faltasP4 = [];
  if (!p3.aberto) faltasP4.push('portão 3 ainda fechado');
  if (LIBERADOS_PARA_DEGRAU_4.length < CRITERIOS.minimoDeArquivosNoPortao4) faltasP4.push('lista menor que ' + CRITERIOS.minimoDeArquivosNoPortao4 + ' arquivos');
  if (LIBERADOS_PARA_DEGRAU_4.length > CRITERIOS.maximoDeArquivosNoPortao4) faltasP4.push('lista maior que ' + CRITERIOS.maximoDeArquivosNoPortao4 + ' arquivos');
  if (!declaracoes.mesSemIncidente) faltasP4.push('ainda sem um mês sem incidente');
  const p4 = { numero: 4, nome: 'mais de um arquivo', aberto: faltasP4.length === 0, porque: faltasP4.length ? faltasP4.join(' · ') : 'lista maior liberada' };

  const portoes = [p1, p2, p3, p4];
  const abertos = portoes.filter(p => p.aberto).length;
  // O nível só é legítimo com os portões que ele exige abertos. Nível desconhecido = ilegítimo.
  const EXIGIDOS = { desligado: [], texto: [], codigo: [1, 2, 3] };
  const exigidos = EXIGIDOS[nivel];
  const nivelLegitimo = Array.isArray(exigidos) && exigidos.every(n => portoes[n - 1] && portoes[n - 1].aberto);
  return { portoes, abertos, total: portoes.length, nivel, nivelLegitimo, incidentes };
}

function linha(p) {
  return (p.aberto ? '✅' : '⛔') + ' portão ' + p.numero + ' — ' + p.nome + ': ' + p.porque;
}

// Junta tudo o que o quadro precisa: termômetro, registros do sombra e os fatos declarados.
// Exportado para o painel reaproveitar exatamente a mesma conta — duas contas diferentes
// para a mesma pergunta seria o começo do fim da confiança no número.
async function leituraCompleta({ token, repo, autonomia, execucoes, medido } = {}) {
  const { medir, avaliaTermometro } = require('./termometro-barreira.js');
  const medicao = medido || await medir({ token, repo });
  const termometro = avaliaTermometro({ execucoes: medicao.execucoes, passosFalhos: medicao.passosFalhos });

  const api = async (rota) => {
    const r = await fetch('https://api.github.com' + rota, {
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + token, 'User-Agent': 'portoes/1' },
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error(rota + ' -> HTTP ' + r.status);
    return r.json();
  };

  const { RAMO, PASTA } = require('./sombra.js');
  let registros = [];
  const itens = await api('/repos/' + repo + '/contents/' + PASTA + '?ref=' + encodeURIComponent(RAMO)).catch(() => null);
  if (Array.isArray(itens)) {
    for (const item of itens.slice(-200)) {
      const c = await api('/repos/' + repo + '/contents/' + item.path + '?ref=' + encodeURIComponent(RAMO)).catch(() => null);
      if (c && c.content) { try { registros.push(JSON.parse(Buffer.from(c.content, 'base64').toString('utf8'))); } catch (e) {} }
    }
  }
  const falhasNaMain = (medicao.execucoes || []).filter(e => e.conclusion === 'failure').map(e => e.head_sha).filter(Boolean);

  // Resolve o merge de cada PR registrada: o sombra grava antes do merge existir.
  let comMerge = registros;
  if (registros.length) {
    const numeros = [...new Set(registros.map(r => Number(r.pr)).filter(Boolean))].slice(0, 60);
    const pulls = [];
    for (const n of numeros) {
      const p = await api('/repos/' + repo + '/pulls/' + n).catch(() => null);
      if (p) pulls.push(p);
    }
    comMerge = aplicarMerges(registros, pulls);
  }

  return avaliaPortoes({ termometro, registros: comMerge, falhasNaMain, autonomia: autonomia || {}, declarado: (autonomia || {}).portoes || {} });
}

async function principal() {
  const token = texto(process.env.GITHUB_TOKEN);
  const repo = texto(process.env.REPO) || 'reboclbrank-max/chat';
  if (!token) throw new Error('falta GITHUB_TOKEN');

  const fs = require('fs');
  let autonomia = {};
  try { autonomia = JSON.parse(fs.readFileSync('autonomia.json', 'utf8')); } catch (e) { autonomia = lerNivel(null); }

  const quadro = await leituraCompleta({ token, repo, autonomia });
  console.log('🚪 Portões do degrau 4 — ' + quadro.abertos + '/' + quadro.total + ' abertos (nível atual: ' + quadro.nivel + ')');
  for (const p of quadro.portoes) console.log('   ' + linha(p));
  if (quadro.incidentes.total) console.log('   ⚠️ incidentes observados: ' + quadro.incidentes.casos.map(c => '#' + c.pr).join(', '));
  process.exitCode = quadro.abertos === quadro.total ? 0 : 2;
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ portões não concluíram: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = { CRITERIOS, aplicarMerges, incidentesObservados, avaliaPortoes, leituraCompleta };
