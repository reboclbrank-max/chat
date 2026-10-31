// AUTO-DIAGNÓSTICO (31/10/2026) — o teste da ferramenta que dita o ritmo.
//
// O auto-diagnóstico só vale se for honesto: as provas têm de ser executáveis, a classificação
// tem de cobrir todas as provas, e ele NÃO pode escolher o melhor placar escondido nem inventar
// nota. Este teste roda o programa de verdade (offline, sem modelo) e confere essas garantias.
'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
let certos = 0;
const falhas = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}
function roda(args) {
  return execFileSync(process.execPath, [path.join(RAIZ, 'tools', 'auto-melhoria.js')].concat(args || []),
    { cwd: RAIZ, encoding: 'utf8', timeout: 120000 });
}

testa('as provas do chat existem e têm resposta de referência', () => {
  const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8'));
  assert(Array.isArray(banco.provas) && banco.provas.length >= 40, 'poucas provas: ' + banco.provas.length);
  for (const p of banco.provas) {
    assert(p.id && p.q && p.ok && p.ok.length, 'prova incompleta: ' + JSON.stringify(p.id));
  }
});

testa('o relatório classifica TODAS as provas (nada fica sem conta)', () => {
  const rel = JSON.parse(roda(['--json']));
  assert.equal(rel.provas.porCodigo + rel.provas.dependemDoModelo, rel.provas.total);
  assert.equal(rel.provas.total, JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8')).provas.length);
});

testa('nenhuma prova é respondida ERRADA pelo caminho exato', () => {
  // Resposta exata errada é o pior defeito possível: se aparecer, o teste falha aqui.
  const rel = JSON.parse(roda(['--json']));
  assert.deepEqual(rel.provas.erradas, [], 'erradas: ' + rel.provas.erradas.join(', '));
});

testa('a fila de conserto é ranqueada e diz o custo de cada item', () => {
  const rel = JSON.parse(roda(['--json']));
  assert(Array.isArray(rel.lacunas));
  for (const l of rel.lacunas) {
    assert(l.tipo && l.provas > 0 && l.custo && l.acao, 'lacuna incompleta: ' + JSON.stringify(l));
  }
  if (rel.lacunas.length) assert(rel.lacunas[0].ganho >= rel.lacunas[rel.lacunas.length - 1].ganho);
});

testa('texto aberto: os concorrentes aparecem (não se escolhe o melhor placar escondido)', () => {
  const rel = JSON.parse(roda(['--json']));
  if (!rel.aberto) return;                        // repositório sem medição: nada a esconder
  assert(Array.isArray(rel.aberto.concorrentes) && rel.aberto.concorrentes.length >= 1);
  const escolhido = rel.aberto.concorrentes.find((c) => c.arquivo === rel.aberto.arquivo);
  assert(escolhido, 'o arquivo usado não está na lista de concorrentes');
});

testa('o histórico cresce e guarda tendência', () => {
  const hist = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs', 'auto-melhoria.json'), 'utf8'));
  assert(Array.isArray(hist.rodadas) && hist.rodadas.length >= 1);
  const u = hist.rodadas[hist.rodadas.length - 1];
  assert(typeof u.porCodigo === 'number' && typeof u.provas === 'number');
  assert(u.porCodigo <= u.provas);
});

console.log('');
if (falhas.length) { console.error('✘ ' + falhas.length + ' de ' + (certos + falhas.length) + ' verificações FALHARAM'); process.exit(1); }
console.log('✔ ' + certos + '/' + (certos + falhas.length) + ' verificações do auto-diagnóstico passaram');
