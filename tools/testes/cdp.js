// Peças compartilhadas dos contratos que abrem um navegador de verdade — 2026-10-24.
//
// `navegador-csp.js` e `tools/cobertura-navegador.js` precisam das mesmas três coisas:
// achar o Chromium instalado, servir a casca estática por HTTP efêmero e falar CDP.
// Estavam copiadas em dois arquivos; ficam aqui uma vez só, para a próxima suíte de
// navegador não começar copiando as outras duas.
//
// Nada aqui toca a rede externa: o servidor só escuta 127.0.0.1 e o navegador roda
// com perfil temporário que é apagado ao fim.
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '../..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

// Ordem de preferência: variável de ambiente, binário do chrome-headless-shell, navegadores do sistema.
function chromium() {
  const candidatos = [
    process.env.CHROMIUM_BIN,
    'chrome-headless-shell',
    'chromium-headless-shell',
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable'
  ];
  for (const c of candidatos) {
    if (!c) continue;
    if (c.includes('/') && fs.existsSync(c)) return c;
    const achado = (process.env.PATH || '')
      .split(path.delimiter)
      .map((d) => path.join(d, c))
      .find((p) => {
        try { return fs.existsSync(p); } catch (e) { return false; }
      });
    if (achado) return achado;
  }
  return null;
}

// O Node 22 (usado pela CI) expõe WebSocket nativo; o Node 20 exige --experimental-websocket.
function webSocketDisponivel() {
  return typeof WebSocket === 'function';
}

function servir(porta, raiz = RAIZ) {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const relativo = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const destino = path.join(raiz, relativo);
    if (!destino.startsWith(raiz) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('nao encontrado');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(destino).pipe(res);
  });
  return new Promise((resolve) => servidor.listen(porta, '127.0.0.1', () => resolve(servidor)));
}

// Cliente mínimo de CDP sobre WebSocket: envia comando, espera resposta e guarda eventos.
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

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Sobe o navegador headless com perfil descartável e devolve o alvo já conectado.
async function abrirNavegador({ bin, portaCdp, perfil }) {
  const navegador = spawn(bin, [
    '--headless=new',
    '--remote-debugging-port=' + portaCdp,
    '--user-data-dir=' + perfil,
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
    '--disable-background-networking',
    'about:blank'
  ], { stdio: 'ignore' });
  let alvo = null;
  for (let i = 0; i < 80 && !alvo; i++) {
    await esperar(200);
    try {
      const lista = await fetch('http://127.0.0.1:' + portaCdp + '/json/list').then((r) => r.json());
      alvo = lista.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) {}
  }
  if (!alvo) {
    try { navegador.kill('SIGKILL'); } catch (e) {}
    throw new Error('navegador não abriu porta de depuração');
  }
  return { navegador, alvo };
}

function perfilTemporario(prefixo) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefixo));
}

function matarEClarear(navegador, perfil, servidor) {
  try { navegador.kill('SIGKILL'); } catch (e) {}
  if (servidor) { try { servidor.close(); } catch (e) {} }
  // O navegador pode continuar gravando o perfil por alguns instantes; a limpeza é best-effort.
  try { fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) {}
}

function porta(n) {
  return 9300 + Math.floor(Math.random() * 300) + (n || 0);
}

module.exports = {
  RAIZ,
  TIPOS,
  chromium,
  webSocketDisponivel,
  servir,
  conectar,
  esperar,
  abrirNavegador,
  perfilTemporario,
  matarEClarear,
  porta
};
