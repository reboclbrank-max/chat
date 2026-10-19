// Estado puro do turno: falha repetida do ciclo não pode continuar parecendo um trabalhador saudável.
'use strict';

const LIMITE_FALHAS_CONSECUTIVAS = 3;

function proximaFalhasConsecutivas(anterior, sucesso) {
  if (sucesso) return 0;
  const base = Number.isFinite(anterior) && anterior > 0 ? Math.floor(anterior) : 0;
  return Math.min(LIMITE_FALHAS_CONSECUTIVAS, base + 1);
}

function deveEncerrarTurno(falhas) {
  return Number(falhas) >= LIMITE_FALHAS_CONSECUTIVAS;
}

module.exports = { LIMITE_FALHAS_CONSECUTIVAS, proximaFalhasConsecutivas, deveEncerrarTurno };
