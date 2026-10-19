// Contador efêmero e sanitizado por turno. Não guarda UID, remetente, assunto,
// corpo, URL, nome de anexo, erro bruto ou segredo; serve para observar padrão,
// não para redespachar/reprocessar automaticamente uma mensagem.
'use strict';
const JANELA_FALHAS_MENSAGEM_MS = 15 * 60 * 1000;
const LIMITE_FALHAS_REPETIDAS = 3;
const CLASSES_FALHA_MENSAGEM = new Set(['leitura', 'anexo', 'processamento', 'envio', 'acesso', 'limite', 'servico', 'desconhecida']);
function classeFalhaMensagem(erro, preferida) {
  if (CLASSES_FALHA_MENSAGEM.has(preferida)) return preferida;
  const status = Number(erro && erro.status);
  if (status === 401 || status === 403) return 'acesso';
  if (status === 408 || status === 429) return 'limite';
  if (status >= 500) return 'servico';
  return 'processamento';
}
function criaEstadoFalhasMensagem() {
  return { eventos: [], consecutivas: 0, ultimoSucessoEm: 0 };
}
function expirar(estado, agora) {
  const limite = Number(agora) - JANELA_FALHAS_MENSAGEM_MS;
  estado.eventos = (Array.isArray(estado.eventos) ? estado.eventos : []).filter((e) => e && Number(e.em) >= limite && CLASSES_FALHA_MENSAGEM.has(e.classe));
  return estado;
}
function retrato(estado, agora, classe) {
  expirar(estado, agora);
  const porClasse = {};
  for (const evento of estado.eventos) porClasse[evento.classe] = (porClasse[evento.classe] || 0) + 1;
  return Object.freeze({
    classe: classe || '',
    totalNaJanela: estado.eventos.length,
    consecutivas: Math.max(0, Number(estado.consecutivas) || 0),
    porClasse: Object.freeze(porClasse),
    repetida: (Number(estado.consecutivas) || 0) >= LIMITE_FALHAS_REPETIDAS,
    acao: 'observar'
  });
}
function registraFalhaMensagem(estado, erro, preferida, agora = Date.now()) {
  const alvo = estado && typeof estado === 'object' ? estado : criaEstadoFalhasMensagem();
  const classe = classeFalhaMensagem(erro, preferida);
  expirar(alvo, agora);
  alvo.eventos.push({ em: Number(agora), classe });
  alvo.consecutivas = Math.max(0, Number(alvo.consecutivas) || 0) + 1;
  return retrato(alvo, agora, classe);
}
function registraSucessoMensagem(estado, agora = Date.now()) {
  const alvo = estado && typeof estado === 'object' ? estado : criaEstadoFalhasMensagem();
  expirar(alvo, agora);
  alvo.consecutivas = 0;
  alvo.ultimoSucessoEm = Number(agora);
  return retrato(alvo, agora, '');
}
function resumoFalhaMensagem(retratoFalha) {
  const r = retratoFalha && typeof retratoFalha === 'object' ? retratoFalha : {};
  const classe = CLASSES_FALHA_MENSAGEM.has(r.classe) ? r.classe : 'desconhecida';
  if (r.repetida) return 'padrão repetido de falha por mensagem (' + classe + '); sigo sem reprocessamento automático';
  return 'falha isolada de mensagem (' + classe + '); sigo com as demais sem reprocessamento automático';
}
module.exports = { JANELA_FALHAS_MENSAGEM_MS, LIMITE_FALHAS_REPETIDAS, CLASSES_FALHA_MENSAGEM, classeFalhaMensagem, criaEstadoFalhasMensagem, registraFalhaMensagem, registraSucessoMensagem, resumoFalhaMensagem };
