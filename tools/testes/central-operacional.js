// 🧪 Contrato da Central segura: mapa fechado e única ponte manual de testes.
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
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}

const blocosCentral = [];
const helpersPrivados = [];
for (const rota of rotas) {
  const html = ler(rota);
  const central = entre(html, 'let testeChatEmCurso = false;', "  if (m.startsWith('!statuscasa'))");
  blocosCentral.push(central);
  testa(rota + ' limita a Central a comandos fechados e à barreira aprovada', () => {
    assert.match(central, /m === '!operacoes' \|\| m === '!operar' \|\| m === '!central'/);
    assert.match(central, /respostaComandoOperacionalLocal\('operar:'\)/);
    assert.match(central, /m === '!testarchat' \|\| m\.startsWith\('!testarchat '\)/);
    assert.match(central, /if \(m !== '!testarchat'\) return '⚠️ uso: !testarchat/);
    assert.match(central, /modoSomenteLocalAtivo\(\)/);
    assert.match(central, /if \(!token\) return/);
    assert.match(central, /testeChatEmCurso/);
    assert.match(central, /5 \* 60 \* 1000/);
    assert.match(central, /api\('\/repos\/reboclbrank-max\/chat\/actions\/workflows\/testes-rapidos\.yml\/dispatches'/);
    assert.match(central, /method: 'POST'/);
    assert.match(central, /JSON\.stringify\(\{ ref: 'main' \}\)/);
    assert.match(central, /pedido não confirma êxito/);
    assert.doesNotMatch(central, /eval\s*\(|new Function|child_process|\/bin\/|workflow\s*:\s*msg|ref\s*:\s*msg|\$\{[^}]*msg/i);
    assert.equal((central.match(/api\s*\(/g) || []).length, 1, 'a ponte faz uma única chamada de API fixa');
  });
  testa(rota + ' inclui a ponte na allowlist local sem capturar vizinhos', () => {
    const fonte = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const ehPrivado = new Function(fonte + '\nreturn ehComandoPrivadoLocal;')();
    for (const entrada of ['!operacoes', '!operar', '!central', '!testarchat', '!testarchat qualquer']) assert.equal(ehPrivado(entrada), true, entrada);
    for (const entrada of ['!operacao', '!testarchats', '!operador', '!centralizar']) assert.equal(ehPrivado(entrada), false, entrada);
    helpersPrivados.push(fonte);
  });
}
testa('a ponte da Central tem paridade byte-a-byte nas quatro rotas', () => {
  assert.equal(new Set(blocosCentral.map((fonte) => crypto.createHash('sha256').update(fonte).digest('hex'))).size, 1);
});
testa('a allowlist da Central tem paridade byte-a-byte nas quatro rotas', () => {
  assert.equal(new Set(helpersPrivados.map((fonte) => crypto.createHash('sha256').update(fonte).digest('hex'))).size, 1);
});

testa('e-mail e Telegram usam o mesmo roteiro fechado sem criar transporte novo', () => {
  const email = ler('tools/email-chat.js');
  assert.match(email, /require\('\.\.\/chat-comandos-locais'\)\.respostaComandoOperacionalLocal\(txt\)/);
  assert.match(email, /Central segura: capacidades atuais, testes e limites; não executa texto livre/);
  const ponte = entre(email, 'async function ferramenta(corpo, retornoNavegacao) {', "  if (/^!?ajuda$/i.test(txt)");
  assert.match(ponte, /operar/);
  assert.doesNotMatch(ponte, /fetch\s*\(|workflow_dispatch|api\.github|child_process/);
});

testa('contrato e política deixam próximos estágios e rollback explícitos', () => {
  const contrato = ler('OPERACAO-CENTRAL.md');
  const autonomia = ler('AUTONOMIA.md');
  const continuidade = ler('CONTINUIDADE.md');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  assert.match(contrato, /Central segura em etapas/);
  assert.match(contrato, /executor arbitrário/);
  assert.match(contrato, /branch ou artefato reversível/);
  assert.match(contrato, /Rollback/);
  assert.match(autonomia, /OPERACAO-CENTRAL\.md/);
  assert.match(continuidade, /Central segura em etapas/);
  assert.match(continuidade, /!testarchat/);
  assert.match(workflow, /'OPERACAO-CENTRAL\.md'/);
});

testa('a casca atualizada entrega o mapa local sob escolha explícita', () => {
  const sw = ler('sw.js');
  assert.match(sw, /rebocl-chat-v84/);
  assert.match(sw, /'\.\/chat-comandos-locais\.js'/);
});

console.log(`${certos}/${certos + falhas} testes da Central operacional passaram`);
process.exitCode = falhas ? 1 : 0;
