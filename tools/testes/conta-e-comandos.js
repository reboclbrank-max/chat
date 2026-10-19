// 🧪 v12.19: comandos locais e status: causal sanitizado; sem motor e sem tráfego externo.
const CHAT = require(require('path').resolve(process.argv[2]));
let ok = 0, total = 0;
const falhas = [];
async function t(nome, entrada, re) {
  total++;
  try {
    const r = await CHAT.ferramenta(entrada);
    if (re.test(String(r || ''))) ok++; else falhas.push(nome + ' → ' + String(r).slice(0, 120));
  } catch (e) { falhas.push(nome + ' → ERRO ' + String(e.message || e).slice(0, 80)); }
}
function confere(nome, condicao) {
  total++;
  if (condicao) ok++; else falhas.push(nome);
}
(async () => {
  await t('conta: parênteses + decimal com vírgula', 'conta: (1250*0,15)+80', /267,5/);
  await t('conta: x como vezes', 'conta: 7x8', /56/);
  await t('conta: potência', 'conta: 2^10', /1\.024/);
  await t('conta: porcentagem', 'conta: 20% de 150', /30/);
  await t('conta: divisão', 'conta: 10/4', /2,5/);
  await t('conta: milhar pt-BR', 'conta: 1.250+100', /1\.350/);
  await t('conta: calc: apelido', 'calc: 5*5', /25/);
  await t('conta: lixo → ajuda amigável (não inventa)', 'conta: banana', /Não consegui ler/);
  await t('conta: divisão por zero → ajuda amigável', 'conta: 1/0', /Não consegui ler/);
  await t('conta: vazia → ajuda amigável', 'conta:', /Não consegui ler/);
  await t('ajuda: lista o comando conta:', 'ajuda', /conta:/);
  await t('ajuda: lista feriado: e cep:', 'comandos', /feriado:|cep:/);
  await t('ajuda: lista navegar:', 'ajuda', /navegar:/);
  await t('ajuda: lista divisas, capital e região:', 'ajuda', /divisas:.*capital:.*região:/s);
  await t('divisas: Bahia responde localmente', 'divisas: Bahia', /Bahia.*8 unidade/);
  await t('capital: Bahia responde localmente', 'capital: Bahia', /Salvador/);
  await t('região: Nordeste responde localmente', 'região: Nordeste', /9 unidade.*Sergipe/);

  // Lista fechada: todos os códigos públicos conhecidos ganham rótulo humano, sem expor
  // chaves extras nem conteúdo arbitrário do JSON remoto.
  const agoraStatus = Date.UTC(2026, 9, 19, 12, 0, 0);
  const estadoCausal = {
    verificado_em: '2026-10-19T12:00:00.000Z',
    itens: {
      'Página do chat': { ok: false, causa: 'sem-execucao' },
      'Site oficial': { ok: false, causa: 'turno-ausente' },
      'Casa postando (site)': { ok: false, causa: 'bateria-atrasada' },
      'Chat por e-mail (24h)': { ok: false, causa: 'caixa-atrasada' },
      'Bateria do cérebro': { ok: false, causa: 'api-indisponivel' },
      'itch Ceifalume': { ok: false, causa: 'fila-estagnada' },
      'itch Prancheta': { ok: false, causa: 'execucao-falhou' },
      'Caixa de e-mail': { ok: false, causa: 'sonda-indisponivel' }
    },
    recuperacoes: {
      email: { ultima_tentativa_em: '2026-10-19T11:30:00.000Z' },
      exame: { ultima_tentativa_em: '2026-10-19T08:00:00.000Z' }
    }
  };
  const resumoCausal = CHAT.resumoEstadoVigiaPublico(estadoCausal, agoraStatus);
  for (const trecho of [
    'sem execução recente — recuperação interna elegível',
    'turno ausente/atrasado — recuperação interna elegível',
    'bateria atrasada — recuperação interna elegível',
    'caixa aguardando resposta — recuperação interna elegível',
    'sonda da API indisponível — sem ação cega',
    'fila sem executor — sem adicionar trabalho',
    'última execução falhou — sem reexecutar às cegas',
    'sonda limitada — sem ação automática',
    'Contenção de recuperação: e-mail até 2026-10-19 12:30 UTC · bateria até 2026-10-19 14:00 UTC'
  ]) confere('status causal: ' + trecho.slice(0, 34), resumoCausal.includes(trecho));
  const resumoHostil = CHAT.resumoEstadoVigiaPublico({
    verificado_em: 'DADO-ARBITRARIO-NAO-REFLETIR',
    itens: {
      'Página do chat': { ok: false, causa: 'DADO-ARBITRARIO-NAO-REFLETIR' },
      'Chave não prevista DADO-ARBITRARIO-NAO-REFLETIR': { ok: true }
    },
    recuperacoes: {
      email: { ultima_tentativa_em: '2099-10-19T12:00:00.000Z' },
      'DADO-ARBITRARIO-NAO-REFLETIR': { ultima_tentativa_em: '2026-10-19T12:00:00.000Z' }
    }
  }, agoraStatus);
  confere('status causal: causa desconhecida vira fallback neutro', resumoHostil.includes('diagnóstico sanitizado indisponível'));
  confere('status causal: conteúdo arbitrário nunca é refletido', !resumoHostil.includes('DADO-ARBITRARIO-NAO-REFLETIR'));
  confere('status causal: relógio futuro não inventa contenção', !resumoHostil.includes('Contenção de recuperação'));

  const fetchOriginal = global.fetch;
  global.fetch = async () => { throw new Error('rede não deveria ser chamada'); };
  await t('geografia natural responde sem rede nem motor', 'Qual estado brasileiro faz fronteira com o MAIOR número de outros estados?', /Bahia.*8/);
  await t('capital natural responde sem rede nem motor', 'Qual a capital de Sergipe?', /Aracaju/);
  global.fetch = fetchOriginal;
  // Exercita a leitura pública sem sair da máquina: status: deve usar o mesmo resumo seguro.
  // O relógio é relativo aqui para que a contenção não dependa da hora em que a regressão roda.
  const estadoCausalDaRota = JSON.parse(JSON.stringify(estadoCausal));
  const agoraDaRota = Date.now();
  estadoCausalDaRota.verificado_em = new Date(agoraDaRota).toISOString();
  estadoCausalDaRota.recuperacoes.email.ultima_tentativa_em = new Date(agoraDaRota - 30 * 60 * 1000).toISOString();
  estadoCausalDaRota.recuperacoes.exame.ultima_tentativa_em = new Date(agoraDaRota - 4 * 60 * 60 * 1000).toISOString();
  let leiturasStatus = 0;
  global.fetch = async (url) => {
    if (url !== 'https://raw.githubusercontent.com/reboclbrank-max/chat/main/vigia-estado.json') throw new Error('URL inesperada');
    leiturasStatus++;
    return { ok: true, json: async () => estadoCausalDaRota };
  };
  await t('status: lê estado público e explica a contenção', 'status:', /Estado técnico da casa[\s\S]*sem execução recente[\s\S]*Contenção de recuperação/);
  confere('status: faz somente a leitura pública esperada', leiturasStatus === 1);
  global.fetch = async () => ({ ok: false, json: async () => ({}) });
  await t('status: falha HTTP sem inventar saúde', 'status:', /Não consegui ler o estado técnico agora/);
  global.fetch = async () => ({ ok: true, json: async () => { throw new Error('JSON malformado simulado'); } });
  await t('status: JSON malformado devolve fallback seguro', 'status:', /Não consegui ler o estado técnico agora/);
  global.fetch = fetchOriginal;
  await t('navegar: bloqueia IP privado antes de qualquer fila', 'navegar: http://127.0.0.1/', /Não abri: endereço privado não é permitido/);
  await t('hora: segue no ar', 'hora: brasilia', /🕐/);
  for (const f of falhas) console.log('✘ ' + f);
  console.log(ok + '/' + total + ' certos');
  if (ok !== total) process.exitCode = 1;
})();
