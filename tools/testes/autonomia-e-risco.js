// Contratos do interruptor de autonomia, do mapa de risco e do termômetro da barreira.
// Estes três juntos são a arquitetura que impede o degrau 4 de virar empecilho.
'use strict';
const assert = require('assert');
const { lerNivel, permite, nivelValido, resumo, NIVEIS } = require('../autonomia.js');
const { classificar, liberadoNoNivel, ESSENCIAL, TEXTO, CODIGO_SEGURO } = require('../risco-de-arquivo.js');
const { avaliaTermometro, LIMITES } = require('../termometro-barreira.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

// ---- interruptor ----
ok('sem arquivo, ilegível ou nível inventado, a autonomia fica desligada', () => {
  assert.equal(lerNivel(null).nivel, 'desligado');
  assert.equal(lerNivel('{ isso não é json').nivel, 'desligado');
  assert.equal(lerNivel({ nivel: 'turbo' }).nivel, 'desligado');
  assert.equal(lerNivel({}).nivel, 'desligado');
  assert.equal(lerNivel({ nivel: 'texto' }).nivel, 'texto');
  assert.equal(lerNivel(JSON.stringify({ nivel: 'CODIGO' })).nivel, 'codigo');
});

ok('a matriz de permissão é fechada e o nível baixo não herda poder do alto', () => {
  assert.equal(permite('desligado', 'texto'), false);
  assert.equal(permite('texto', 'texto'), true);
  assert.equal(permite('texto', 'codigo'), false);
  assert.equal(permite('codigo', 'codigo'), false, 'código puro continua fora até ser liberado arquivo por arquivo');
  // O nível `codigo` PODE liberar código-seguro: quem barra é a lista vazia de risco-de-arquivo.
  // Duas travas independentes — se uma for afrouxada por engano, a outra continua de pé.
  assert.equal(permite('codigo', 'codigo-seguro'), true);
  assert.equal(permite('texto', 'codigo-seguro'), false);
  assert.equal(permite('nivel-inventado', 'texto'), false);
  assert.equal(permite('texto', 'categoria-inventada'), false);
});

ok('o resumo fala com o dono sem jargão', () => {
  assert.match(resumo(lerNivel({ nivel: 'texto' })), /degrau 3: só texto/);
  assert.match(resumo(lerNivel({ nivel: 'desligado' })), /desligada/);
  assert.ok(NIVEIS.includes('codigo'));
});

// ---- mapa de risco ----
ok('o que pode calar a casa é essencial: e-mail, segredos, postador, workflow', () => {
  for (const c of ['tools/email-poll.js', 'tools/email-chat.js', 'tools/estado-operacional-controlado.js',
    'tools/vigia-casa.js', '.github/workflows/email.yml', 'package.json', 'index.html',
    'tools/.token-github', 'autonomia.json']) {
    assert.equal(classificar(c).categoria, ESSENCIAL, c + ' deveria ser essencial');
  }
});

ok('o desconhecido nunca é promovido: fechado por padrão', () => {
  for (const c of ['tools/qualquer-coisa-nova.js', 'scripts/x.sh', 'algo.py', 'docs/../tools/x.js', '']) {
    assert.equal(classificar(c).categoria, ESSENCIAL, c + ' deveria ser essencial');
  }
});

ok('texto de leitura humana é o que já roda hoje no degrau 3', () => {
  assert.equal(classificar('docs/DEGRAU-3-MESCLADOR.md').categoria, TEXTO);
  assert.equal(classificar('posts/devlog/x.json').categoria, TEXTO);
  assert.equal(classificar('docs/x.sh').categoria, ESSENCIAL);
});

ok('o mapa distingue o que PODE calar a casa do que é apenas desconhecido', () => {
  // Ambos são `essencial` na vida real; só o `duro` é o que nunca pode entrar, nem no exercício.
  assert.equal(classificar('tools/email-chat.js').duro, true);
  assert.equal(classificar('tools/qualquer-coisa-nova.js').duro, false);
  assert.equal(classificar('docs/x.md').duro, false);
  assert.equal(classificar('').duro, true);
});

ok('a lista do degrau 4 está vazia hoje — nada de código está liberado', () => {
  const vazio = { categoria: CODIGO_SEGURO }.categoria;
  assert.equal(vazio, 'codigo-seguro');
  assert.equal(liberadoNoNivel('tools/socorro.js', () => true).categoria, ESSENCIAL,
    'socorro.js ainda não está liberado: só entra por decisão humana explícita');
});

// ---- termômetro ----
const verdes = n => Array.from({ length: n }, (_, i) => ({ conclusion: 'success', created_at: new Date(Date.UTC(2026, 10, 5, 0, i)).toISOString() }));
const vermelhos = n => Array.from({ length: n }, (_, i) => ({ conclusion: 'failure', created_at: new Date(Date.UTC(2026, 10, 4, 0, i)).toISOString() }));
// Falhas mais novas que tudo: é isso que "recente" significa para o termômetro.
const vermelhosRecentes = n => Array.from({ length: n }, (_, i) => ({ conclusion: 'failure', created_at: new Date(Date.UTC(2026, 10, 7, 0, i)).toISOString() }));

ok('barreira saudável libera o degrau 4 (sem pendência conhecida)', () => {
  const v = avaliaTermometro({ execucoes: verdes(30), passosFalhos: {}, instabilidades: [] });
  assert.equal(v.aprovado, true, v.motivos.join('; '));
  assert.equal(v.numeros.taxaVerde, 1);
});

ok('histórico curto não libera nada, mesmo 100% verde', () => {
  const v = avaliaTermometro({ execucoes: verdes(5), passosFalhos: {}, instabilidades: [] });
  assert.equal(v.aprovado, false);
  assert.match(v.motivos.join(' '), /histórico curto/);
});

ok('falha recente reprova mesmo com média histórica boa', () => {
  const execs = verdes(28).concat(vermelhosRecentes(2));
  const v = avaliaTermometro({ execucoes: execs, passosFalhos: {}, instabilidades: [] });
  assert.equal(v.numeros.taxaVerde >= LIMITES.taxaVerdeMinima, true);
  assert.equal(v.aprovado, false);
  assert.match(v.motivos.join(' '), /falha/);
});

ok('um passo concentrando quase toda a falha é tratado como instabilidade, não como defeito', () => {
  const execs = verdes(27).concat(vermelhos(1));
  const v = avaliaTermometro({ execucoes: execs, passosFalhos: { 'Navegador controlado (quatro rotas, desktop e mobile)': 1 }, instabilidades: [] });
  assert.match(v.motivos.join(' '), /passo concentra/);
  // com o mesmo volume de falhas distribuído em vários passos, o motivo muda de natureza
  const distribuido = avaliaTermometro({ execucoes: execs, passosFalhos: { 'a': 1 }, instabilidades: [] });
  assert.equal(distribuido.numeros.passoDominante, 'a');
});

ok('janela verde NÃO aprova enquanto existir instabilidade conhecida pendente', () => {
  const v = avaliaTermometro({ execucoes: verdes(60), passosFalhos: {} });
  assert.equal(v.aprovado, false, 'verde na janela não pode apagar a pendência conhecida');
  assert.match(v.motivos.join(' '), /instabilidade conhecida não corrigida/);
  assert.ok(v.instabilidadesPendentes.length >= 1);
});

ok('marcar a instabilidade como corrigida libera o caminho', () => {
  const v = avaliaTermometro({
    execucoes: verdes(30), passosFalhos: {},
    instabilidades: [{ passo: 'Navegador controlado', arquivo: 'x.sh', corrigido: true }]
  });
  assert.equal(v.aprovado, true, v.motivos.join('; '));
});

ok('termômetro sem dado não aprova nada', () => {
  const v = avaliaTermometro({ execucoes: [], passosFalhos: {}, instabilidades: [] });
  assert.equal(v.aprovado, false);
  assert.equal(v.numeros.total, 0);
});

(async () => {
  let certos = 0, falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} contratos de autonomia/risco/termômetro passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
