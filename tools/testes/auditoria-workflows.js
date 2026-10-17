// Auditoria offline das guardas de workflows: pin, privilégio explícito e isolamento do navegador público.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const pasta = path.join(raiz, '.github', 'workflows');
const arquivos = fs.readdirSync(pasta).filter(x => /\.ya?ml$/i.test(x)).sort();
const ler = nome => fs.readFileSync(path.join(pasta, nome), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('todos os workflows declaram permissões e runner Ubuntu 24.04', () => {
  assert(arquivos.length >= 10, 'inventário inesperadamente curto');
  for (const nome of arquivos) {
    const texto = ler(nome);
    assert.match(texto, /^permissions:\n(?: {2,}.+\n)+/m, nome + ' sem permissions explícitas');
    assert.match(texto, /^\s*runs-on:\s*ubuntu-24\.04\s*$/m, nome + ' não fixa ubuntu-24.04');
  }
});

ok('todas as actions externas estão fixadas por SHA completo', () => {
  for (const nome of arquivos) {
    const usos = [...ler(nome).matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)];
    assert(usos.length || nome === 'ferramentas.yml', nome + ' sem action esperada');
    for (const uso of usos) assert.match(uso[1], /@[a-f0-9]{40}$/i, nome + ' usa referência não imutável: ' + uso[1]);
  }
});

ok('não há gatilho pull_request_target e o orçamento de escrita é explícito', () => {
  const escreveConteudo = new Set(['coleta-email.yml', 'email.yml', 'evolucao.yml', 'ferramentas.yml', 'navegador-publico.yml', 'teste-email.yml', 'vigia.yml']);
  const escreveAcoes = new Set(['email.yml', 'vigia.yml']);
  for (const nome of arquivos) {
    const texto = ler(nome);
    assert(!/^\s*pull_request_target:\s*$/m.test(texto), nome + ' não pode usar pull_request_target');
    const conteudo = /^\s*contents:\s*write\s*$/m.test(texto);
    const acoes = /^\s*actions:\s*write\s*$/m.test(texto);
    assert.equal(conteudo, escreveConteudo.has(nome), nome + ' divergiu do orçamento de contents: write');
    assert.equal(acoes, escreveAcoes.has(nome), nome + ' divergiu do orçamento de actions: write');
  }
});

ok('navegador público recebe só URL e referência opaca, antes de ter token', () => {
  const texto = ler('navegador-publico.yml');
  const entradas = [...texto.matchAll(/^      ([a-z_]+):\n        description:/gm)].map(x => x[1]);
  assert.deepEqual(entradas, ['url', 'referencia']);
  assert(!/\$\{\{\s*secrets\./i.test(texto), 'workflow isolado não recebe secrets');
  const antesDoPush = texto.split('- name: Salva a trilha pública depois da navegação')[0];
  assert(!/github\.token|GITHUB_TOKEN|Authorization:/i.test(antesDoPush), 'Chrome não pode receber token antes do push');
  assert.match(texto, /(?:refer[eê]ncia|identificador)[^\n]*opac/i);
});

console.log(`${certos}/${certos + falhas} testes da auditoria de workflows passaram`);
process.exitCode = falhas ? 1 : 0;
