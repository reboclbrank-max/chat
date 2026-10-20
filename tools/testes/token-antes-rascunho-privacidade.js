// Contrato: token digitado não passa por rascunho, conversa, Issue ou motor antes da proteção local.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
function envio(html) { return entre(html, 'async function enviar() {', '\n\n// Quando o workflow privado falha'); }
function novaConversa(html) { return entre(html, "async function novaConversa(sugestao = '') {", '\n\n/* ---------- conversa ---------- */'); }
function blocoToken(codigo) {
  return entre(codigo, 'if (pareceTokenDeAcesso(texto)) {', '\n  }\n  // Roteiro fechado');
}
function blocoRascunho(html) {
  return entre(html, 'function salvarRascunhoAtual(texto) {', '\nfunction limparRascunhoPorChave');
}
const envios = [];
const tokens = [];
const rascunhos = [];
const novas = [];
for (const rota of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  const codigo = envio(html);
  const nova = novaConversa(html);
  testa(rota + ' protege token antes de roteiro, rascunho, Issue ou motor', () => {
    const guarda = codigo.indexOf('if (pareceTokenDeAcesso(texto)) {');
    const roteiro = codigo.indexOf('const respostaOperacionalLocal');
    const porta = codigo.indexOf('if (ehComandoPrivadoLocal(texto))');
    const rascunho = codigo.indexOf('salvarRascunhoAtual(caixa.value)');
    const issue = codigo.indexOf("api('/repos/' + REPO + '/issues'");
    const motor = codigo.indexOf('pensarStream([{ role: \'user\', content: texto }]');
    assert(guarda >= 0 && roteiro > guarda && porta > guarda && rascunho > guarda, 'ordem fechada da guarda');
    if (issue >= 0) assert(issue > rascunho, 'Issue após rascunho normal');
    if (motor >= 0) assert(motor > rascunho, 'motor após rascunho normal');
    envios.push(codigo.slice(guarda, rascunho));
  });
  testa(rota + ' ramo de token só limpa localmente e não apaga rascunho diferente', () => {
    const bloco = blocoToken(codigo);
    assert.match(bloco, /limparRascunhoPorChave\(chaveRascunhoAtual\(\), texto\)/);
    assert.match(bloco, /Token não é mensagem/);
    assert.match(bloco, /caixa\.value = ''/);
    assert.match(bloco, /limparPreviaArquivoTexto\(\)/);
    assert.doesNotMatch(bloco, /salvarRascunhoAtual|\bapi\s*\(|fetch\s*\(|pensarStream\s*\(|registrarComentario|localStorage\./);
    tokens.push(bloco);
  });
  testa(rota + ' ramo de token atualiza contador e aviso após limpar o compositor', () => {
    const bloco = blocoToken(codigo);
    const limpar = bloco.indexOf("caixa.value = ''");
    const contador = bloco.indexOf('atualizarContador();');
    const aviso = bloco.indexOf('atualizarAvisoRascunho();');
    assert(limpar >= 0 && contador > limpar && aviso > contador, 'estado visual renovado após limpar');
  });
  testa(rota + ' nova conversa bloqueia token antes de rascunho ou Issue', () => {
    const limite = nova.indexOf('if (String(texto).trim().length > LIMITE_MENSAGEM_COMPOSITOR)');
    const guarda = nova.indexOf('if (pareceTokenDeAcesso(texto))');
    const rascunho = nova.indexOf('salvarRascunhoAtual(texto);');
    const issue = nova.indexOf('api(`/repos/${REPO}/issues`');
    assert(limite >= 0 && guarda > limite && rascunho > guarda && issue > rascunho, 'ordem fechada da nova conversa');
    const bloqueio = entre(nova, 'if (pareceTokenDeAcesso(texto)) {', '\n  salvarRascunhoAtual(texto);');
    assert.match(bloqueio, /Token não é mensagem nem rascunho/);
    assert.doesNotMatch(bloqueio, /salvarRascunhoAtual|\bapi\s*\(|fetch\s*\(|localStorage\./);
    novas.push(bloqueio);
  });
  testa(rota + ' camada de rascunhos conserva defesa direta contra token', () => {
    const bloco = blocoRascunho(html);
    assert.match(bloco, /if \(pareceTokenDeAcesso\(valor\)\)/);
    assert.match(bloco, /delete dados\.itens\[chave\]/);
    assert.match(bloco, /return 'proibido'/);
    rascunhos.push(bloco);
  });
}
testa('contrato de token e rascunho mantém paridade nas quatro rotas', () => {
  for (const grupo of [envios, tokens, novas, rascunhos]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de token antes de rascunho passaram`);
process.exitCode = falhas ? 1 : 0;
