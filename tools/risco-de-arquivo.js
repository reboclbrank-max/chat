// 🗺️ MAPA DE RISCO POR ARQUIVO — o que torna o degrau 4 possível sem virar empecilho.
//
// A pergunta que este módulo responde: "se a máquina mesclasse este arquivo sozinha e ele
// estivesse errado, o que aconteceria?". Três respostas, e só três:
//
//   texto          → no máximo uma página com erro de digitação. (já é o degrau 3)
//   codigo-seguro  → código que já tem contrato próprio, não fala com credencial, não
//                    publica estado e não decide nada em nome do dono.
//   essencial      → pode calar a casa: turno de e-mail, segredos, postador, workflow,
//                    dependência, página pública.
//
// REGRA DE OURO: classificação por LISTA EXPLÍCITA. Nada é promovido por heurística
// ("parece inofensivo"), nada é promovido por extensão de arquivo e o desconhecido é
// sempre `essencial`. Promover um arquivo é gesto humano, com contrato provando.
'use strict';

const TEXTO = 'texto';
const CODIGO_SEGURO = 'codigo-seguro';
const ESSENCIAL = 'essencial';

// Lista explícita — e agora com o PRIMEIRO arquivo (portão 3, 05/11).
//
// Critério para entrar aqui: contrato próprio, nenhum efeito externo, e um erro nele é
// CHATO e VISÍVEL, não silencioso. `indice-capacidade.js` lê arquivos locais e monta um
// placar em markdown para o ciclo diário de evolução: se a máquina mesclar uma versão
// errada, o pior caso é um placar errado — que aparece no próprio documento e na barreira.
// Não fala com credencial, não publica estado operacional, não decide nada em nome do dono.
const LIBERADOS_PARA_DEGRAU_4 = Object.freeze([
  'tools/indice-capacidade.js'
]);

// Tudo aqui nunca entra sozinho, em nenhum nível. É o que pode calar a casa.
const ESSENCIAIS = Object.freeze([
  '.github/',
  'tools/email',
  // O turno de e-mail já declara seus próprios arquivos críticos (o regex CODIGO em
  // email-poll.js). O mapa passa a respeitar essa lista em vez de adivinhar por prefixo:
  // se o turno protege, o mesclador também protege.
  'tools/pulso-vigia.js',
  'tools/reserva-turno.js',
  'tools/falhas-mensagem.js',
  'tools/turno-liveness.js',
  'tools/geografia-brasil.js',
  'tools/telegram-chat.js',
  'tools/olho.py',
  'tools/ocr-local.py',
  'tools/transcreve.py',
  'tools/visao-local.py',
  'tools/prepara-foto.py',
  'tools/estado-operacional-controlado.js',
  'tools/vigia',
  'tools/postad',
  'tools/.token',
  'tools/registra',
  'package.json',
  'package-lock.json',
  'index.html',
  'autonomia.json' // quem decide o nível não pode ser mudado por quem obedece ao nível
]);

// Pastas onde vive texto de leitura humana.
const PASTAS_DE_TEXTO = Object.freeze(['docs/', 'posts/']);

function texto(valor) {
  return String(valor == null ? '' : valor).trim().replace(/^\.\//, '');
}

// `duro` separa duas coisas que a categoria sozinha confunde:
//   duro = true  → está na lista do que pode calar a casa (nunca entra, em nenhum exercício);
//   duro = false → desconhecido, fechado por padrão (não entra hoje, mas é EXATAMENTE o que o
//                  degrau 4 enfrentaria — e é o que o modo sombra precisa poder medir).
function classificar(caminho) {
  const c = texto(caminho);
  if (!c) return { categoria: ESSENCIAL, motivo: 'caminho vazio', duro: true };
  if (ESSENCIAIS.some(p => c === p || c.startsWith(p))) {
    return { categoria: ESSENCIAL, motivo: 'essencial: pode calar a casa', duro: true };
  }
  if (LIBERADOS_PARA_DEGRAU_4.includes(c)) {
    return { categoria: CODIGO_SEGURO, motivo: 'liberado à mão para o degrau 4', duro: false };
  }
  if (PASTAS_DE_TEXTO.some(p => c.startsWith(p)) && /\.(md|json)$/i.test(c)) {
    return { categoria: TEXTO, motivo: 'texto de leitura humana', duro: false };
  }
  return { categoria: ESSENCIAL, motivo: 'desconhecido: fechado por padrão', duro: false };
}

// O nível de autonomia basta para este arquivo?
function liberadoNoNivel(caminho, permissoes) {
  const { categoria, motivo } = classificar(caminho);
  const pode = typeof permissoes === 'function' ? permissoes(categoria) : false;
  return { liberado: pode, categoria, motivo };
}

function faixaAtual() {
  return {
    texto: { pastas: PASTAS_DE_TEXTO.slice(), extensoes: ['.md', '.json'] },
    codigoSeguro: LIBERADOS_PARA_DEGRAU_4.slice(),
    essencial: ESSENCIAIS.slice()
  };
}

module.exports = { TEXTO, CODIGO_SEGURO, ESSENCIAL, ESSENCIAIS, LIBERADOS_PARA_DEGRAU_4, classificar, liberadoNoNivel, faixaAtual };
