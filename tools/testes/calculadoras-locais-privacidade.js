// Contrato: calculadoras determinísticas do navegador não atravessam conversa remota.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const comandos = [
  { entrada: '!romano 2026', vazia: '!romano', vizinho: '!romanox 2026', inicio: "if (m === '!romano' || m.startsWith('!romano '))", marca: 'const vals' },
  { entrada: '!regra3 2 5 10', vazia: '!regra3', vizinho: '!regra30 2 5 10', inicio: "if (m === '!regra3' || m.startsWith('!regra3 '))", marca: 'const xx' },
  { entrada: '!tabuada 7', vazia: '!tabuada', vizinho: '!tabuadax 7', inicio: "if (m === '!tabuada' || m.startsWith('!tabuada '))", marca: 'Array.from' },
  { entrada: '!dividir 150 3', vazia: '!dividir', vizinho: '!dividirx 150 3', inicio: "if (m === '!dividir' || m.startsWith('!dividir '))", marca: 'const cada' },
  { entrada: '!gorjeta 85 10', vazia: '!gorjeta', vizinho: '!gorjetax 85 10', inicio: "if (m === '!gorjeta' || m.startsWith('!gorjeta '))", marca: 'const gg' },
  { entrada: '!juroscompostos 1000 1 12', vazia: '!juroscompostos', vizinho: '!juroscompostosx 1000 1 12', inicio: "if (m === '!juroscompostos' || m.startsWith('!juroscompostos '))", marca: 'Math.pow' },
  { entrada: '!converter 10 km mi', vazia: '!converter', vizinho: '!converterx 10 km mi', inicio: "if (m === '!converter' || m.startsWith('!converter '))", marca: 'const comp' },
  { entrada: '!molar H2O', vazia: '!molar', vizinho: '!molarx H2O', inicio: "if (m === '!molar' || m.startsWith('!molar '))", marca: 'const TAB' },
  { entrada: '!dias 25/12', vazia: '!dias', vizinho: '!diasx 25/12', inicio: "if (m === '!dias' || m.startsWith('!dias '))", marca: 'let alvo' },
  { entrada: '!diasemana 25/12/2026', vazia: '!diasemana', vizinho: '!diasemanax 25/12/2026', inicio: "if (m === '!diasemana' || m.startsWith('!diasemana '))", marca: 'const nomes' },
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
  testa(rota + ' reconhece calculadoras locais previstas com fronteiras estritas', () => {
    const helper = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const fn = new Function(helper + '\nreturn ehComandoPrivadoLocal;')();
    for (const comando of comandos) {
      assert.equal(fn(comando.entrada), true, comando.entrada);
      assert.equal(fn(comando.vazia), true, comando.vazia);
      assert.equal(fn(comando.vizinho), false, comando.vizinho);
    }
    // Não reclassifica outros utilitários ou consultas externas só porque também há código local.
    for (const foraDoEscopo of ['!uuid', '!foco', '!qr texto', '!matematica 1+1', '!conta 1+1', '!cor azul', '!falar texto', 'texto normal']) {
      assert.equal(fn(foraDoEscopo), false, foraDoEscopo);
    }
    helpers.push(helper);
  });
  testa(rota + ' mantém calculadoras sem transporte, persistência ou captura anterior', () => {
    const coletados = [];
    for (const comando of comandos) {
      const bloco = ramo(html, comando.inicio);
      assert.match(bloco, new RegExp(comando.marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.equal(/fetch\s*\(|api\s*\(|localStorage|new Image\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(bloco), false, comando.entrada);
      const alvo = html.indexOf(comando.inicio);
      const inicioDaCasa = html.indexOf('async function maosDaCasa(msg) {');
      const antes = html.slice(inicioDaCasa, alvo);
      const prefixos = [...antes.matchAll(/m\.startsWith\('([^']+)'\)/g)].map((m) => m[1]);
      const exatos = [...antes.matchAll(/m === '([^']+)'/g)].map((m) => m[1]);
      for (const amostra of [comando.entrada.toLowerCase(), comando.vazia.toLowerCase()]) {
        assert.equal(prefixos.some((prefixo) => amostra.startsWith(prefixo)), false, 'captura anterior de ' + amostra);
        assert.equal(exatos.includes(amostra), false, 'forma exata anterior de ' + amostra);
      }
      coletados.push(bloco);
    }
    ramos.push(coletados.join('\n'));
  });
  testa(rota + ' passa calculadoras pela porta antes de rascunho, Issue ou comentário', () => {
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
testa('contrato de calculadoras locais mantém paridade nas quatro rotas', () => {
  for (const grupo of [helpers, ramos, envios]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de calculadoras locais passaram`);
process.exitCode = falhas ? 1 : 0;
