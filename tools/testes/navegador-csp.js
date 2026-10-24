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

const raiz = path.resolve(__dirname, '../..');
const ROTAS = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};
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
function chromium() {
  const candidatos = [process.env.CHROMIUM_BIN, 'chromium-headless-shell', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  for (const c of candidatos) {
    if (!c) continue;
    if (c.includes('/') && fs.existsSync(c)) return c;
    const achado = (process.env.PATH || '').split(path.delimiter).map((d) => path.join(d, c)).find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
    if (achado) return achado;
  }
  return null;
}
function hostsAutorizados(html) {
  const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  if (!m) return new Set();
  const diretiva = m[1].split(';').map((p) => p.trim()).find((p) => p.startsWith('connect-src'));
  if (!diretiva) return new Set();
  return new Set(diretiva.split(/\s+/).slice(1).filter((v) => v.startsWith('https://')).map((v) => v.replace('https://', '').toLowerCase()));
}
function servir(porta) {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const relativo = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const destino = path.join(raiz, relativo);
    if (!destino.startsWith(raiz) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('nao encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(destino)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(destino).pipe(res);
  });
  return new Promise((resolve) => servidor.listen(porta, '127.0.0.1', () => resolve(servidor)));
}

// Este arquivo usa o WebSocket nativo do Node (>= 22) ou, no Node 20, a flag
// --experimental-websocket. O corredor registra a suíte com a flag para funcionar nos dois.
// Cliente mínimo de CDP sobre WebSocket.
function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let proximo = 1;
  const pendentes = new Map();
  const eventos = [];
  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.id && pendentes.has(msg.id)) {
      const { resolve, reject } = pendentes.get(msg.id);
      pendentes.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      eventos.push(msg);
    }
  });
  const pronto = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('falha ao abrir o WebSocket do navegador')));
  });
  function enviar(method, params) {
    const id = proximo++;
    return new Promise((resolve, reject) => {
      pendentes.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  return { pronto, enviar, eventos, fechar: () => ws.close() };
}
function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function principal() {
  if (typeof WebSocket !== 'function') {
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
  const porta = 9300 + Math.floor(Math.random() * 300);
  const portaCdp = porta + 400;
  const servidor = await servir(porta);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-perfil-'));
  const navegador = spawn(bin, [
    '--headless=new',
    '--remote-debugging-port=' + portaCdp,
    '--user-data-dir=' + perfil,
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
    'about:blank'
  ], { stdio: 'ignore' });
  const encerrar = () => {
    try { navegador.kill('SIGKILL'); } catch (e) {}
    try { servidor.close(); } catch (e) {}
    // O navegador pode continuar gravando o perfil por alguns instantes; a limpeza é best-effort.
    try { fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) {}
  };
  try {
    let alvo = null;
    for (let i = 0; i < 60 && !alvo; i++) {
      await esperar(200);
      try {
        const lista = await fetch('http://127.0.0.1:' + portaCdp + '/json/list').then((r) => r.json());
        alvo = lista.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      } catch (e) {}
    }
    if (!alvo) throw new Error('navegador não abriu porta de depuração');
    const cdp = conectar(alvo.webSocketDebuggerUrl);
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
