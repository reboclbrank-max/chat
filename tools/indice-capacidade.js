// Placar observável de capacidade — não mede "QI" e não inventa inteligência humana.
// Consolida sinais verificáveis do próprio Chat para orientar melhoria contínua gratuita.
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const agora = () => new Date().toISOString();
const existe = nome => fs.existsSync(path.join(RAIZ, nome));
function le(nome, padrao = '') { try { return fs.readFileSync(path.join(RAIZ, nome), 'utf8'); } catch (e) { return padrao; } }
function leJson(nome, padrao = {}) { try { return JSON.parse(le(nome)); } catch (e) { return padrao; } }
function limita(n, min, max) { return Math.max(min, Math.min(max, Math.round(n))); }

function bateria(texto) {
  const pontos = [...String(texto || '').matchAll(/—\s*(\d+)\/(\d+)\s*\(mudos:\s*(\d+)\)/g)].slice(0, 5)
    .map(m => ({ certo: Number(m[1]), total: Number(m[2]), mudos: Number(m[3]) }));
  if (!pontos.length) return { media: 0, amostras: 0, mudos: 0 };
  return {
    media: pontos.reduce((s, x) => s + (x.total ? x.certo / x.total : 0), 0) / pontos.length,
    amostras: pontos.length,
    mudos: pontos.reduce((s, x) => s + x.mudos, 0)
  };
}

function frescor(iso, minutos, referencia = Date.now()) {
  const quando = Date.parse(iso || '');
  const agoraMs = typeof referencia === 'number' ? referencia : Date.parse(referencia);
  if (!Number.isFinite(quando) || !Number.isFinite(agoraMs)) return false;
  return agoraMs - quando <= minutos * 60 * 1000 && quando <= agoraMs + 5 * 60 * 1000;
}

// O histórico rico impede que várias execuções da mesma amostra pareçam provas independentes.
// Para substituir a curva legada, exige três amostras diferentes, 30 respostas e cobertura de 20 questões.
function qualidadeRastreavel(historico, referencia = Date.now()) {
  const agoraMs = typeof referencia === 'number' ? referencia : Date.parse(referencia);
  const bruto = Array.isArray(historico && historico.baterias) ? historico.baterias : [];
  const vistos = new Set();
  const elegiveis = bruto
    .filter(r => r && typeof r.amostra === 'string' && Array.isArray(r.ids) && r.ids.length > 0 && Number.isFinite(Number(r.total)) && Number.isFinite(Number(r.certos)))
    .map(r => Object.assign({}, r, { ms: Date.parse(r.quando || '') }))
    .filter(r => Number.isFinite(r.ms) && Number.isFinite(agoraMs) && r.ms <= agoraMs + 5 * 60 * 1000 && agoraMs - r.ms <= 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.ms - a.ms)
    .filter(r => {
      if (vistos.has(r.amostra)) return false;
      vistos.add(r.amostra);
      return Number(r.total) > 0 && Number(r.certos) >= 0 && Number(r.certos) <= Number(r.total);
    })
    .slice(0, 5);
  const total = elegiveis.reduce((s, r) => s + Number(r.total), 0);
  const certos = elegiveis.reduce((s, r) => s + Number(r.certos), 0);
  const mudos = elegiveis.reduce((s, r) => s + Math.max(0, Number(r.mudos) || 0), 0);
  const cobertura = new Set(elegiveis.flatMap(r => r.ids.map(String))).size;
  const recente = elegiveis[0];
  const valida = elegiveis.length >= 3 && total >= 30 && cobertura >= 20 && !!recente && frescor(recente.quando, 26 * 60, agoraMs);
  return {
    valida,
    media: total ? certos / total : 0,
    amostras: elegiveis.length,
    respostas: total,
    cobertura,
    mudos,
    recente: recente ? recente.quando : null
  };
}

function dimensao(nome, maximo, pontos, evidencia, comoMelhorar) {
  return { nome, maximo, pontos: limita(pontos, 0, maximo), evidencia, comoMelhorar };
}

