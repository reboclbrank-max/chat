// Roteiros operacionais locais da interface: sem token, motor, caixa, API ou rede.
// O texto é deliberadamente estático; estado técnico dinâmico continua nos canais `status:`.
(function () {
  'use strict';
  const NL = '\n';
  const ROTEIRO_TRABALHO = Object.freeze([
    '🧭 Trabalho da casa:',
    '• O Chat atende, vigia e mede pelos fluxos já configurados.',
    '• O Site tem rotinas de marketing configuradas com cadência e anti-spam; observações são naturais.',
    '• Próximo passo automático: as rotinas existentes seguem seus gatilhos; registrar somente sinais verificáveis.',
    '• Para você: nada obrigatório. Use o Chat normalmente quando quiser.',
    '• Para a fotografia técnica, use status: por e-mail ou Telegram.',
    'ℹ️ Roteiro local; não promete entrega, alcance, uso, satisfação ou SLA.'
  ].join(NL));

  function respostaComandoOperacionalLocal(entrada) {
    const texto = String(entrada || '').trim();
    return /^!?(?:trabalho|prioridades):?$/i.test(texto) ? ROTEIRO_TRABALHO : '';
  }

  window.respostaComandoOperacionalLocal = respostaComandoOperacionalLocal;
}());
