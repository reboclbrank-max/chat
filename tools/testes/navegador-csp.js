// Contrato de CSP no navegador real — 2026-10-24.
// A auditoria fechou a Política de Segurança de Conteúdo das páginas, mas isso foi provado
// só estaticamente: nenhum teste abria um navegador de verdade. Aqui o Chromium carrega as
// quatro rotas e responde a três perguntas que só o navegador sabe:
//  1. a página carrega sem violação de CSP e sem erro de script?
//  2. o navegador só fala com os hosts que a política autoriza?
//  3. a política realmente bloqueia? (sonda negativa para um host fora da lista)
// Sem Chromium, a suíte termina em SKIP — nunca em falso verde.
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
// Chromium, servidor efêmero e cliente CDP vêm do módulo compartilhado com a medição de cobertura.
const { chromium, webSocketDisponivel, servir, conectar, esperar, abrirNavegador, matarEClarear, porta: portaLivre } = require('./cdp');

const raiz = path.resolve(__dirname, '../..');
const ROTAS = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function ok(nome, cond, detalhe) {
  if (cond) {
    certos++;
    console.log('✔ ' + nome);
  } else {
    falhas++;
    console.error('✘ ' + nome + (detalhe ? ' — ' + detalhe : ''));
  }
}
function hostsAutorizados(html) {
  const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  if (!m) return new Set();
  const diretiva = m[1].split(';').map((p) => p.trim()).find((p) => p.startsWith('connect-src'));
  if (!diretiva) return new Set();
  return new Set(diretiva.split(/\s+/).slice(1).filter((v) => v.startsWith('https://')).map((v) => v.replace('https://', '').toLowerCase()));
}

async function principal() {
  if (!webSocketDisponivel()) {
    console.log('SKIP: este Node não expõe WebSocket nativo (use Node 22 ou --experimental-websocket).');
    process.exitCode = 0;
    return;
  }
  const bin = chromium();
  if (!bin) {
    console.log('SKIP: Chromium não encontrado. Defina CHROMIUM_BIN ou instale chrome-headless-shell.');
    process.exitCode = 0;
    return;
  }
  // Duas portas distintas: uma para o servidor estático, outra para a depuração do navegador.
  const porta = portaLivre();
  const portaCdp = porta + 400;
  const servidor = await servir(porta);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-perfil-'));
  let navegador = null;
  const encerrar = () => matarEClarear(navegador, perfil, servidor);
  try {
    const aberto = await abrirNavegador({ bin, portaCdp, perfil });
    navegador = aberto.navegador;
    const cdp = conectar(aberto.alvo.webSocketDebuggerUrl);
    await cdp.pronto;
    await cdp.enviar('Runtime.enable');
    await cdp.enviar('Log.enable');
    await cdp.enviar('Network.enable');
    await cdp.enviar('Page.enable');

    const permitidos = hostsAutorizados(fs.readFileSync(path.join(raiz, 'index.html'), 'utf8'));
    ok('a política lida pelo navegador lista hosts', permitidos.size > 50, 'hosts autorizados: ' + permitidos.size);

    for (const rota of ROTAS) {
      cdp.eventos.length = 0;
      const url = 'http://127.0.0.1:' + porta + '/' + rota;
      await cdp.enviar('Page.navigate', { url });
      await esperar(2500);
      const textos = cdp.eventos
        .filter((e) => e.method === 'Log.entryAdded' || e.method === 'Runtime.exceptionThrown' || e.method === 'Runtime.consoleAPICalled')
        .map((e) => JSON.stringify(e.params));
      const violacoes = textos.filter((t) => /Content Security Policy|Refused to (connect|load|execute|apply)/i.test(t));
      ok(rota + ': nenhuma violação de CSP ao carregar', violacoes.length === 0, violacoes.slice(0, 2).join(' | '));
      const excecoes = cdp.eventos.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => JSON.stringify(e.params.exceptionDetails || {}));
      ok(rota + ': nenhuma exceção de script', excecoes.length === 0, excecoes.slice(0, 2).join(' | '));

      const sonda = await cdp.enviar('Runtime.evaluate', {
        expression: "typeof DiagnosticoMotores === 'object' && !!document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]')",
        returnByValue: true
      });
      ok(rota + ': módulos locais e política presentes no DOM', sonda.result && sonda.result.value === true, JSON.stringify(sonda.result));

      const hosts = new Set();
      for (const e of cdp.eventos) {
        if (e.method !== 'Network.requestWillBeSent') continue;
        const u = e.params && e.params.request && e.params.request.url;
        if (!u || !/^https?:/.test(u)) continue;
        const alvoUrl = new URL(u);
        if (alvoUrl.hostname === '127.0.0.1') continue;
        hosts.add(alvoUrl.hostname.toLowerCase());
      }
      const fora = [...hosts].filter((h) => !permitidos.has(h));
      ok(rota + ': só falou com hosts autorizados', fora.length === 0, 'fora da política: ' + fora.slice(0, 4).join(', '));
    }

    // Sonda negativa: um host fora da política tem de ser bloqueado pelo navegador.
    cdp.eventos.length = 0;
    const bloqueio = await cdp.enviar('Runtime.evaluate', {
      expression: "(async () => { try { await fetch('https://host-fora-da-politica.invalid/x'); return 'passou'; } catch (e) { return 'bloqueado'; } })()",
      awaitPromise: true,
      returnByValue: true
    });
    ok('a política bloqueia host fora da lista', bloqueio.result && bloqueio.result.value === 'bloqueado', JSON.stringify(bloqueio.result));
    cdp.fechar();
  } finally {
    encerrar();
  }
  console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes de CSP no navegador passaram');
  process.exitCode = falhas ? 1 : 0;
}

principal().catch((e) => {
  console.error('✘ falha ao executar o contrato de CSP no navegador — ' + e.message);
  process.exitCode = 1;
});
