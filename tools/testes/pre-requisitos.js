// Sonda de executável local para a suíte: presença no PATH não é o mesmo que êxito da opção --version.
'use strict';
const { spawnSync } = require('child_process');

function comandoExecutavelDisponivel(nome) {
  const r = spawnSync(nome, ['--version'], { encoding: 'utf8', timeout: 5000 });
  // Alguns binários válidos (por exemplo, versões de pdftotext) tratam --version
  // como argumento inválido. Para decidir se o cenário pode chamá-los de verdade,
  // interessa que o processo tenha sido localizado/iniciado; a execução do cenário
  // continua responsável por reprovar erro funcional, sinal ou timeout.
  return !r.error && !r.signal;
}

module.exports = { comandoExecutavelDisponivel };
