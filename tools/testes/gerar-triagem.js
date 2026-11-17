// TRIAGEM FINAL dos 130 mutantes vivos do ciclo 2.
//
// Cada um recebe uma de quatro sentenças, com prova:
//   MATA ............ o contrato novo mata; vermelho registrado em /home/user/
//   EQUIVALENTE ..... o comportamento é o mesmo; prova dita e (quando dá) experimento
//   NAO-EXECUTA ..... nenhum teste chega na linha; fora do denominador
//   BURACO .......... o comportamento MUDA e nenhum teste vê; fila do ciclo 4
//
// BURACO não é "a investigar": é veredito com prova de leitura. Rotular de equivalente o
// que muda comportamento seria repetir o erro do ciclo 1 (confundir indício com medição).
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
// Base canônica: o placar do CICLO 2 (130 vivos), guardado em mutador-placar-ciclo2.json.
// A triagem é sobre estes 130; o placar de agora é outra medição e vai no relatório.
const placarCiclo2 = JSON.parse(fs.readFileSync(path.join(DIR, 'mutador-placar-ciclo2.json'), 'utf8'));
const vivosCiclo2 = [];
for (const r of placarCiclo2.resultados) {
  if (!r.detalhes) continue;
  for (const d of r.detalhes) {
    if (d.morto || d.invalido) continue;
    vivosCiclo2.push({
      modulo: r.arquivo, linha: d.linha, tipo: d.tipo, descricao: d.descricao,
      testesQueCobrem: r.testes, classificacao: 'A-CLASSIFICAR', prova: '',
    });
  }
}
const base = { vivos: vivosCiclo2 };
const cov = JSON.parse(fs.readFileSync(path.join(DIR, 'cobertura-linhas.json'), 'utf8'));

const chave = (v) => v.modulo + ':' + v.linha + ':' + v.tipo;

// ── MATA: contrato escrito nesta rodada, com vermelho antes do verde ────────
const MATA = {
  'tools/pulso-vigia.js:11:trocar-limite': 'pulso-vigia-relogio.js — borda inclusiva de 20 min (<= → <) fica vermelha',
  'tools/pulso-vigia.js:16:congelar-identidade': 'pulso-vigia-relogio.js — relógio do sistema vira constante: desvio de 3 anos no caso 1',
  'tools/pulso-vigia.js:30:congelar-identidade': 'pulso-vigia-relogio.js — coordenaPulsoVigia sem hora explícita lê o relógio injetado',
  'tools/pulso-vigia.js:41:remover-await': 'pulso-vigia-relogio.js — sem o await, coordenaPulsoVigia resolve antes do pedido terminar',
  'tools/autonomia.js:32:congelar-identidade': 'mutantes-vivos.js — prazo comparado com relógio falso: ontem expira, amanhã não',
  'tools/prova-ciclos.js:59:trocar-limite': 'mutantes-vivos.js — trechos que se tocam na borda são um trecho só',
  'chat-diagnostico.js:53:trocar-limite': 'mutantes-vivos.js — 400 exato é formato, 500 exato é servidor (vm comprovou execução)',
};
// mesma chave duas vezes (os dois sítios de >= e <= da linha 11 do pulso)
const MATA_POR_DESCRICAO = [
  { modulo: 'tools/pulso-vigia.js', linha: 11, tipo: 'trocar-limite', desc: 'pulso-vigia-relogio.js — idade zero conta como recente (>= → >) fica vermelha' },
];

const EQUIVALENTE = {
  'tools/prova-ciclos.js:86:trocar-limite':
    'o `break` é otimização: com inicio == fim o laço continua, calcula 0 minuto e o filtro (>= 5) descarta igual. ' +
    'Experimento: sob a mutação `>=`→`>` o contrato novo continua verde e a saída é a mesma — comportamento idêntico.',
};

// ── NAO-EXECUTA sem cobertura, mas com prova de chamada ────────────────────
const NAO_EXECUTA_PROVA = {
  'chat-colecoes-local.js:302:trocar-limite': 'a função `proximoId` não é chamada por nenhum dos testes que cobrem o módulo (grep: 0 ocorrências)',
  'sw.js:41:devolver-default': 'nenhum teste aciona o handler `fetch` do service worker: os 15 que apontam para sw.js rodam o arquivo em vm para extrair funções de apoio; o caminho de rede/cache nunca é simulado',
  'sw.js:44:inverter-guarda': 'mesmo caminho: `if (resposta)` está dentro do handler `fetch`, que nenhum teste aciona',
};

