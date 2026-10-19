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
let ignorados = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
async function okAsync(nome, fn) { try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
function pular(nome, motivo) { ignorados++; console.log('○ ' + nome + ' — não executado: ' + motivo); }
function tesseractDisponivel() {
  const r = spawnSync('tesseract', ['--version'], { encoding: 'utf8', timeout: 5000 });
  return !r.error && r.status === 0;
}
const TEM_TESSERACT = tesseractDisponivel();
const OCR_OBRIGATORIO = process.env.REBOCL_EXIGIR_MULTIMODAL === '1';
function exigirOuPular(nome, motivo) {
  if (OCR_OBRIGATORIO) {
    ok(nome, () => assert.fail(motivo + ' (a barreira marcou OCR como obrigatório)'));
    return false;
  }
  pular(nome, motivo);
  return false;
}
function jsonFinal(saida) {
  const i = String(saida || '').lastIndexOf('{');
  assert(i >= 0, 'OCR não devolveu JSON');
  return JSON.parse(String(saida).slice(i));
}

if (TEM_TESSERACT) ok('OCR local lê a data da foto sintética sem depender de rede', () => {
  const imagem = path.join(raiz, 'tools', 'teste-visao3.png');
  assert(fs.existsSync(imagem), 'fixture de foto ausente');
  const r = spawnSync('python3', ['tools/ocr-local.py', imagem], { cwd: raiz, encoding: 'utf8', timeout: 90000 });
  assert.equal(r.status, 0, 'ocr-local terminou com erro');
  const dado = jsonFinal(r.stdout);
  assert.equal(dado.ok, true, 'OCR local não encontrou texto');
  assert.match(String(dado.texto || ''), /14\/10\/2026/, 'OCR não leu a data da foto');
});
else exigirOuPular('OCR local lê a data da foto sintética sem depender de rede', 'tesseract não está instalado neste ambiente');
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
ok('a barreira exige OCR e PDF completos, embora o sandbox local possa declará-los como ausentes', () => {
  const runner = fs.readFileSync(path.join(raiz, 'tools', 'testes', 'roda-testes.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'testes-rapidos.yml'), 'utf8');
  assert.match(runner, /REBOCL_EXIGIR_MULTIMODAL === '1'/);
  assert.match(runner, /\['pdftotext'\]/);
  assert.match(workflow, /REBOCL_EXIGIR_MULTIMODAL: '1'/);
  assert.match(workflow, /tesseract-ocr-por/);
  assert.match(workflow, /poppler-utils/);
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
  if (TEM_TESSERACT) await okAsync('reserva usa o original quando JPEG higienizado perdeu a leitura da data', async () => {
    const bruto = fs.readFileSync(path.join(raiz, 'tools', 'teste-visao3.png')).toString('base64');
    const original = { tipo: 'image/png', b64: bruto, bytes: Buffer.byteLength(bruto, 'base64') };
    const preparada = await preparaFoto(original);
    const lida = await leTextoLocalComReserva(preparada, original);
    assert.match(String(lida && lida.texto || ''), /14\/10\/2026/, 'reserva não recuperou a data');
    assert(Number(lida && lida.confianca) >= 55, 'reserva não escolheu a leitura mais confiável');
  });
  else exigirOuPular('reserva usa o original quando JPEG higienizado perdeu a leitura da data', 'tesseract não está instalado neste ambiente');
  const resumo = `${certos}/${certos + falhas} testes de OCR local passaram`;
  console.log(ignorados ? `SKIP: ${resumo}; ${ignorados} verificação(ões) não executada(s) por pré-requisito local ausente` : resumo);
  process.exitCode = falhas ? 1 : 0;
})();
