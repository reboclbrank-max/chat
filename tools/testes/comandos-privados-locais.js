// Contrato: comandos que leem/escrevem memória/persona local não viram Issue, comentário ou motor.
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
function entre(html, inicio, fim) {
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return html.slice(a, b);
}
function helperPrivado(html) {
  const fonte = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
  return { fonte, fn: new Function(fonte + '\nreturn ehComandoPrivadoLocal;')() };
}
const enviados = [];
const helpers = [];
for (const rota of rotas) {
  const html = fs.readFileSync(path.join(raiz, rota), 'utf8');
  testa(rota + ' reconhece somente os comandos privados locais previstos', () => {
    const { fonte, fn } = helperPrivado(html);
    for (const comando of ['!aprender fato', '!aprender', '!memoria', '!esquecer 1', '!persona poeta | fala curto', '!persona', '!personas', '!usar poeta', '!usar', '!backup', '!restaurar', '!chave modelo segredo', '!chave', '!capsula 10m recado', '!capsula', '!anotar comprar leite', '!anotar', '!anotacoes', '!apagarnota 1', '!apagarnota', '!tarefa pagar conta', '!tarefa', '!tarefas', '!feito 1', '!feito', '!apagartarefa 1', '!apagartarefa', '!lembrete 10m ligar', '!lembrar fato local', '!lembrar', '!criar !ferramenta descrição local', '!criar', '!fabrica']) {
      assert.equal(fn(comando), true, comando);
    }
    for (const comando of ['!enxame pergunta', '!olhar', '!varredura', '!aprenderx', '!chaveiro', '!tarefasx', '!lembrancax', '!criatura tema', '!fabricante', 'texto normal']) {
      assert.equal(fn(comando), false, comando);
    }
    helpers.push(fonte);
  });
  testa(rota + ' intercepta dados locais antes de rascunho, Issue ou comentário', () => {
    const envio = entre(html, 'async function enviar() {', '\n\n// Quando o workflow privado falha');
    const posRota = envio.indexOf('ehComandoPrivadoLocal(texto)');
    const posMaos = envio.indexOf('await maosDaCasa(texto)');
    const posRascunho = envio.indexOf('salvarRascunhoAtual(caixa.value)');
    const posIssue = envio.indexOf("api('/repos/' + REPO + '/issues'");
    const posComentario = envio.indexOf('api(`/repos/${REPO}/issues/${conversa}/comments`');
    assert(posRota >= 0 && posMaos > posRota && posRascunho > posMaos, 'ordem local antes do rascunho');
    if (posIssue >= 0) assert(posIssue > posRascunho, 'criação de Issue fica depois da rota local');
    assert(posComentario > posRascunho, 'comentário remoto fica depois da rota local');
    assert.match(envio, /if \(ehComandoPrivadoLocal\(texto\)\)/);
    assert.match(envio, /'🔒 comando privado local'/);
    enviados.push(envio.slice(posRota, posRascunho));
  });
  testa(rota + ' formas vazias de dados locais devolvem ajuda local', () => {
    for (const inicio of ["if (m === '!aprender' || m.startsWith('!aprender '))", "if (m === '!esquecer' || m.startsWith('!esquecer '))", "if (m === '!persona' || m.startsWith('!persona '))", "if (m === '!usar' || m.startsWith('!usar '))", "if (m === '!chave' || m.startsWith('!chave '))", "if (m === '!capsula' || m.startsWith('!capsula '))", "if (m === '!anotar' || m.startsWith('!anotar '))", "if (m === '!apagarnota' || m.startsWith('!apagarnota '))", "if (m === '!tarefa' || m.startsWith('!tarefa '))", "if (m === '!feito' || m.startsWith('!feito '))", "if (m === '!apagartarefa' || m.startsWith('!apagartarefa '))", "if (m === '!lembrete' || m.startsWith('!lembrete '))", "if (m === '!lembrar' || m.startsWith('!lembrar '))", "if (m === '!criar' || m.startsWith('!criar '))", "if (m === '!fabrica' || m.startsWith('!fabrica '))"]) {
      assert.notEqual(html.indexOf(inicio), -1, inicio);
    }
    assert.match(html, /uso: !usar <nome> ou !usar nenhuma/);
  });
}
testa('o contrato privado e a porta de envio mantêm paridade entre as quatro rotas', () => {
  for (const grupo of [helpers, enviados]) {
    assert.equal(new Set(grupo.map((x) => crypto.createHash('sha256').update(x).digest('hex'))).size, 1);
  }
});
console.log(`${certos}/${certos + falhas} testes de comandos privados locais passaram`);
process.exitCode = falhas ? 1 : 0;
