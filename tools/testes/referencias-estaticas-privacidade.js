// Contrato: referências estáticas da casa ficam na aba e não atravessam a conversa remota.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const comandos = [
  { entrada: '!semear nota pessoal', vazia: '!semear', vizinho: '!semearx', inicio: "if (m === '!semear' || m.startsWith('!semear '))", marca: 'Semeadura segura' },
  { entrada: '!canais nota pessoal', vazia: '!canais', vizinho: '!canaisx', inicio: "if (m === '!canais' || m.startsWith('!canais '))", marca: 'CHECKLIST DE CANAIS' },
  { entrada: '!press nota pessoal', vazia: '!press', vizinho: '!pressao', inicio: "if (m === '!press' || m.startsWith('!press '))", marca: 'FACTSHEET — REBOCL BRANK' },
  { entrada: '!sugere nota pessoal', vazia: '!sugere', vizinho: '!sugerex', inicio: "if (m === '!sugere' || m.startsWith('!sugere '))", marca: 'SUGESTÕES LOCAIS' },
  { entrada: '!museu nota pessoal', vazia: '!museu', vizinho: '!museux', inicio: "if (m === '!museu' || m.startsWith('!museu '))", marca: 'Museu dos Motores', fim: '\n    { const FAB' },
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
function ramo(html, comando) {
  const a = html.indexOf(comando.inicio);
  const fim = comando.fim || '\n  if (';
  const b = html.indexOf(fim, a + comando.inicio.length);
  assert(a >= 0 && b > a, 'ramo ausente: ' + comando.inicio);
  return html.slice(a, b);
}
const helpers = [];
const ramos = [];
const envios = [];
for (const rota of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  testa(rota + ' reconhece referências estáticas com fronteiras estritas', () => {
    const helper = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const fn = new Function(helper + '\nreturn ehComandoPrivadoLocal;')();
    for (const comando of comandos) {
      assert.equal(fn(comando.entrada), true, comando.entrada);
      assert.equal(fn(comando.vazia), true, comando.vazia);
      assert.equal(fn(comando.vizinho), false, comando.vizinho);
    }
    for (const foraDoEscopo of ['!monitorar', '!instalar', '!avatar casa', '!qr texto', '!matematica 1+1', '!conta 1+1', '!cor azul', '!falar texto', '!status', 'texto normal']) {
      assert.equal(fn(foraDoEscopo), false, foraDoEscopo);
    }
    helpers.push(helper);
  });
  testa(rota + ' mantém referências sem transporte ou escrita persistente', () => {
    const coletados = [];
    for (const comando of comandos) {
      const bloco = ramo(html, comando);
      assert.match(bloco, new RegExp(comando.marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.equal(/fetch\s*\(|api\s*\(|localStorage\.(?:setItem|removeItem|clear)|sessionStorage\.(?:setItem|removeItem|clear)|new Image\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|pensarStream\s*\(|publicar\s*\(|window\.open\s*\(|\.prompt\s*\(/.test(bloco), false, comando.entrada);
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
  testa(rota + ' passa referências pela porta antes de rascunho, Issue ou comentário', () => {
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
testa('contrato de referências estáticas mantém paridade nas quatro rotas', () => {
  for (const grupo of [helpers, ramos, envios]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de referências estáticas passaram`);
process.exitCode = falhas ? 1 : 0;
