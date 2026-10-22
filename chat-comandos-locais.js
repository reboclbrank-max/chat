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
    '• Status da barreira: !statuscentral apenas lê o estado fechado mais recente de !testarchat; não pede execução, retry, código, branch ou promoção.',
    '• Preparo: !prepararchat pede somente uma auditoria interna fixa; ela decide se há base técnica para revisão, sem criar branch ou código.',
    '• Dossiê: !dossiechat pede uma receita de escrita estreita. Depois das cinco guardas, ela pode criar um ramo isolado contendo apenas um dossiê estático para revisão humana; não cria código, PR, merge ou promoção.',
    '• Reforço de código: !reforcardossie pede a única receita 3A. Depois das guardas fixas, ela pode abrir um ramo com o patch literal que endurece o escopo staged do dossiê, seu teste e um relatório; não aceita tarefa, caminho, patch, comando ou texto livre.',
    '• Marketing permanece nas rotinas autorizadas do Site, com fatos e anti-spam; este roteiro não publica extra nem cria conta.',
    '• Próxima etapa: somente outra receita fechada, desenhada e revisada, poderia preparar outra mudança reversível; ainda não há promoção cega para a branch principal.',
    '• Dependem de configuração concreta: e-mail novo, contas, backup externo, identidade pública, credenciais, gasto e permissões.',
    '• Use: operar: status | pesquisa | navegador | testes | statuscentral | preparo | dossie | reforco | repos | marketing | limites.',
    'ℹ️ Mapa local e fechado: não executa texto livre, não cria fila persistente e não promete entrega, uso, satisfação ou SLA.'
  ].join(NL));

  const DETALHES_CENTRAL = Object.freeze({
    status: '🩺 Estado técnico: use status: por e-mail ou Telegram. A Central não inventa telemetria nesta tela.',
    pesquisa: '🔎 Pesquisa: use pesquisa: <tema> por e-mail ou Telegram; fontes públicas continuam separadas de dados privados.',
    navegador: '🌐 Navegador: use navegar: <URL pública> por e-mail ou Telegram. A abertura continua isolada, sem login ou área privada.',
    testes: '🧪 Testes: nesta interface, !testarchat pede somente a barreira Testes rápidos do chat já aprovada. Exige o acesso já configurado neste navegador e não promove mudança.',
    statuscentral: '🔎 Status da barreira: nesta interface, !statuscentral consulta somente o run mais recente de `testes-rapidos.yml@main` e mostra fila, em execução, êxito, falha ou indisponível. Não recebe argumento, não lê log, não pede execução/retry e não altera código, branch ou promoção.',
    preparo: '🧩 Preparo: nesta interface, !prepararchat pede somente a auditoria interna fixa. Ela roda guardas fechadas e devolve um resumo sanitizado; não aceita tarefa livre, não cria branch, código ou promoção.',
    dossie: '🧾 Dossiê: nesta interface, !dossiechat pede exclusivamente a receita fixa que primeiro executa cinco guardas e, só se passarem, pode criar um ramo novo com um único dossiê estático. Não aceita tarefa livre, não altera código, não abre PR e não promove main; revisão humana e apagar o ramo continuam obrigatórios.',
    reforco: '🛡️ Reforço: nesta interface, !reforcardossie pede somente `reforco_dossie_escopo_v1`. A receita tem catálogo de uma entrada, repositório/ref e três caminhos literais; ela valida a base e pode criar `central/reforco-dossie-<execução>` com um patch de workflow/teste e relatório sanitizado. Não recebe conversa, segredo, tarefa, caminho, patch ou comando livre; não cria PR, merge, tag, release ou promoção. Revisão humana e apagar o ramo continuam obrigatórios.',
    repos: '🧩 Repositórios: esta Central não edita nem promove código livre. !dossiechat pode criar somente um artefato estático no ramo reversível `central/dossie-preparo-<execução>`. A única receita de código 3A é !reforcardossie e só pode preparar os três caminhos literais em `central/reforco-dossie-<execução>`; qualquer outra mudança de código continua exigindo receita e revisão próprias.',
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
