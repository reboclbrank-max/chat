#!/usr/bin/env node
// Cobertura real do JavaScript que roda no navegador — 2026-10-24.
//
// PROBLEMA: o `c8` mede só `tools/`, `chat-*.js` e `sw.js`. O código que a pessoa de fato
// executa está inline nas quatro páginas (~496 KB em cada) e nunca entrou em nenhuma conta:
// dizer "77% de cobertura" dava a impressão de que a interface estava medida, e não estava.
//
// SOLUÇÃO: abrir as quatro rotas em Chromium headless com o profiler preciso do CDP ligado e
// contar, linha a linha, o que executou no carregamento da página. Isto mede o boot (HTML,
// módulos locais, registro de eventos), não a interação — sem token, sem conversa e sem rede
// externa. É medição opt-in: `npm run cobertura-paginas`.
//
// Regras para o número não virar enfeite:
//  - o script tem de ser da própria origem; extensão e terceiro ficam fora;
//  - linhas vazias e comentários não contam como código;
//  - se a medição devolver 100%, o relatório avisa que ela não está discriminando nada;
//  - sem Chromium, termina em SKIP — nunca em zero silencioso.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium, webSocketDisponivel, servir, conectar, esperar, abrirNavegador, matarEClarear, porta: portaLivre } = require('./testes/cdp');

const RAIZ = path.resolve(__dirname, '..');
const ROTAS = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];

// ---------------- medição ----------------

// Offsets de início de cada linha, para traduzir os ranges do CDP em números de linha.
function inicioDasLinhas(fonte) {
  const linhas = fonte.split('\n');
  const inicios = [0];
  let posicao = 0;
  for (let i = 0; i < linhas.length - 1; i++) {
    posicao += linhas[i].length + 1;
    inicios.push(posicao);
  }
  return inicios;
}

function linhaDoOffset(inicios, offset) {
  let baixo = 0;
  let alto = inicios.length - 1;
  while (baixo < alto) {
    const meio = Math.ceil((baixo + alto) / 2);
    if (inicios[meio] <= offset) baixo = meio;
    else alto = meio - 1;
  }
  return baixo;
}

// Linha conta como código quando não é vazia nem comentário (heurística simples e declarada).
function ehLinhaDeCodigo(linha) {
  const t = linha.trim();
  if (!t) return false;
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return false;
  return true;
}

function medirScript(fonte, funcoes) {
  const inicios = inicioDasLinhas(fonte);
  const linhas = fonte.split('\n');
  let funcoesTotais = 0;
  let funcoesChamadas = 0;
  // Todos os ranges, achatados. O range que envolve o script inteiro tem sempre count > 0
  // (o script executou), e usá-lo marcaria todas as linhas: por isso cada linha só é julgada
  // pelo range MENOR que a contém — o bloco mais específico de onde ela vive.
  const ranges = [];
  for (const funcao of funcoes) {
    // O CDP entrega também blocos anônimos (`if`, laços, callbacks) como itens sem nome.
    // Contar esses blocos como “funções” inflaria o denominador, então a métrica pública é de
    // funções NOMEADAS — e o relatório diz isso com essas palavras.
    if (funcao.functionName !== '') {
      funcoesTotais++;
      if (funcao.ranges.some((r) => r.count > 0)) funcoesChamadas++;
    }
    for (const range of funcao.ranges) ranges.push(range);
  }
  function contagemDaLinha(offset) {
    let melhor = null;
    for (const range of ranges) {
      if (offset < range.startOffset || offset >= range.endOffset) continue;
      if (!melhor || (range.endOffset - range.startOffset) < (melhor.endOffset - melhor.startOffset)) melhor = range;
    }
    return melhor ? melhor.count : 0;
  }
  let linhaTotal = 0;
  let linhaCoberta = 0;
  linhas.forEach((linha, i) => {
    if (!ehLinhaDeCodigo(linha)) return;
    linhaTotal++;
    const recuo = linha.length - linha.trimStart().length;
    const offset = inicios[i] + recuo;
    if (contagemDaLinha(offset) > 0) linhaCoberta++;
    else if (contagemDaLinha(inicios[i]) > 0) linhaCoberta++;
  });
  return { linhaTotal, linhaCoberta, funcoesTotais, funcoesChamadas };
}

// Junta a medição de várias cargas do mesmo arquivo (index.html aparece nas quatro rotas).
function acumular(acumulado, chave, medida) {
  if (!acumulado.has(chave)) {
    acumulado.set(chave, { linhaTotal: 0, linhaCoberta: 0, funcoesTotais: 0, funcoesChamadas: 0, cargas: 0 });
  }
  const alvo = acumulado.get(chave);
  // A medição é a mesma fonte em cargas diferentes: vale a maior cobertura observada, que é
  // a união do que executou. Guardar o máximo evita somar as mesmas linhas duas vezes.
  alvo.linhaTotal = Math.max(alvo.linhaTotal, medida.linhaTotal);
  alvo.linhaCoberta = Math.max(alvo.linhaCoberta, medida.linhaCoberta);
  alvo.funcoesTotais = Math.max(alvo.funcoesTotais, medida.funcoesTotais);
  alvo.funcoesChamadas = Math.max(alvo.funcoesChamadas, medida.funcoesChamadas);
  alvo.cargas++;
}

