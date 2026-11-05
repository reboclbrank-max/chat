// 🔌 INTERRUPTOR DE AUTONOMIA — a primeira coisa que qualquer mecanismo automático lê.
//
// Um único arquivo (`autonomia.json`, na raiz) diz o quanto a casa pode agir sozinha.
// Regras de projeto, todas para que o degrau 4 não vire empecilho:
//   • falha fechada: arquivo ausente, inválido ou nível desconhecido = `desligado`;
//   • não existe nível implícito nem "lembrança" de nível anterior;
//   • desligar é sempre permitido e tem efeito imediato (o próximo ciclo já obedece);
//   • subir de nível é ato humano: nada aqui escreve no arquivo.
'use strict';

const NIVEIS = Object.freeze(['desligado', 'texto', 'codigo']);
const CATEGORIAS = Object.freeze(['texto', 'codigo-seguro', 'codigo']);
const NIVEL_PADRAO = 'desligado';

// Matriz de permissão: nível × categoria. Fechada de propósito — o que não está aqui não passa.
const PERMISSOES = Object.freeze({
  desligado: [],
  texto: ['texto'],
  codigo: ['texto', 'codigo-seguro']
});

function texto(valor) {
  return String(valor == null ? '' : valor).trim().toLowerCase();
}

function nivelValido(nivel) {
  return NIVEIS.includes(texto(nivel));
}

// Lê o nível declarado. Qualquer dúvida = desligado. Nunca lança.
function lerNivel(conteudo) {
  let dados = conteudo;
  if (typeof conteudo === 'string') {
    try { dados = JSON.parse(conteudo); } catch (e) { return { nivel: NIVEL_PADRAO, valido: false, motivo: 'autonomia.json ilegível' }; }
  }
  if (!dados || typeof dados !== 'object') return { nivel: NIVEL_PADRAO, valido: false, motivo: 'sem autonomia.json' };
  const nivel = texto(dados.nivel);
  if (!nivelValido(nivel)) return { nivel: NIVEL_PADRAO, valido: false, motivo: 'nível desconhecido: ' + (nivel || '(vazio)') };
  return { nivel, valido: true, motivo: texto(dados.motivo), desde: texto(dados.desde) };
}

function permite(nivel, categoria) {
  const n = nivelValido(nivel) ? texto(nivel) : NIVEL_PADRAO;
  const c = texto(categoria);
  if (!CATEGORIAS.includes(c)) return false;
  return PERMISSOES[n].includes(c);
}

// Texto para o dono: uma linha, sem jargão.
function resumo(leitura) {
  const l = leitura || lerNivel(null);
  if (!l.valido) return 'autonomia desligada (motivo: ' + l.motivo + ')';
  if (l.nivel === 'desligado') return 'autonomia desligada à mão';
  if (l.nivel === 'texto') return 'autonomia no degrau 3: só texto em docs/ e posts/';
  return 'autonomia no degrau 4: código de faixa segura também entra sozinho';
}

module.exports = { NIVEIS, CATEGORIAS, PERMISSOES, NIVEL_PADRAO, lerNivel, nivelValido, permite, resumo };
