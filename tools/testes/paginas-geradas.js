// Contrato da fonte única das páginas — 2026-10-24.
// As quatro rotas eram cópias quase idênticas de um arquivo de ~540 KB (495 KB de JavaScript
// inline) e só 2 a 6 trechos realmente mudavam entre elas. Agora `index.html` é a fonte única e
// `direto.html`, `ligar.html` e `limpar.html` são derivadas por regras revisáveis.
// Este contrato garante que:
//  1. regenerar as três rotas reproduz o arquivo commitado byte a byte;
//  2. nenhuma regra fica órfã (a faixa esperada tem de casar);
//  3. o número de regras não cresce sem decisão (trava contra voltar a virar cópia);
//  4. só `abrir`, `enviar` e `reabrirUltima` divergem — se outra função passar a divergir, falha;
//  5. a casca (HTML/CSS fora do maior <script>) continua igual nas quatro rotas.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { montar, partes, ROTAS, BASE } = require('../montar-paginas.js');

const raiz = path.resolve(__dirname, '../..');
const ler = (nome) => fs.readFileSync(path.join(raiz, nome), 'utf8');
const FUNCOES_QUE_PODEM_DIVERGIR = ['abrir', 'enviar', 'reabrirUltima'];
const MAX_REGRAS_POR_ROTA = 8;
const MAX_REGRAS_TOTAL = 20;
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try {
    fn();
    certos++;
    console.log('✔ ' + nome);
  } catch (e) {
    falhas++;
    console.error('✘ ' + nome + ' — ' + e.message);
  }
}
function funcoesDoCorpo(corpo) {
  const mapa = new Map();
  const re = /^(?:async )?function ([A-Za-z0-9_]+)\s*\(/gm;
  let m;
  while ((m = re.exec(corpo))) {
    const inicio = m.index;
    const fim = corpo.indexOf('\n}', m.end);
    mapa.set(m[1], corpo.slice(inicio, fim === -1 ? corpo.length : fim + 2));
  }
  return mapa;
}

ok('regenerar as três rotas reproduz o arquivo commitado', () => {
  const baseHtml = ler(BASE);
  for (const rota of ROTAS) {
    assert.equal(montar(rota, baseHtml), ler(rota + '.html'), rota + '.html divergiu da fonte única');
  }
});

ok('o verificador de linha de comando discorda de zero páginas', () => {
  const r = spawnSync('node', [path.join(raiz, 'tools/montar-paginas.js'), '--verificar'], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'montar-paginas --verificar falhou: ' + (r.stderr || r.stdout));
  assert.match(r.stdout, /3 páginas derivadas/, 'saída inesperada do verificador');
});

ok('cada regra casa com a faixa esperada do index.html', () => {
  const baseHtml = ler(BASE);
  for (const rota of ROTAS) {
    const regras = JSON.parse(ler('paginas/rotas/' + rota + '.json')).regras;
    const corpo = partes(baseHtml).corpo.split('\n');
    for (const regra of regras) {
      const [i1, i2] = regra.faixa;
      assert.equal(corpo.slice(i1, i2).join('\n'), regra.esperado, rota + ': regra órfã na faixa ' + i1 + '–' + i2);
    }
  }
});

ok('o número de regras está dentro do teto revisado', () => {
  let total = 0;
  for (const rota of ROTAS) {
    const n = JSON.parse(ler('paginas/rotas/' + rota + '.json')).regras.length;
    assert(n <= MAX_REGRAS_POR_ROTA, rota + ': ' + n + ' regras (teto ' + MAX_REGRAS_POR_ROTA + ') — a rota voltou a copiar código');
    total += n;
  }
  assert(total <= MAX_REGRAS_TOTAL, 'total de regras ' + total + ' acima do teto ' + MAX_REGRAS_TOTAL);
});

ok('só abrir, enviar e reabrirUltima podem divergir entre as rotas', () => {
  const base = funcoesDoCorpo(partes(ler(BASE)).corpo);
  for (const rota of ROTAS) {
    const outro = funcoesDoCorpo(partes(ler(rota + '.html')).corpo);
    const divergentes = [...base.entries()]
      .filter(([nome, texto]) => outro.has(nome) && outro.get(nome) !== texto)
      .map(([nome]) => nome);
    const fora = divergentes.filter((nome) => !FUNCOES_QUE_PODEM_DIVERGIR.includes(nome));
    assert.equal(fora.length, 0, rota + ': função nova divergindo → ' + fora.join(', '));
    const ausentes = [...base.keys()].filter((nome) => !outro.has(nome));
    const ausentesFora = ausentes.filter((nome) => !FUNCOES_QUE_PODEM_DIVERGIR.includes(nome));
    assert.equal(ausentesFora.length, 0, rota + ': função sumiu da rota → ' + ausentesFora.join(', '));
  }
});

ok('a casca fora do maior script é idêntica nas quatro rotas', () => {
  const antes = partes(ler(BASE)).antes;
  for (const rota of ROTAS) assert.equal(partes(ler(rota + '.html')).antes, antes, rota + ': casca divergente');
});

ok('o montador entra na barreira e na checagem de sintaxe', () => {
  assert.match(ler('tools/testes/roda-testes.js'), /'paginas-geradas\.js'/, 'contrato fora do corredor');
  assert.match(ler('.github/workflows/testes-rapidos.yml'), /montar-paginas\.js/, 'montador fora da checagem de sintaxe');
});

ok('o plano da extração final está registrado', () => {
  const plano = ler('PLANO-EXTRACAO-NUCLEO.md');
  assert(/chat-nucleo\.js/.test(plano), 'plano sem o nome do módulo final');
  assert(/index\.html/.test(plano) && /fonte única/.test(plano), 'plano precisa explicar a fonte única');
  assert(/mobile|navegador|Chromium/.test(plano), 'plano precisa declarar a validação que falta');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes das páginas geradas passaram');
process.exitCode = falhas ? 1 : 0;
