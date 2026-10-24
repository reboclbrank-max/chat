/* Diagnóstico local de motores — 2026-10-24
 * Guarda, somente neste navegador, um resumo sanitizado de por que um motor não respondeu.
 * Regras que não podem regredir:
 *  - nunca grava conteúdo de conversa, pergunta, resposta, token ou cabeçalho;
 *  - nunca envia nada para a rede (sem fetch, sem beacon, sem XHR);
 *  - grava apenas: nome público do motor, motivo fechado e hora curta;
 *  - o histórico é limitado (últimas 40 tentativas) e pode ser apagado pela pessoa.
 * Sem esse resumo, um laço de motores com `catch` vazio some da tela: a pessoa vê
 * "asas mudas" e não sabe se foi rede, limite do provedor ou resposta vazia.
 */
(function (raiz) {
  'use strict';
  const CHAVE = 'rebocl_diag_motores_v1';
  const LIMITE = 40;
  const MOTIVOS = {
    rede: 'rede indisponível ou bloqueada',
    tempo: 'tempo esgotado',
    limite: 'provedor recusou (limite/credencial)',
    servidor: 'provedor respondeu com erro',
    vazio: 'provedor respondeu vazio',
    formato: 'resposta em formato inesperado',
    outro: 'falha não classificada'
  };
  const MOTIVOS_VALIDOS = Object.keys(MOTIVOS);

  function agoraCurto() {
    const d = new Date();
    const dois = (n) => String(n).padStart(2, '0');
    return dois(d.getHours()) + ':' + dois(d.getMinutes());
  }

  // Aceita o motor inteiro ({ nome }) ou só o rótulo, e devolve apenas o rótulo público.
  function nomeDoMotor(nome) {
    if (nome && typeof nome === 'object') return String(nome.nome == null ? '' : nome.nome);
    return String(nome == null ? '' : nome);
  }

  // Só o nome público do motor, sem modelo proprietário, sem URL e sem credencial.
  function nomeSeguro(nome) {
    return nomeDoMotor(nome)
      .replace(/[^\p{L}\p{N} ._·-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40) || 'motor sem nome';
  }

  // Classifica um erro/status em um motivo fechado. Sem inspecionar conteúdo de resposta.
  function motivoDeFalha(erro, status) {
    const codigo = Number(status || (erro && erro.status) || 0);
    if (codigo === 429 || codigo === 401 || codigo === 402 || codigo === 403) return 'limite';
    if (codigo >= 500) return 'servidor';
    if (codigo >= 400) return 'formato';
    const nome = String((erro && erro.name) || '');
    const msg = String((erro && erro.message) || '').toLowerCase();
    if (nome === 'TimeoutError' || /timeout|timed out|demorou/.test(msg)) return 'tempo';
    if (nome === 'AbortError' || /abort/.test(msg)) return 'tempo';
    if (nome === 'TypeError' || /failed to fetch|network|load failed|offline/.test(msg)) return 'rede';
    if (/json|parse|unexpected token/.test(msg)) return 'formato';
    return 'outro';
  }

  function ler() {
    try {
      const bruto = JSON.parse((raiz.localStorage && raiz.localStorage.getItem(CHAVE)) || '[]');
      if (!Array.isArray(bruto)) return [];
      return bruto.filter((t) => t && typeof t === 'object' && MOTIVOS_VALIDOS.indexOf(t.motivo) >= 0).slice(-LIMITE);
    } catch (e) {
      return [];
    }
  }

  function gravar(lista) {
    try {
      raiz.localStorage.setItem(CHAVE, JSON.stringify(lista.slice(-LIMITE)));
    } catch (e) {
      // Sem espaço ou storage bloqueado: o diagnóstico é conveniência, nunca requisito.
    }
  }

  function registrarFalhaMotor(nome, erroOuMotivo, status) {
    const motivo = MOTIVOS_VALIDOS.indexOf(erroOuMotivo) >= 0 ? erroOuMotivo : motivoDeFalha(erroOuMotivo, status);
    const lista = ler();
    lista.push({ m: nomeSeguro(nome), motivo: motivo, hora: agoraCurto() });
    gravar(lista);
    return motivo;
  }

  function registrarSucessoMotor(nome) {
    const lista = ler();
    lista.push({ m: nomeSeguro(nome), motivo: 'ok', hora: agoraCurto() });
    gravar(lista);
  }

  function contarPorMotivo(lista) {
    const contagem = {};
    for (const t of lista) contagem[t.motivo] = (contagem[t.motivo] || 0) + 1;
    return contagem;
  }

  // Texto curto para a pessoa: quantos motores falharam e por quê. Nunca inclui conteúdo.
  function resumoDiagnostico(lista) {
    const tentativas = Array.isArray(lista) ? lista.slice(-LIMITE) : ler();
    const falhas = tentativas.filter((t) => t.motivo !== 'ok');
    if (!falhas.length) return '';
    const contagem = contarPorMotivo(falhas);
    const partes = Object.keys(contagem)
      .sort((a, b) => contagem[b] - contagem[a])
      .map((motivo) => (MOTIVOS[motivo] || motivo) + ' ×' + contagem[motivo]);
    const motores = Array.from(new Set(falhas.map((t) => t.m))).slice(0, 4).join(', ');
    return falhas.length + ' tentativa(s) sem resposta (' + partes.join(' · ') + '). Motores: ' + motores + '.';
  }

  function limparDiagnostico() {
    try {
      raiz.localStorage.removeItem(CHAVE);
    } catch (e) {}
  }

  const contrato = {
    CHAVE: CHAVE,
    LIMITE: LIMITE,
    MOTIVOS: Object.assign({}, MOTIVOS),
    nomeSeguro: nomeSeguro,
    nomeDoMotor: nomeDoMotor,
    motivoDeFalha: motivoDeFalha,
    registrarFalhaMotor: registrarFalhaMotor,
    registrarSucessoMotor: registrarSucessoMotor,
    resumoDiagnostico: resumoDiagnostico,
    limparDiagnostico: limparDiagnostico,
    lerDiagnostico: ler
  };

  if (raiz) raiz.DiagnosticoMotores = contrato;
  if (typeof module === 'object' && module.exports) module.exports = contrato;
}(typeof window === 'object' ? window : null));
