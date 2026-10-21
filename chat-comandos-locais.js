// Roteiros operacionais locais da interface: sem acesso, motor, caixa, API ou rede.
// O texto é deliberadamente estático; estado técnico dinâmico continua nos canais próprios.
(function (raiz) {
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

  const ROTEIRO_CENTRAL = Object.freeze([
    '⚙️ Central segura do Chat:',
    '• Já concentra conversa, Workspace local, lembretes, pesquisa pública, navegador isolado, estado e rotinas configuradas.',
    '• Testes: !testarchat pede somente a barreira aprovada do Chat; não altera código, segredos nem a branch principal.',
    '• Marketing permanece nas rotinas autorizadas do Site, com fatos e anti-spam; este roteiro não publica extra nem cria conta.',
    '• Próxima etapa: preparar mudança de repositório em branch, teste e revisão; ainda não há promoção cega para a branch principal.',
    '• Dependem de configuração concreta: e-mail novo, contas, backup externo, identidade pública, credenciais, gasto e permissões.',
    '• Use: operar: status | pesquisa | navegador | testes | repos | marketing | limites.',
    'ℹ️ Mapa local e fechado: não executa texto livre, não cria fila persistente e não promete entrega, uso, satisfação ou SLA.'
  ].join(NL));

  const DETALHES_CENTRAL = Object.freeze({
    status: '🩺 Estado técnico: use status: por e-mail ou Telegram. A Central não inventa telemetria nesta tela.',
    pesquisa: '🔎 Pesquisa: use pesquisa: <tema> por e-mail ou Telegram; fontes públicas continuam separadas de dados privados.',
    navegador: '🌐 Navegador: use navegar: <URL pública> por e-mail ou Telegram. A abertura continua isolada, sem login ou área privada.',
    testes: '🧪 Testes: nesta interface, !testarchat pede somente a barreira Testes rápidos do chat já aprovada. Exige o acesso já configurado neste navegador e não promove mudança.',
    repos: '🧩 Repositórios: esta etapa ainda não edita nem promove código. A próxima capacidade prevista é preparar uma mudança limitada em branch, executar testes e deixar revisão/rollback claros.',
    marketing: '📣 Marketing: a rotina autorizada vive no Site e preserva fatos, cadência e anti-spam. A Central não cria conta, não publica fora da rotina nem fabrica tráfego.',
    limites: '🔒 Limites: não há executor genérico, terminal remoto, segredo, conta nova, backup externo, gasto, permissão ou identidade pública sem configuração e guarda próprias.'
  });

  const PREFIXO_CENTRAL = /^!?(?:operar|opera(?:ç(?:ões|ão)|c(?:oes|ao))|central)(?:\s*:)?(?:\s|$)/i;
  const SO_CENTRAL = /^!?(?:operar|opera(?:ç(?:ões|ão)|c(?:oes|ao))|central):?$/i;

  function respostaComandoOperacionalLocal(entrada) {
    const texto = String(entrada || '').trim();
    if (/^!?(?:trabalho|prioridades):?$/i.test(texto)) return ROTEIRO_TRABALHO;
    if (SO_CENTRAL.test(texto)) return ROTEIRO_CENTRAL;
    if (!PREFIXO_CENTRAL.test(texto)) return '';
    const m = texto.match(/^!?(?:operar|opera(?:ç(?:ões|ão)|c(?:oes|ao))|central)\s*:\s*([a-z]+)\s*$/i);
    if (!m) return ROTEIRO_CENTRAL + NL + 'Use uma opção fechada depois dos dois-pontos; texto livre não é executado.';
    return DETALHES_CENTRAL[m[1].toLowerCase()] || ROTEIRO_CENTRAL + NL + 'Opção não reconhecida. Use uma das opções fechadas listadas acima.';
  }

  const contrato = Object.freeze({ respostaComandoOperacionalLocal, ROTEIRO_TRABALHO, ROTEIRO_CENTRAL });
  if (typeof module === 'object' && module.exports) module.exports = contrato;
  if (raiz) raiz.respostaComandoOperacionalLocal = respostaComandoOperacionalLocal;
}(typeof window === 'object' ? window : null));
