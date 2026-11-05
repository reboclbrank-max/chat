#!/usr/bin/env node
// Contrato de recuperação do lançador de navegador — 05/11/2026.
//
// Por que este arquivo existe: o degrau 4 estava travado por uma falha intermitente real,
// registrada no log da CI (`navegador não abriu porta de depuração — dbus/bus.cc`). A causa
// não era o Chromium ser instável por natureza: era o lançador REUSAR o mesmo diretório de
// perfil entre tentativas. Depois de matar a tentativa 1 com SIGKILL, o perfil fica com
// SingletonLock apontando para um processo morto; a tentativa 2, no mesmo diretório, é lida
// pelo Chromium como "já existe instância aqui" e morre sem abrir a porta.
//
// Não precisamos de Chromium instalado para provar isso: aqui o "navegador" é um programa
// falso que imita exatamente esse comportamento (trava presente = sai sem abrir porta).
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const { abrirNavegador, perfilDaTentativa, limparTravas } = require('./cdp.js');

const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

// Programa falso: imita o Chromium no ponto que interessa.
const FALSO = path.join(os.tmpdir(), 'navegador-falso-' + process.pid + '.js');
// O lançador chama o binário com as flags do Chromium na frente. Um script de shell
// repassa os argumentos para o Node sem tentar interpretá-los como flags dele.
const FALSO_BIN = path.join(os.tmpdir(), 'navegador-falso-' + process.pid + '.sh');
fs.writeFileSync(FALSO_BIN, '#!/usr/bin/env bash\nexec "' + process.execPath + '" "' + FALSO + '" "$@"\n');
fs.chmodSync(FALSO_BIN, 0o755);
fs.writeFileSync(FALSO, `
const fs = require('fs');
const http = require('http');
const argumentos = process.argv.slice(2);
const perfil = (argumentos.find(a => a.startsWith('--user-data-dir=')) || '').split('=')[1];
const porta = Number((argumentos.find(a => a.startsWith('--remote-debugging-port=')) || '').split('=')[1]);
// Trava de instância única: é o que o Chromium de verdade também deixa no perfil.
// Modo "falha a primeira tentativa": simula o navegador que morre na primeira vez
// por qualquer motivo (dbus, shm, disputa) e funciona na segunda.
const marcador = process.env.CDP_FALHA_UMA_VEZ;
if (marcador && !fs.existsSync(marcador)) { fs.writeFileSync(marcador, '1'); process.exit(0); }
if (perfil && fs.existsSync(perfil + '/SingletonLock')) process.exit(0);
if (perfil) { try { fs.writeFileSync(perfil + '/SingletonLock', 'travado'); } catch (e) {} }
const servidor = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify([{ type: 'page', webSocketDebuggerUrl: 'ws://127.0.0.1:' + porta + '/devtools/page/1' }]));
});
servidor.listen(porta, '127.0.0.1');
setTimeout(() => process.exit(0), 8000);
`);

const perfisCriados = [];
function perfilNovo() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-teste-'));
  perfisCriados.push(p);
  fs.mkdirSync(p + '-nav', { recursive: true });
  fs.writeFileSync(p + '-nav/SingletonLock', 'trava de um processo que já morreu');
  return p;
}

ok('perfilDeTentativa nunca reusa o mesmo diretório entre tentativas', () => {
  const p = '/tmp/exemplo';
  assert.equal(perfilDaTentativa(p, 1), p + '-nav');
  assert.notEqual(perfilDaTentativa(p, 1), perfilDaTentativa(p, 2));
  assert.notEqual(perfilDaTentativa(p, 2), perfilDaTentativa(p, 3));
});

ok('limparTravas remove SingletonLock/Socket/Cookie do perfil', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-travas-'));
  for (const nome of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) fs.writeFileSync(path.join(dir, nome), 'x');
  limparTravas(dir);
  assert.deepEqual(fs.readdirSync(dir), []);
});

ok('perfil com trava velha é limpo antes de lançar: abre já na primeira tentativa', async () => {
  const perfil = perfilNovo();
  const r = await abrirNavegador({ bin: FALSO_BIN, portaCdp: 9411, perfil, tentativas: 3, esperasPorTentativa: 8 });
  assert.ok(r.alvo && r.alvo.webSocketDebuggerUrl, 'deveria devolver um alvo conectável');
  assert.equal(r.tentativa, 1, 'a trava do perfil não deveria custar uma tentativa inteira');
  try { r.navegador.kill('SIGKILL'); } catch (e) {}
});

ok('navegador que morre na primeira vez é recuperado em perfil NOVO na segunda', async () => {
  const perfil = perfilNovo();
  const marcador = path.join(os.tmpdir(), 'cdp-falha-uma-vez-' + process.pid);
  try { fs.unlinkSync(marcador); } catch (e) {}
  process.env.CDP_FALHA_UMA_VEZ = marcador;
  try {
    const r = await abrirNavegador({ bin: FALSO_BIN, portaCdp: 9481, perfil, tentativas: 3, esperasPorTentativa: 8 });
    assert.equal(r.tentativa, 2, 'a segunda tentativa devia rodar em perfil novo e abrir');
    assert.ok(fs.existsSync(perfil + '-nav-2'), 'a segunda tentativa tem de usar diretório próprio');
    try { r.navegador.kill('SIGKILL'); } catch (e) {}
  } finally {
    delete process.env.CDP_FALHA_UMA_VEZ;
    try { fs.unlinkSync(marcador); } catch (e) {}
  }
});

ok('o comportamento ANTIGO (mesmo perfil em toda tentativa) realmente falha — o defeito era real', async () => {
  const { spawn } = require('child_process');
  const perfil = perfilNovo();
  const porta = 9437;
  let abriu = false;
  for (let tentativa = 1; tentativa <= 2 && !abriu; tentativa++) {
    // Reproduz o comportamento antigo: o MESMO diretório (o do primeiro perfil) em toda tentativa.
    const nav = spawn(process.execPath, [FALSO, '--user-data-dir=' + perfil + '-nav', '--remote-debugging-port=' + porta]);
    for (let i = 0; i < 6 && !abriu; i++) {
      await new Promise(r => setTimeout(r, 100));
      try {
        const lista = await fetch('http://127.0.0.1:' + porta + '/json/list').then(r => r.json());
        abriu = Array.isArray(lista) && lista.length > 0;
      } catch (e) {}
      if (nav.exitCode !== null) break;
    }
    try { nav.kill('SIGKILL'); } catch (e) {}
  }
  assert.equal(abriu, false, 'com o perfil travado reusado, a porta não deve abrir — é esse o defeito');
});

(async () => {
  let certos = 0, falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  for (const p of perfisCriados) { try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) {} }
  try { fs.unlinkSync(FALSO); } catch (e) {}
  try { fs.unlinkSync(FALSO_BIN); } catch (e) {}
  console.log(`${certos}/${certos + falhas} contratos do lançador de navegador passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
