// Contrato: transformações sensíveis que já funcionam no navegador não viram conversa remota.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const comandos = [
  { entrada: '!senha 20', vazia: '!senha', vizinho: '!senhax', inicio: "if (m === '!senha' || m.startsWith('!senha '))", marca: 'crypto.getRandomValues' },
  { entrada: '!hash segredo', vazia: '!hash', vizinho: '!hashes', inicio: "if (m === '!hash' || m.startsWith('!hash '))", marca: 'crypto.subtle.digest' },
  { entrada: '!base64 texto particular', vazia: '!base64', vizinho: '!base64url', inicio: "if (m === '!base64' || m.startsWith('!base64 '))", marca: 'btoa' },
  { entrada: '!morse texto particular', vazia: '!morse', vizinho: '!morsear', inicio: "if (m === '!morse' || m.startsWith('!morse '))", marca: 'MORSE' },
  { entrada: '!contar texto particular', vazia: '!contar', vizinho: '!contarx', inicio: "if (m === '!contar' || m.startsWith('!contar '))", marca: 'pal' },
  { entrada: '!imc 70 1.75', vazia: '!imc', vizinho: '!imcx', inicio: "if (m === '!imc' || m.startsWith('!imc '))", marca: 'const imc' },
  { entrada: '!agua 70', vazia: '!agua', vizinho: '!aguardar', inicio: "if (m === '!agua' || m.startsWith('!agua '))", marca: 'const ml' },
];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function entre(html, inicio, fim) {
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return html.slice(a, b);
}
function ramo(html, inicio) {
  const a = html.indexOf(inicio);
  const b = html.indexOf('\n  if (', a + inicio.length);
  assert(a >= 0 && b > a, 'ramo ausente: ' + inicio);
  return html.slice(a, b);
}
const helpers = [];
const ramos = [];
const envios = [];
for (const rota of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  testa(rota + ' reconhece transformações locais previstas com fronteiras estritas', () => {
    const helper = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const fn = new Function(helper + '\nreturn ehComandoPrivadoLocal;')();
    for (const comando of comandos) {
      assert.equal(fn(comando.entrada), true, comando.entrada);
      assert.equal(fn(comando.vazia), true, comando.vazia);
      assert.equal(fn(comando.vizinho), false, comando.vizinho);
    }
    // A porta não vira captura ampla: comandos locais sem esse risco e comandos
    // que usam fonte externa seguem fora desta família deliberadamente estreita.
    for (const foraDoEscopo of ['!uuid', '!qr texto', '!matematica 1+1', '!conta 1+1', '!cor azul', '!falar texto', 'texto normal']) {
      assert.equal(fn(foraDoEscopo), false, foraDoEscopo);
    }
    helpers.push(helper);
  });
  testa(rota + ' mantém os ramos de transformação sem transporte ou persistência', () => {
    const coletados = [];
    for (const comando of comandos) {
      const bloco = ramo(html, comando.inicio);
      assert.match(bloco, new RegExp(comando.marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.equal(/fetch\s*\(|api\s*\(|localStorage|new Image\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(bloco), false, comando.entrada);
      // Nenhum teste de prefixo anterior pode capturar o comando antes do ramo local.
      const alvo = html.indexOf(comando.inicio);
      const inicioDaCasa = html.indexOf('async function maosDaCasa(msg) {');
      const antes = html.slice(inicioDaCasa, alvo);
      const nome = comando.entrada.slice(1).split(/\s+/)[0];
      const prefixos = [...antes.matchAll(/m\.startsWith\('!([^']+)'\)/g)].map((m) => m[1].trim());
      const exatos = [...antes.matchAll(/m === '!([^']+)'/g)].map((m) => m[1].trim());
      assert.equal(prefixos.some((prefixo) => nome.startsWith(prefixo) || prefixo.startsWith(nome)), false, 'captura anterior de ' + comando.entrada);
      assert.equal(exatos.includes(nome), false, 'forma exata anterior de ' + comando.entrada);
      coletados.push(bloco);
    }
    ramos.push(coletados.join('\n'));
  });
  testa(rota + ' passa dados locais pela porta antes de rascunho, Issue ou comentário', () => {
    const envio = entre(html, 'async function enviar() {', '\n\n// Quando o workflow privado falha');
    const porta = envio.indexOf('ehComandoPrivadoLocal(texto)');
    const maos = envio.indexOf('await maosDaCasa(texto)');
    const rascunho = envio.indexOf('salvarRascunhoAtual(caixa.value)');
    const issue = envio.indexOf("api('/repos/' + REPO + '/issues'");
    const comentario = envio.indexOf('api(`/repos/${REPO}/issues/${conversa}/comments`');
    assert(porta >= 0 && maos > porta && rascunho > maos, 'ordem da porta local');
    if (issue >= 0) assert(issue > rascunho, 'Issue depois da porta');
    assert(comentario > rascunho, 'comentário depois da porta');
    envios.push(envio.slice(porta, rascunho));
  });
}
testa('contrato de transformações locais mantém paridade nas quatro rotas', () => {
  for (const grupo of [helpers, ramos, envios]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de transformações locais privadas passaram`);
process.exitCode = falhas ? 1 : 0;
