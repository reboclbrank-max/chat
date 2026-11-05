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

// Flags comuns. `--disable-dev-shm-usage` existe porque em contêiner (é o caso do runner da CI)
// o /dev/shm pequeno trava o Chrome antes de ele abrir a porta de depuração.
const FLAGS_BASE = [
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--disable-background-networking',
  '--no-default-browser-check'
];

// Perfil por tentativa. Isto parece detalhe e é a causa de uma falha intermitente real:
// quando a tentativa 1 é morta com SIGKILL, o perfil dela fica com SingletonLock apontando
// para um processo que já não existe. Reusar o MESMO diretório na tentativa 2 faz o Chromium
// concluir "já existe instância aqui", sair sem abrir a porta de depuração — e a suíte reprova
// sem defeito nenhum no chat. Cada tentativa ganha diretório próprio e sem trava.
function perfilDaTentativa(perfil, tentativa) {
  return tentativa === 1 ? perfil + '-nav' : perfil + '-nav-' + tentativa;
}

// Travas que o Chromium deixa no perfil e que atrapalham a próxima tentativa.
const TRAVAS_DO_PERFIL = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile'];

function limparTravas(perfil) {
  for (const trava of TRAVAS_DO_PERFIL) {
    try { fs.rmSync(path.join(perfil, trava), { force: true, recursive: true }); } catch (e) {}
  }
}

// Uma porta pode estar ocupada por um Chromium zumbi de um teste anterior: escolher outra
// é mais barato do que esperar 20 s por uma porta que nunca vai abrir.
async function portaLivreDeFato(portaCandidata) {
  const net = require('net');
  for (let n = 0; n < 12; n++) {
    const p = portaCandidata + n * 13;
    const livre = await new Promise((resolve) => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.once('listening', () => s.close(() => resolve(true)));
      s.listen(p, '127.0.0.1');
    });
    if (livre) return p;
  }
  return portaCandidata;
}

// Sobe o navegador headless com perfil descartável e devolve o alvo já conectado.
// O stderr vai para arquivo: quando o navegador não abre, a mensagem diz por quê em vez de
// só informar que a porta não apareceu (foi assim que a CI de 24/10 falhou às escuras).
// 05/11: cada tentativa usa perfil NOVO, limpa travas, confere a porta e espera mais —
// porque a instabilidade que travava o degrau 4 era exatamente a corrida de reuso de perfil.
async function abrirNavegador({ bin, portaCdp, perfil, tentativas = 3, esperasPorTentativa = 150 }) {
  const erroLog = path.join(os.tmpdir(), 'navegador-stderr-' + process.pid + '.log');
  let ultimoErro = '';
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const perfilDaVez = perfilDaTentativa(perfil, tentativa);
    try { fs.mkdirSync(perfilDaVez, { recursive: true }); } catch (e) {}
    limparTravas(perfilDaVez);
    const portaDaVez = await portaLivreDeFato(portaCdp);
    const fd = fs.openSync(erroLog, 'w');
    const navegador = spawn(bin, FLAGS_BASE.concat([
      '--remote-debugging-port=' + portaDaVez,
      '--user-data-dir=' + perfilDaVez,
      'about:blank'
    ]), { stdio: ['ignore', fd, fd] });
    fs.closeSync(fd);
    let alvo = null;
    for (let i = 0; i < esperasPorTentativa && !alvo; i++) {
      await esperar(i < 10 ? 200 : 300);
      try {
        const lista = await fetch('http://127.0.0.1:' + portaDaVez + '/json/list').then((r) => r.json());
        alvo = lista.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      } catch (e) {}
      if (navegador.exitCode !== null && navegador.exitCode !== 0) break;
    }
    if (alvo) return { navegador, alvo, erroLog, tentativa, porta: portaDaVez };
    try { navegador.kill('SIGKILL'); } catch (e) {}
    ultimoErro = lerFinal(erroLog);
  }
  throw new Error('navegador não abriu porta de depuração em ' + tentativas + ' tentativa(s)'
    + (ultimoErro ? ' — ' + ultimoErro : ''));
}

function lerFinal(arquivo, limite = 3) {
  try {
    const linhas = fs.readFileSync(arquivo, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    return linhas.slice(-limite).join(' | ').slice(0, 400);
  } catch (e) {
    return '';
  }
}

function perfilTemporario(prefixo) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefixo));
}

function apagarCaminho(caminho) {
  try { fs.rmSync(caminho, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) {}
}

function matarEClarear(navegador, perfil, servidor) {
  try { navegador.kill('SIGKILL'); } catch (e) {}
  if (servidor) { try { servidor.close(); } catch (e) {} }
  // O navegador pode continuar gravando o perfil por alguns instantes; a limpeza é best-effort.
  apagarCaminho(perfil);
  // Todas as tentativas usam perfis próprios (perfil-nav, perfil-nav-2, ...): limpa todos.
  try {
    for (const entrada of fs.readdirSync(path.dirname(perfil))) {
      const completo = path.join(path.dirname(perfil), entrada);
      if (completo.startsWith(perfil + '-nav')) apagarCaminho(completo);
    }
  } catch (e) {}
  try { fs.unlinkSync(path.join(os.tmpdir(), 'navegador-stderr-' + process.pid + '.log')); } catch (e) {}
}

function porta(n) {
  return 9300 + Math.floor(Math.random() * 300) + (n || 0);
}

module.exports = {
  FLAGS_BASE,
  lerFinal,
  RAIZ,
  TIPOS,
  chromium,
  webSocketDisponivel,
  servir,
  conectar,
  esperar,
  abrirNavegador,
  perfilDaTentativa,
  limparTravas,
  portaLivreDeFato,
  perfilTemporario,
  matarEClarear,
  porta,
  apagarCaminho
};
