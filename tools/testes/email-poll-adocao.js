// Regressão de implantação: mudança em ferramenta chamada pelo canal precisa trocar o turno após a barreira.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const origem = fs.readFileSync(path.resolve(__dirname, '../email-poll.js'), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('ferramentas chamadas pelo canal exigem troca de turno após a barreira', () => {
  const linha = origem.split(/\r?\n/).find(x => x.indexOf('const CODIGO =') >= 0) || '';
  assert.match(linha, /geografia-brasil\\\.js/, 'geografia-brasil.js ausente da lista de adoção');
  assert.match(linha, /email-chat\\\.js/, 'núcleo do canal ausente da lista de adoção');
  assert.match(linha, /email-poll\\\.js/, 'coordenador ausente da lista de adoção');
  assert.match(linha, /falhas-mensagem\\\.js/, 'agregador sanitizado ausente da lista de adoção');
  assert.match(linha, /turno-liveness\\\.js/, 'guarda de liveness ausente da lista de adoção');
  assert.match(linha, /fila-turno\\\.js/, 'guarda da fila de sucessor ausente da lista de adoção');
});
ok('pulso preserva sucessor manual pendente e só substitui na troca de código', () => {
  assert.match(origem, /require\('\.\/fila-turno\.js'\)/, 'decisão pura da fila não foi ligada ao coordenador');
  assert.match(origem, /actions\/workflows\/email\.yml\/runs\?per_page=15/, 'pulso não consulta a fila do próprio workflow');
  assert.match(origem, /decisaoDeProximoTurno\(/, 'decisão de continuidade não está aplicada');
  assert.match(origem, /await proximoTurno\(\{ substituir: true \}\)/, 'troca aprovada de código não atualiza o sucessor');
});
ok('falha repetida do ciclo encerra com erro sem criar dispatch adicional', () => {
  assert.match(origem, /proximaFalhasConsecutivas\(falhasConsecutivas, false\)/);
  assert.match(origem, /deveEncerrarTurno\(falhasConsecutivas\)/);
  assert.match(origem, /motivo = 'falhas consecutivas do ciclo'/);
  assert.match(origem, /process\.exit\(falhaFatalDoCiclo \? 1 : 0\)/);
});

console.log(`${certos}/${certos + falhas} testes de adoção do turno passaram`);
process.exitCode = falhas ? 1 : 0;