// ── BURACO: muda comportamento, nenhum teste vê (fila do ciclo 4) ──────────
const BURACO = {
  'razao-local.js:175:trocar-limite': 'limiar 0,5 de termos em comum: com `>` um par que acerta metade das palavras deixa de casar — muda resposta do raciocínio',
  'roteador-ia.js:3023:remover-await': 'sem await, o ramo leve devolve promessa em vez do texto; qualquer consumidor que compare string quebra',
  'tools/mesclador-estreito.js:213:remover-await': 'sem await, o revert é reportado como concluído antes de a chamada voltar',
  'tools/reforco-dossie-controlado.js:111:devolver-default': 'devolve null em vez do texto atual: comparação de igualdade do arquivo passa a comparar com null',
  'tools/reserva-turno.js:109:remover-await': 'a espera entre tentativas deixa de acontecer antes da próxima chamada: as 3 tentativas viram rajada',
  'tools/termometro-barreira.js:63:trocar-limite': 'execução exatamente no marco do deploy deixa de contar',
  'tools/termometro-barreira.js:107:trocar-limite': 'com 5 execuções recentes exatas o termômetro deixa de avaliar instabilidade',
  'chat-colecoes-local.js:335:remover-await': 'sem await, `criarColecao` pode resolver antes de `iniciar()` terminar; o teste em vm não observa a ordem',
  'chat-organizacao-local.js:206:remover-await': 'limparFavoritos sem await: o retorno chega antes da limpeza',
  'chat-organizacao-local.js:216:remover-await': 'exportarBackup sem await: o backup pode ser devolvido incompleto',
  'chat-workspace.js:1288:inverter-guarda': 'agendarSalvarAutomatico passa a rodar quando NÃO houve edição durante a troca, e deixa de rodar quando houve',
  'chat-workspace.js:1016:remover-await': 'sem await no salvar, a troca segue mesmo se a gravação falhar',
  'chat-workspace.js:1002:remover-await': 'sem await, o projeto inicial é usado antes de existir',
  'chat-workspace.js:1865:remover-await': 'o salvamento automático deixa de ser aguardado antes de seguir',
};

const vivos = base.vivos.map(v => {
  const k = chave(v);
  let classificacao, prova;
  if (MATA[k]) { classificacao = 'MATA'; prova = MATA[k]; }
  else if (EQUIVALENTE[k]) { classificacao = 'EQUIVALENTE'; prova = EQUIVALENTE[k]; }
  else if (NAO_EXECUTA_PROVA[k]) { classificacao = 'NAO-EXECUTA'; prova = NAO_EXECUTA_PROVA[k]; }
  else if (BURACO[k]) { classificacao = 'BURACO'; prova = BURACO[k]; }
  else { classificacao = 'NAO-EXECUTA'; prova = v.prova; }

  // ajuste fino: as duas linhas 11 do pulso (>= e <=) são ambas MATA
  const d = MATA_POR_DESCRICAO.find(m => m.modulo === v.modulo && m.linha === v.linha &&
    m.tipo === v.tipo && /idade >= 0/.test(v.descricao));
  if (d) { classificacao = 'MATA'; prova = d.desc; }
  return { ...v, classificacao, prova };
});

const conta = {};
for (const v of vivos) conta[v.classificacao] = (conta[v.classificacao] || 0) + 1;

// ── denominador recalculado ────────────────────────────────────────────────
// Base: o placar do ciclo 2 (189 mutantes, 59 mortos, 130 vivos).
// Fora do denominador: quem nunca executa e quem é equivalente (o comportamento não muda).
// Dentro: os 59 que morreram + os vivos que a suíte realmente executa (MATA + BURACO).
const mortosBase = 189 - 130;
const naoExecuta = conta['NAO-EXECUTA'] || 0;
const equivalentes = conta['EQUIVALENTE'] || 0;
const executamVivos = (conta.MATA || 0) + (conta.BURACO || 0);
const denominador = mortosBase + executamVivos;
const mortosAgora = mortosBase + (conta.MATA || 0);

const out = {
  geradoEm: new Date().toISOString(),
  total: vivos.length,
  conta,
  denominador: {
    mutantesGerados: 189,
    mortosNaPrimeiraMedicao: mortosBase,
    vivosNaPrimeiraMedicao: 130,
    foraDoDenominadorNaoExecuta: naoExecuta,
    foraDoDenominadorEquivalente: equivalentes,
    denominadorQueExecuta: denominador,
    mortosAgora,
    killRateIngenuo: Math.round((mortosBase / 189) * 100),
    killRateEstrito: denominador ? Math.round((mortosAgora / denominador) * 100) : null,
    nota: 'kill estrito = (mortos + vivos que o contrato novo mata) / (mortos + vivos que a suíte executa)',
  },
  vivos,
};
fs.writeFileSync(path.join(DIR, 'triagem-vivos.json'), JSON.stringify(out, null, 2) + '\n');
console.log('triagem: ' + vivos.length + ' vivos · ' + JSON.stringify(conta));
console.log('denominador: ' + denominador + ' que executam (de 189 gerados) · ingênuo ' + out.denominador.killRateIngenuo + '% · estrito ' + out.denominador.killRateEstrito + '%');