function porcento(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

function nomeCurto(url, origem) {
  if (!origem || !url.startsWith(origem)) return url;
  return url.slice(origem.length).replace(/^\//, '') || '(pagina)';
}

// ---------------- execução ----------------

async function principal(argv) {
  const querJson = argv.includes('--json');
  if (!webSocketDisponivel()) {
    console.log('SKIP: este Node não expõe WebSocket nativo (use Node 22 ou --experimental-websocket).');
    return 0;
  }
  const bin = chromium();
  if (!bin) {
    console.log('SKIP: Chromium não encontrado. Defina CHROMIUM_BIN ou instale chrome-headless-shell.');
    return 0;
  }
  const porta = portaLivre(7);
  const portaCdp = porta + 400;
  const servidor = await servir(porta, RAIZ);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'cob-perfil-'));
  let navegador = null;
  const limpar = () => matarEClarear(navegador, perfil, servidor);
  try {
    const aberto = await abrirNavegador({ bin, portaCdp, perfil });
    navegador = aberto.navegador;
    const cdp = conectar(aberto.alvo.webSocketDebuggerUrl);
    await cdp.pronto;
    await cdp.enviar('Runtime.enable');
    await cdp.enviar('Page.enable');
    await cdp.enviar('Debugger.enable');
    await cdp.enviar('Profiler.enable');
    await cdp.enviar('Profiler.setSamplingInterval', { interval: 100 });

    const origem = 'http://127.0.0.1:' + porta;
    const fontes = new Map();
    const acumulado = new Map();

    for (const rota of ROTAS) {
      await cdp.enviar('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      await cdp.enviar('Page.navigate', { url: origem + '/' + rota });
      // Espera o load e um respiro para os módulos locais registrarem seus eventos.
      await esperar(3000);
      const cobertura = await cdp.enviar('Profiler.takePreciseCoverage');
      await cdp.enviar('Profiler.stopPreciseCoverage');
      for (const script of (cobertura.result || [])) {
        if (!script.url || !script.url.startsWith(origem)) continue;
        if (!fontes.has(script.scriptId)) {
          const { scriptSource } = await cdp.enviar('Debugger.getScriptSource', { scriptId: script.scriptId });
          fontes.set(script.scriptId, scriptSource || '');
        }
        const fonte = fontes.get(script.scriptId);
        if (!fonte || fonte.length < 200) continue; // casca vazia ou script mínimo não ajuda a medir
        acumular(acumulado, nomeCurto(script.url, origem), medirScript(fonte, script.functions || []));
      }
    }
    cdp.fechar();

    const linhas = [...acumulado.entries()]
      .map(([nome, m]) => ({
        arquivo: nome,
        linhas: m.linhaTotal,
        cobertas: m.linhaCoberta,
        linhasPct: porcento(m.linhaCoberta, m.linhaTotal),
        funcoes: m.funcoesTotais,
        funcoesChamadas: m.funcoesChamadas,
        funcoesPct: porcento(m.funcoesChamadas, m.funcoesTotais),
        cargas: m.cargas
      }))
      .sort((a, b) => b.linhas - a.linhas);

    const totalLinhas = linhas.reduce((s, l) => s + l.linhas, 0);
    const totalCobertas = linhas.reduce((s, l) => s + l.cobertas, 0);
    const totalFuncoes = linhas.reduce((s, l) => s + l.funcoes, 0);
    const totalChamadas = linhas.reduce((s, l) => s + l.funcoesChamadas, 0);

    if (querJson) {
      console.log(JSON.stringify({
        medido: new Date().toISOString(),
        modo: 'carregamento das quatro rotas em Chromium headless',
        rotas: ROTAS,
        arquivos: linhas,
        total: {
          linhas: totalLinhas,
          cobertas: totalCobertas,
          linhasPct: porcento(totalCobertas, totalLinhas),
          funcoes: totalFuncoes,
          funcoesChamadas: totalChamadas,
          funcoesPct: porcento(totalChamadas, totalFuncoes)
        }
      }, null, 2));
    } else {
      console.log('📈 Cobertura real no navegador — carregamento das quatro rotas (Chromium headless)\n');
      const largura = Math.max(...linhas.map((l) => l.arquivo.length), 7);
      console.log('  ' + 'arquivo'.padEnd(largura) + '   linhas       funções nomeadas');
      for (const l of linhas) {
        console.log('  ' + l.arquivo.padEnd(largura) +
          '   ' + String(l.cobertas + '/' + l.linhas).padStart(9) + ' ' + String(l.linhasPct + '%').padStart(6) +
          '   ' + String(l.funcoesChamadas + '/' + l.funcoes).padStart(9) + ' ' + String(l.funcoesPct + '%').padStart(6));
      }
      console.log('\n  TOTAL'.padEnd(largura + 3) +
        '   ' + String(totalCobertas + '/' + totalLinhas).padStart(9) + ' ' + String(porcento(totalCobertas, totalLinhas) + '%').padStart(6) +
        '   ' + String(totalChamadas + '/' + totalFuncoes).padStart(9) + ' ' + String(porcento(totalChamadas, totalFuncoes) + '%').padStart(6));
      console.log('\n  Mede o que executa no carregamento; clique, digitação e envio não entram.');
      console.log('  “Funções nomeadas” ignora blocos anônimos (if, laço, callback) que o CDP também reporta.');
      if (porcento(totalCobertas, totalLinhas) >= 100) {
        console.log('  ⚠ 100% não discrimina nada: revise a medição antes de usar este número.');
      }
      console.log('  Sem Chromium esta medição termina em SKIP, nunca em zero silencioso.');
    }
    return 0;
  } finally {
    limpar();
  }
}

if (require.main === module) {
  principal(process.argv.slice(2))
    .then((codigo) => { process.exitCode = codigo; })
    .catch((e) => {
      console.error('✘ falha ao medir cobertura no navegador — ' + e.message);
      process.exitCode = 1;
    });
}

module.exports = { medirScript, inicioDasLinhas, linhaDoOffset, ehLinhaDeCodigo, porcento };
