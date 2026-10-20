// Contrato da primeira extração sem framework: uma única folha local mantém a casca visual das quatro rotas.
'use strict';
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }

const css = ler('chat-estilos.css');
ok('a folha compartilhada existe, é local e preserva os estilos essenciais', () => {
  assert(css.length > 8000, 'folha inesperadamente curta');
  assert.match(css, /:root\s*\{/);
  assert.match(css, /body\.leitura-confortavel/);
  assert.match(css, /#progresso-local/);
  assert.doesNotMatch(css, /@import\b/i);
  assert.doesNotMatch(css, /url\(\s*['"]?(?:(?:https?:)?\/\/)/i);
});
ok('as quatro rotas referenciam a mesma folha e não duplicam bloco style', () => {
  const referencias = rotas.map((rota) => ler(rota));
  for (const html of referencias) {
    assert.match(html, /<link rel="stylesheet" href="chat-estilos\.css">/);
    assert.doesNotMatch(html, /<style(?:\s|>)/i);
    assert.equal((html.match(/chat-estilos\.css/g) || []).length, 1);
  }
});
ok('o cache PWA v15 inclui a folha compartilhada local', () => {
  const sw = ler('sw.js');
  assert.match(sw, /rebocl-chat-v15/);
  assert.match(sw, /'\.\/chat-estilos\.css'/);
  assert.match(sw, /'\.\/chat-comandos-locais\.js'/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.match(sw, /url\.search/);
});
ok('a barreira e a porta de continuidade observam alteração da folha compartilhada', () => {
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  assert.match(workflow, /'chat-estilos\.css'/);
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'continuidade-css-'));
  try {
    const evento = path.join(pasta, 'push.json');
    fs.writeFileSync(evento, JSON.stringify({ commits: [{ modified: ['chat-estilos.css'] }] }));
    const r = spawnSync('node', [path.join(raiz, 'tools', 'testes', 'continuidade.js')], {
      cwd: raiz,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { GITHUB_EVENT_PATH: evento })
    });
    assert.notEqual(r.status, 0, 'CSS operacional sem continuidade não pode passar');
    assert.match(String(r.stdout || '') + String(r.stderr || ''), /push operacional atualiza CONTINUIDADE\.md/);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});
console.log(`${certos}/${certos + falhas} testes de estilos compartilhados passaram`);
process.exitCode = falhas ? 1 : 0;
