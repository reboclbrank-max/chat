// Regressão de implantação: o leitor longo adota código após a barreira, mas não cria sucessor pendente.
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

ok('ferramentas chamadas pelo canal exigem adoção no próximo turno após a barreira', () => {
  const linha = origem.split(/\r?\n/).find(x => x.indexOf('const CODIGO =') >= 0) || '';
  assert.match(linha, /geografia-brasil\\\.js/, 'geografia-brasil.js ausente da lista de adoção');
  assert.match(linha, /email-chat\\\.js/, 'núcleo do canal ausente da lista de adoção');
  assert.match(linha, /email-poll\\\.js/, 'coordenador ausente da lista de adoção');
  assert.match(linha, /falhas-mensagem\\\.js/, 'agregador sanitizado ausente da lista de adoção');
  assert.match(linha, /turno-liveness\\\.js/, 'guarda de liveness ausente da lista de adoção');
  assert.doesNotMatch(linha, /fila-turno\\\.js/, 'coordenador aposentado ainda entrou na lista de adoção');
  assert.match(linha, /pulso-vigia\\\.js/, 'guarda contra pulso redundante do vigia ausente da lista de adoção');
  assert.match(linha, /reserva-turno\\\.js/, 'coordenador da reserva ausente da lista de adoção');
});
ok('leitor longo não pré-enfileira nem despacha outro leitor', () => {
  assert.doesNotMatch(origem, /require\('\.\/fila-turno\.js'\)/, 'helper aposentado ainda foi importado');
  assert.doesNotMatch(origem, /consultaDaFilaDoTurno|coordenaProximoTurno|proximoTurno/, 'restou caminho de handover pré-enfileirado');
  assert.doesNotMatch(origem, /despacha\('email\.yml'/, 'leitor ainda pode disparar o próprio workflow');
  assert.match(origem, /motivo = 'código novo';/, 'troca aprovada não encerra o turno de forma explícita');
  assert.match(origem, /reserva confirmará a próxima partida sem pré-fila/, 'handover por reserva não está explicado no caminho de adoção');
});
ok('pulso do vigia consulta a própria sonda antes de repetir dispatch', () => {
  assert.match(origem, /coordenaPulsoVigia/, 'coordenador de pulso do vigia não foi ligado ao turno');
  assert.match(origem, /consultaDoVigia/, 'consulta do vigia não foi isolada');
  assert.match(origem, /actions\/workflows\/vigia\.yml\/runs\?per_page=10/, 'pulso não consulta as execuções do vigia');
});
ok('reserva agendada não ocupa a fila do leitor e é a única corretora do próximo turno', () => {
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
