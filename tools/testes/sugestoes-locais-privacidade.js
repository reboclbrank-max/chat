// Contrato offline: !sugere não lê memória privada nem chama rede.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(rota) { return fs.readFileSync(path.join(raiz, rota), 'utf8'); }
function blocoSugere(html) {
  const inicio = "if (m.startsWith('!sugere'))";
  const fim = "\n  if (m.startsWith('!lembrar ')";
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert(a >= 0 && b > a, 'bloco !sugere ausente');
  return html.slice(a, b);
}
const blocos = [];
for (const rota of rotas) {
  testa(rota + ' sugere localmente sem tocar memória ou rede', () => {
    const bloco = blocoSugere(fonte(rota));
    for (const proibido of [/fetch\s*\(/, /localStorage/, /rebocl_memoria/, /ARSENAL_JS/, /pollinations/i, /async\s*\(/]) {
      assert.doesNotMatch(bloco, proibido);
    }
    assert.match(bloco, /SUGESTÕES LOCAIS/);
    assert.match(bloco, /sem ler histórico privado nem chamar rede/);
    const chamadas = [];
    let rolagens = 0;
    const executar = new Function('m', 'bolha', 'rolarFim', bloco + '; return null;');
    const retorno = executar('!sugere', (...args) => chamadas.push(args), () => { rolagens++; });
    assert.equal(retorno, '🧭 sugestões locais na mesa — sem ler histórico nem chamar rede.');
    assert.equal(chamadas.length, 1);
    assert.match(chamadas[0][1], /!boletim/);
    assert.equal(rolagens, 1);
    blocos.push(bloco);
  });
}
testa('o contrato de sugestões locais mantém paridade entre as quatro rotas', () => {
  assert.equal(new Set(blocos.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
});
console.log(`${certos}/${certos + falhas} testes de sugestões locais passaram`);
process.exitCode = falhas ? 1 : 0;