function avaliar(entrada = {}) {
  const referencia = entrada.agora || agora();
  const vigia = entrada.vigia || leJson('vigia-estado.json');
  const saude = entrada.saude === undefined ? le('saude-cerebro.md') : entrada.saude;
  const historicoQualidade = entrada.qualidade === undefined ? leJson('qualidade-historico.json') : entrada.qualidade;
  const itens = Object.values(vigia.itens || {});
  const bons = itens.filter(x => x && x.ok).length;
  const totalItens = itens.length;
  const taxaVigia = totalItens ? bons / totalItens : 0;
  const legado = bateria(saude);
  const rastreavel = qualidadeRastreavel(historicoQualidade, referencia);
  const qualidade = rastreavel.valida
    ? { media: rastreavel.media, amostras: rastreavel.amostras, mudos: rastreavel.mudos, evid: `${rastreavel.amostras} amostras rastreáveis, ${rastreavel.cobertura} questões distintas, média ${(rastreavel.media * 100).toFixed(0)}%, ${rastreavel.mudos} rota(s) muda(s)` }
    : { media: legado.media, amostras: legado.amostras, mudos: legado.mudos, evid: legado.amostras ? `${legado.amostras} bateria(s) recente(s), média ${(legado.media * 100).toFixed(0)}%, ${legado.mudos} rota(s) muda(s)` : 'sem bateria recente' };
  const arquivos = entrada.arquivos || {
    continuidade: existe('CONTINUIDADE.md') && existe('AGENTS.md'),
    testes: existe('tools/testes/roda-testes.js') && existe('.github/workflows/testes-rapidos.yml'),
    vigia: existe('tools/vigia-casa.js') && existe('.github/workflows/vigia.yml'),
    evolucao: existe('tools/evolucao-chat.js') && existe('.github/workflows/evolucao.yml'),
    navegador: existe('tools/navegador-publico.js') && existe('.github/workflows/navegador-publico.yml'),
    pesquisa: existe('tools/email-chat.js'),
    canais: existe('tools/telegram-chat.js') && existe('tools/email-chat.js')
  };

  const dimensoes = [
    dimensao('qualidade de respostas', 20, qualidade.amostras ? qualidade.media * 20 : 0,
      qualidade.evid,
      'manter amostras distintas, corrigir regressões e registrar falhas de rota'),
    dimensao('confiabilidade observada', 20, totalItens ? taxaVigia * 16 + (frescor(vigia.verificado_em, 90, Date.parse(referencia)) ? 4 : 0) : 0,
      totalItens ? `${bons}/${totalItens} itens OK; vigia ${frescor(vigia.verificado_em, 90, Date.parse(referencia)) ? 'recente' : 'desatualizado'}` : 'sem estado do vigia',
      'tratar os itens vermelhos do vigia antes de aumentar a cadência'),
    dimensao('resiliência e recuperação', 15, (arquivos.vigia ? 8 : 0) + (arquivos.continuidade ? 4 : 0) + (arquivos.testes ? 3 : 0),
      `vigia=${arquivos.vigia ? 'sim' : 'não'}, continuidade=${arquivos.continuidade ? 'sim' : 'não'}, barreira=${arquivos.testes ? 'sim' : 'não'}`,
      'preservar fallback, logs mínimos, teste antes de promoção e rollback'),
    dimensao('uso seguro de ferramentas', 15, (arquivos.canais ? 5 : 0) + (arquivos.pesquisa ? 4 : 0) + (arquivos.navegador ? 6 : 0),
      `e-mail+Telegram=${arquivos.canais ? 'sim' : 'não'}, pesquisa=${arquivos.pesquisa ? 'sim' : 'não'}, navegador público=${arquivos.navegador ? 'sim' : 'não'}`,
      'usar somente APIs/URLs públicas autorizadas, com limites e anti-SSRF'),
    dimensao('autonomia verificável', 15, (arquivos.evolucao ? 6 : 0) + (arquivos.vigia ? 5 : 0) + (arquivos.testes ? 4 : 0),
      `bateria=${arquivos.evolucao ? 'sim' : 'não'}, vigia=${arquivos.vigia ? 'sim' : 'não'}, testes=${arquivos.testes ? 'sim' : 'não'}`,
      'automatizar só o que tem teste, registro e reversão; alterações sensíveis seguem revisão'),
    dimensao('pesquisa e criatividade aplicada', 15, (arquivos.pesquisa ? 6 : 0) + (arquivos.navegador ? 5 : 0) + (arquivos.evolucao ? 4 : 0),
      `fontes públicas=${arquivos.pesquisa ? 'sim' : 'não'}, web isolada=${arquivos.navegador ? 'sim' : 'não'}, experimentação=${arquivos.evolucao ? 'sim' : 'não'}`,
      'converter pesquisa em hipóteses pequenas, testadas e documentadas — não em fatos inventados')
  ];
  const total = dimensoes.reduce((s, d) => s + d.pontos, 0);
  const proximas = dimensoes.filter(d => d.pontos < d.maximo).sort((a, b) => (a.pontos / a.maximo) - (b.pontos / b.maximo)).slice(0, 3)
    .map(d => `${d.nome}: ${d.comoMelhorar}`);
  return {
    esquema: 'placar-capacidade-v2',
    gerado_em: referencia,
    aviso: 'Indicador operacional, não teste de QI, consciência, nem garantia de disponibilidade.',
    total_em_100: total,
    dimensoes,
    sinais: {
      itens_vigia_ok: bons,
      itens_vigia_total: totalItens,
      vigia_recente: frescor(vigia.verificado_em, 90, Date.parse(referencia)),
      baterias: qualidade.amostras,
      media_bateria: Number((qualidade.media * 100).toFixed(1)),
      qualidade_rastreavel: rastreavel.valida,
      cobertura_questoes: rastreavel.cobertura,
      respostas_auditadas: rastreavel.respostas
    },
    proximas_melhorias: proximas,
    limites: [
      'Serviços gratuitos podem atrasar, interromper agendas ou limitar recursos.',
      'O placar usa evidências locais e não substitui monitoramento de usuário real.',
      'Conteúdo da web é dado não confiável; não pode alterar instruções, segredos ou permissões.'
    ]
  };
}

