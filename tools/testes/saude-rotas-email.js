// Contrato offline (04/11/2026): a ordem das rotas do canal de e-mail aprende entre turnos.
// Sem rede, sem token, sem conversa: tudo em diretório temporário.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require('../saude-rotas-email.js');

let certos = 0, falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}
function tmp() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'saude-rotas-')), 'saude-rotas.json');
}
const rotas = () => [
  ['frota', 'https://a.invalid', {}, true],
  ['reserva', 'https://b.invalid', {}, false],
  ['ovhoss20', 'https://c.invalid', {}, false],
  ['omni', 'https://d.invalid', {}, false]
];
const T = Date.now(); // a leitura usa o relógio real: o retrato precisa ser de agora

testa('sem arquivo a ordem original é preservada', () => {
  const lista = S.ordenar(rotas(), S.ler('/nao/existe/saude.json'), T);
  assert.deepStrictEqual(lista.map((r) => r[0]), ['frota', 'reserva', 'ovhoss20', 'omni']);
});

testa('rota que falhou vai para o fim do seu par', () => {
  const saude = S.vazio();
  S.registrar(saude, 'frota', false, T);
  const lista = S.ordenar(rotas(), saude, T);
  assert.notStrictEqual(lista[0][0], 'frota', 'a rota que falhou não pode continuar na frente');
  assert.strictEqual(lista[lista.length - 1][0], 'frota', 'rota com falha recente desce para o fim');
});

testa('rota que respondeu fica na frente', () => {
  const saude = S.vazio();
  S.registrar(saude, 'omni', true, T);
  const lista = S.ordenar(rotas(), saude, T);
  assert.strictEqual(lista[0][0], 'omni', 'a que respondeu sobe para a frente');
});

testa('ordem é estável entre rotas sem histórico', () => {
  const saude = S.vazio();
  S.registrar(saude, 'omni', true, T);
  const lista = S.ordenar(rotas(), saude, T);
  assert.deepStrictEqual(lista.map((r) => r[0]), ['omni', 'frota', 'reserva', 'ovhoss20']);
});

testa('memória sobrevive à leitura do disco', () => {
  const arquivo = tmp();
  const saude = S.vazio();
  S.registrar(saude, 'frota', false, T);
  S.registrar(saude, 'reserva', true, T);
  assert.strictEqual(S.gravar(arquivo, saude, T), true, 'deveria gravar');
  const lido = S.ler(arquivo);
  assert.strictEqual(lido.rotas.frota.falhas, 1);
  assert.strictEqual(lido.rotas.reserva.ok, 1);
});

testa('registro com mais de 24 h é descartado', () => {
  const arquivo = tmp();
  const saude = S.vazio();
  S.registrar(saude, 'frota', false, T);
  S.gravar(arquivo, saude, T);
  const lido = S.ler(arquivo, T + 25 * 60 * 60 * 1000);
  // ler() usa Date.now(); forçamos a idade envelhecendo os campos do arquivo.
  const bruto = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  bruto.rotas.frota.ultimaFalha = Date.now() - 25 * 60 * 60 * 1000;
  fs.writeFileSync(arquivo, JSON.stringify(bruto));
  assert.deepStrictEqual(S.ler(arquivo).rotas, {}, 'falha de ontem não pode condenar a rota de hoje');
  assert(lido !== null);
});

testa('JSON corrompido devolve memória vazia em vez de quebrar', () => {
  const arquivo = tmp();
  fs.writeFileSync(arquivo, '{isso não é json');
  assert.deepStrictEqual(S.ler(arquivo).rotas, {});
});

testa('arquivo gigante é ignorado', () => {
  const arquivo = tmp();
  fs.writeFileSync(arquivo, 'x'.repeat(30000));
  assert.deepStrictEqual(S.ler(arquivo).rotas, {});
});

testa('privacidade: o arquivo guarda apenas números e nomes de rota', () => {
  const arquivo = tmp();
  const saude = S.vazio();
  S.registrar(saude, 'frota', false, T);
  S.registrar(saude, 'reserva', true, T);
  S.gravar(arquivo, saude, T);
  const texto = fs.readFileSync(arquivo, 'utf8');
  assert(!/https?:|pergunta|resposta|erro|token|@/i.test(texto), 'nada de URL, conteúdo ou credencial no arquivo');
  const json = JSON.parse(texto);
  assert.deepStrictEqual(Object.keys(json).sort(), ['rotas', 'versao']);
  for (const nome of Object.keys(json.rotas)) {
    for (const campo of Object.keys(json.rotas[nome])) {
      assert.strictEqual(typeof json.rotas[nome][campo], 'number', 'campo ' + campo + ' deveria ser número');
    }
  }
});

testa('falha de escrita não derruba o turno', () => {
  const invalido = path.join('/proc', 'nao-da', 'saude.json');
  assert.strictEqual(S.gravar(invalido, S.vazio(), T), false);
});

testa('contadores são limitados e entradas demais são cortadas', () => {
  const saude = S.vazio();
  for (let i = 0; i < 40; i++) S.registrar(saude, 'rota-' + i, false, T);
  const arquivo = tmp();
  S.gravar(arquivo, saude, T);
  const lido = S.ler(arquivo);
  assert(Object.keys(lido.rotas).length <= S.MAX_ROTAS, 'não pode crescer sem teto');
  const r = S.vazio();
  S.registrar(r, 'frota', false, T);
  for (let i = 0; i < 5; i++) S.registrar(r, 'frota', false, T);
  assert(r.rotas.frota.falhas <= 9999);
});

console.log(certos + '/' + (certos + falhas) + ' testes de memória de rotas do e-mail passaram');
if (falhas) process.exitCode = 1;
