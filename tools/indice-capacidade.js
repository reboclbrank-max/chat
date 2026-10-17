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

function frescor(iso, minutos) {
  const quando = Date.parse(iso || '');
  if (!Number.isFinite(quando)) return false;
  return Date.now() - quando <= minutos * 60 * 1000 && quando <= Date.now() + 5 * 60 * 1000;
}

function dimensao(nome, maximo, pontos, evidencia, comoMelhorar) {
  return { nome, maximo, pontos: limita(pontos, 0, maximo), evidencia, comoMelhorar };
}

function avaliar(entrada = {}) {
  const vigia = entrada.vigia || leJson('vigia-estado.json');
  const saude = entrada.saude === undefined ? le('saude-cerebro.md') : entrada.saude;
  const itens = Object.values(vigia.itens || {});
  const bons = itens.filter(x => x && x.ok).length;
  const totalItens = itens.length;
  const taxaVigia = totalItens ? bons / totalItens : 0;
  const b = bateria(saude);
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
    dimensao('qualidade de respostas', 20, b.amostras ? b.media * 20 : 0,
      b.amostras ? `${b.amostras} bateria(s) recente(s), média ${(b.media * 100).toFixed(0)}%, ${b.mudos} rota(s) muda(s)` : 'sem bateria recente',
      'manter a bateria, corrigir regressões e registrar falhas de rota'),
    dimensao('confiabilidade observada', 20, totalItens ? taxaVigia * 16 + (frescor(vigia.verificado_em, 90) ? 4 : 0) : 0,
      totalItens ? `${bons}/${totalItens} itens OK; vigia ${frescor(vigia.verificado_em, 90) ? 'recente' : 'desatualizado'}` : 'sem estado do vigia',
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
    esquema: 'placar-capacidade-v1',
    gerado_em: entrada.agora || agora(),
    aviso: 'Indicador operacional, não teste de QI, consciência, nem garantia de disponibilidade.',
    total_em_100: total,
    dimensoes,
    sinais: { itens_vigia_ok: bons, itens_vigia_total: totalItens, vigia_recente: frescor(vigia.verificado_em, 90), baterias: b.amostras, media_bateria: Number((b.media * 100).toFixed(1)) },
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
module.exports = { bateria, frescor, avaliar, markdown, salvar };
