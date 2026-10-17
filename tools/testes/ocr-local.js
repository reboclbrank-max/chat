// Regressão do OCR local: texto pequeno da foto de prova precisa sobreviver à rota de visão degradada.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const raiz = path.resolve(__dirname, '../..');
const { preparaFoto, leTextoLocalComReserva } = require('../email-chat');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
async function okAsync(nome, fn) { try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
function jsonFinal(saida) {
  const i = String(saida || '').lastIndexOf('{');
  assert(i >= 0, 'OCR não devolveu JSON');
  return JSON.parse(String(saida).slice(i));
}

ok('OCR local lê a data da foto sintética sem depender de rede', () => {
  const imagem = path.join(raiz, 'tools', 'teste-visao3.png');
  assert(fs.existsSync(imagem), 'fixture de foto ausente');
  const r = spawnSync('python3', ['tools/ocr-local.py', imagem], { cwd: raiz, encoding: 'utf8', timeout: 90000 });
  assert.equal(r.status, 0, 'ocr-local terminou com erro');
  const dado = jsonFinal(r.stdout);
  assert.equal(dado.ok, true, 'OCR local não encontrou texto');
  assert.match(String(dado.texto || ''), /14\/10\/2026/, 'OCR não leu a data da foto');
});
ok('reserva do OCR original é local e só entra se a cópia preparada perdeu confiança', () => {
  const fonte = fs.readFileSync(path.join(raiz, 'tools', 'email-chat.js'), 'utf8');
  const ocr = fs.readFileSync(path.join(raiz, 'tools', 'ocr-local.py'), 'utf8');
  assert.match(fonte, /async function leTextoLocalComReserva/);
  assert.match(fonte, /imagemOriginal\.b64 !== imagemPreparada\.b64/);
  assert.match(fonte, /conf < 55/);
  assert.match(fonte, /leTextoLocalComReserva\(imagemVisao, imagem \|\| imagemDoPdf\)/);
  assert.match(fonte, /REBOCL_OCR_ORCAMENTO_SEG/);
  assert.match(fonte, /tetoMs = 70000/);
  assert.match(ocr, /ORCAMENTO_SEG/);
  assert.match(ocr, /CONFIANCA_RAPIDA/);
});
ok('um motor OCR preso respeita o teto e não congela a fila', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-limite-'));
  try {
    const falso = path.join(pasta, 'tesseract');
    fs.writeFileSync(falso, '#!/bin/sh\nexec sleep 30\n');
    fs.chmodSync(falso, 0o700);
    const inicio = Date.now();
    const r = spawnSync('python3', ['tools/ocr-local.py', 'tools/teste-visao3.png'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 12000,
      env: Object.assign({}, process.env, {
        PATH: pasta + path.delimiter + process.env.PATH,
        REBOCL_OCR_ORCAMENTO_SEG: '5',
        REBOCL_OCR_TENTATIVA_SEG: '1'
      })
    });
    const ms = Date.now() - inicio;
    assert.equal(r.status, 0, 'OCR limitado deve devolver JSON, não travar');
    const dado = jsonFinal(r.stdout);
    assert.equal(dado.ok, false, 'motor preso não pode ser aceito como leitura');
    assert(ms < 9000, 'OCR excedeu o teto local: ' + ms + ' ms');
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});

(async () => {
  await okAsync('reserva usa o original quando JPEG higienizado perdeu a leitura da data', async () => {
    const bruto = fs.readFileSync(path.join(raiz, 'tools', 'teste-visao3.png')).toString('base64');
    const original = { tipo: 'image/png', b64: bruto, bytes: Buffer.byteLength(bruto, 'base64') };
    const preparada = await preparaFoto(original);
    const lida = await leTextoLocalComReserva(preparada, original);
    assert.match(String(lida && lida.texto || ''), /14\/10\/2026/, 'reserva não recuperou a data');
    assert(Number(lida && lida.confianca) >= 55, 'reserva não escolheu a leitura mais confiável');
  });
  console.log(`${certos}/${certos + falhas} testes de OCR local passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
