// Regressão de implantação: mudança em ferramenta chamada pelo canal precisa trocar o turno após a barreira.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const origem = fs.readFileSync(path.join(raiz, 'tools/email-poll.js'), 'utf8');
const workflow = fs.readFileSync(path.join(raiz, '.github/workflows/email.yml'), 'utf8');
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
  assert.match(linha, /pulso-vigia\\\.js/, 'guarda contra pulso redundante do vigia ausente da lista de adoção');
  assert.match(linha, /reserva-turno\\\.js/, 'coordenador da reserva ausente da lista de adoção');
});
ok('pulso usa coordenador testável, preserva sucessor e só substitui na troca de código', () => {
  assert.match(origem, /coordenaProximoTurno/, 'coordenador testável da fila não foi ligado ao turno');
  assert.match(origem, /consultaDaFilaDoTurno/, 'pulso não isolou a consulta da fila do próprio workflow');
  assert.match(origem, /actions\/workflows\/email\.yml\/runs\?per_page=15/, 'pulso não consulta a fila do próprio workflow');
  assert.match(origem, /await proximoTurno\(\{ substituir: true \}\)/, 'troca aprovada de código não atualiza o sucessor');
});
ok('pulso do vigia consulta a própria sonda antes de repetir dispatch', () => {
  assert.match(origem, /coordenaPulsoVigia/, 'coordenador de pulso do vigia não foi ligado ao turno');
  assert.match(origem, /consultaDoVigia/, 'consulta do vigia não foi isolada');
  assert.match(origem, /actions\/workflows\/vigia\.yml\/runs\?per_page=10/, 'pulso não consulta as execuções do vigia');
});
ok('reserva agendada não ocupa a fila do leitor e só executa o corretor leve', () => {
  assert.match(workflow, /github\.event\.schedule == '17,47 \* \* \* \*' && 'email-reserva' \|\| 'email-casa'/,
    'a reserva ainda disputa o grupo email-casa');
  const reserva = workflow.slice(workflow.indexOf('  reserva:\n'));
  assert.match(reserva, /node tools\/reserva-turno\.js/, 'reserva não usa o coordenador leve');
  assert.match(reserva, /GITHUB_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/, 'reserva não recebe o token já autorizado para consultar a fila');
  assert.doesNotMatch(reserva, /email-chat\.js|GMAIL_CHAT_|Acorda o vigia|curl -s/,
    'reserva não pode ler a caixa nem acordar a sonda diretamente');
});
ok('falha repetida do ciclo encerra com erro sem criar dispatch adicional', () => {
  assert.match(origem, /proximaFalhasConsecutivas\(falhasConsecutivas, false\)/);
  assert.match(origem, /deveEncerrarTurno\(falhasConsecutivas\)/);
  assert.match(origem, /motivo = 'falhas consecutivas do ciclo'/);
  assert.match(origem, /process\.exit\(falhaFatalDoCiclo \? 1 : 0\)/);
});

console.log(`${certos}/${certos + falhas} testes de adoção do turno passaram`);
process.exitCode = falhas ? 1 : 0;