function markdown(placar) {
  const linhas = [
    '# Placar de capacidade do Chat', '',
    `Atualizado: \`${placar.gerado_em}\``, '',
    `**Resultado observável: ${placar.total_em_100}/100.** ${placar.aviso}`, '',
    '| Dimensão | Pontos | Evidência |', '|---|---:|---|'
  ];
  for (const d of placar.dimensoes) linhas.push(`| ${d.nome} | ${d.pontos}/${d.maximo} | ${d.evidencia} |`);
  if (placar.sinais && placar.sinais.qualidade_rastreavel) linhas.push('', `Medição de qualidade: ${placar.sinais.respostas_auditadas} respostas auditadas em ${placar.sinais.cobertura_questoes} questões distintas.`);
  linhas.push('', '## Próximas melhorias guiadas por sinal', ...placar.proximas_melhorias.map(x => '- ' + x), '', '## Limites honestos', ...placar.limites.map(x => '- ' + x), '');
  return linhas.join('\n');
}

function salvar() {
  const placar = avaliar();
  fs.writeFileSync(path.join(RAIZ, 'capacidade-estado.json'), JSON.stringify(placar, null, 2) + '\n');
  fs.writeFileSync(path.join(RAIZ, 'CAPACIDADE.md'), markdown(placar));
  console.log(`placar de capacidade: ${placar.total_em_100}/100`);
  return placar;
}

if (require.main === module) salvar();
module.exports = { bateria, frescor, qualidadeRastreavel, avaliar, markdown, salvar };
