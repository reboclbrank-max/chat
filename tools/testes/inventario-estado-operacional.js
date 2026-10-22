// Contrato do inventário local: metadados de estado, sem conteúdo, rede ou escrita.
'use strict';
const assert = require('assert');
const child = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const ferramenta = path.join(raiz, 'tools/inventario-estado-operacional.js');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
function git(dir, args) {
  return child.execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function criaRepositorio(comEstado) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventario-estado-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.name', 'Teste local']);
  git(dir, ['config', 'user.email', 'teste@local.invalid']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'base\n');
  git(dir, ['add', 'README.md']);
  git(dir, ['commit', '-qm', 'base']);
  git(dir, ['branch', 'main']);
  if (comEstado) {
    git(dir, ['branch', 'estado/operacional']);
    git(dir, ['checkout', '-q', 'estado/operacional']);
    fs.mkdirSync(path.join(dir, 'provas'));
    fs.writeFileSync(path.join(dir, 'email-log.md'), 'abc');
    fs.writeFileSync(path.join(dir, 'vigia-estado.json'), '{}');
    fs.writeFileSync(path.join(dir, 'provas', 'ferramentas-2026-10-22-1700.md'), 'prova');
    fs.writeFileSync(path.join(dir, 'surpresa.bin'), 'x');
    git(dir, ['add', '.']);
    git(dir, ['commit', '-qm', 'estado']);
  }
  return dir;
}
function executar(dir) {
  return child.spawnSync(process.execPath, [ferramenta], { cwd: dir, encoding: 'utf8' });
}

ok('resume categorias allowlisted sem listar conteúdo ou caminho', () => {
  const dir = criaRepositorio(true);
  try {
    const antes = git(dir, ['status', '--porcelain']);
    const resultado = executar(dir);
    assert.equal(resultado.status, 0, resultado.stderr);
    const dado = JSON.parse(resultado.stdout);
    assert.equal(dado.formato, 'inventario-estado-operacional-v1');
    assert.equal(dado.origem, 'metadados-git-locais');
    assert.equal(dado.ramo, 'estado/operacional');
    assert.equal(dado.comparado_com, 'main-local');
    assert.equal(dado.arquivos, 4);
    assert.equal(dado.categorias.log_email.arquivos, 1);
    assert.equal(dado.categorias.fotografia_vigia.arquivos, 1);
    assert.equal(dado.categorias.prova_autorizada.arquivos, 1);
    assert.equal(dado.categorias.fora_da_allowlist.arquivos, 1);
    assert(!resultado.stdout.includes('surpresa.bin'), 'inventário não pode listar caminho inesperado');
    assert(!resultado.stdout.includes('abc'), 'inventário não pode expor conteúdo');
    assert.equal(git(dir, ['status', '--porcelain']), antes, 'inventário não pode escrever no Git');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
ok('remoção no delta aparece sem expor o caminho removido', () => {
  const dir = criaRepositorio(true);
  try {
    fs.rmSync(path.join(dir, 'README.md'));
    git(dir, ['add', '-u']);
    git(dir, ['commit', '-qm', 'remoção observável']);
    const resultado = executar(dir);
    assert.equal(resultado.status, 0, resultado.stderr);
    const dado = JSON.parse(resultado.stdout);
    assert.equal(dado.categorias.remocao_detectada.arquivos, 1);
    assert(!resultado.stdout.includes('README.md'), 'inventário não pode listar caminho removido');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
ok('sem ramo local falha fechada sem tentar rede', () => {
  const dir = criaRepositorio(false);
  try {
    const resultado = executar(dir);
    assert.notEqual(resultado.status, 0);
    assert.match(resultado.stderr, /inventário operacional indisponível/);
    assert.doesNotMatch(resultado.stderr, /https?:\/\/|origin\/|\/tmp\//);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
ok('ferramenta fixa ref e não contém rede, fetch ou escrita', () => {
  const fonte = fs.readFileSync(ferramenta, 'utf8');
  assert.match(fonte, /estado\/operacional/);
  assert.match(fonte, /main-local/);
  assert.doesNotMatch(fonte, /https?:\/\/|\bfetch\b|git', \['fetch|writeFile|rmSync|push/);
});

console.log(`${certos}/${certos + falhas} testes do inventário operacional passaram`);
process.exitCode = falhas ? 1 : 0;
