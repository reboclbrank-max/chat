// Resultado honesto da rodada por e-mail: resposta ausente é falha, não desaparece do denominador.
'use strict';

function notaSemResposta(x, sumico) {
  if (x.r) return 'FALHOU (respondeu um e-mail automático)';
  return (/LIDO sem resposta/.test(sumico.get(x.e.id) || ''))
    ? 'PASS (lido e não respondido — RFC 3834)'
    : 'FALHOU (o chat não chegou a olhar o e-mail automático)';
}

function notaDoCaso(x, opcoes) {
  const sumico = opcoes.sumico || new Map();
  if (x.e.semResposta) return notaSemResposta(x, sumico);
  if (!x.r) {
    const estado = sumico.get(x.e.id);
    return 'FALHOU (sem resposta na janela' + (estado ? ' — ' + estado : '') + ')';
  }
  if (typeof x.e.check !== 'function') return 'FALHOU (caso sem checagem automática)';
  return opcoes.avalia(x.e, opcoes.textoDe(x));
}

function resumoDasNotas(notas) {
  const passou = notas.filter(n => n.indexOf('PASS') === 0).length;
  const falhou = notas.length - passou;
  return { total: notas.length, passou, falhou, tudoPassou: falhou === 0 };
}

module.exports = { notaSemResposta, notaDoCaso, resumoDasNotas };
